import { query, s, c, ref, inp, auth, input, expr, and, or, col } from "@xanots/sdk";
import { kyc } from "./kyc.js";
import { users } from "../tables/users.js";
import { applicants } from "../tables/applicants.js";
import { ruleStages } from "../tables/rule-stages.js";
import { decisions } from "../tables/decisions.js";

/**
 * The one governed job: run an applicant through the ordered, versioned KYC
 * waterfall and record the decision.
 *
 * It loads the active stages in `stage_order`, evaluates each against the
 * applicant's facts, and STOPS at the first stage that fires. A stage fires when
 * its operator/threshold holds for its check_type. The decision records the
 * outcome, the exact firing stage + reason code, and the rule-set version (the
 * highest active version), so every run is auditable and every channel decides
 * the same way. If no stage fires the outcome is `approve` with no firing stage.
 */
export const applicantsRunQuery = query({
  name: "applicants/{id}/run",
  verb: "POST",
  apiGroup: kyc,
  auth: users,
  input: { id: input.int({ required: true }) },
  stack: [
    // Role guard: analyst or admin.
    s.db.get_by_id({ table: users, id: auth("id"), as: "me" }),
    s.precondition({ expr: expr(ref("me", { safe: true }), "!=", c.null()), error_type: "unauthorized", error: c.text("Session user not found.") }),
    s.precondition({ expr: or(expr(ref("me.role"), "=", c.text("analyst")), expr(ref("me.role"), "=", c.text("admin"))), error_type: "accessdenied", error: c.text("Only an analyst or admin can run the waterfall.") }),

    // Load the applicant (guard existence before drilling its facts).
    s.db.get_by_id({ table: applicants, id: inp("id"), as: "applicant" }),
    s.precondition({ expr: expr(ref("applicant", { safe: true }), "!=", c.null()), error_type: "notfound", error: c.text("Applicant not found.") }),

    // The ordered active rule set.
    s.db.query({ table: ruleStages, where: expr(col("active"), "=", c.bool(true)), sort: [{ sortBy: "stage_order", dir: "asc" }], as: "stages" }),
    // Current rule-set version = the highest active version.
    s.db.query({ table: ruleStages, where: expr(col("active"), "=", c.bool(true)), sort: [{ sortBy: "ruleset_version", dir: "desc" }], returnType: "single", as: "vrow" }),
    s.precondition({ expr: expr(ref("vrow", { safe: true }), "!=", c.null()), error_type: "standard", error: c.text("No active rule stages configured.") }),
    s.set_var("current_version", ref("vrow.ruleset_version")),

    // Decision accumulator — defaults to approve / no firing stage.
    s.set_var("outcome", c.text("approve")),
    s.set_var("firing_id", c.int(0)),
    s.set_var("firing_key", c.text("")),
    s.set_var("reason", c.text("")),

    // The waterfall. The firing predicate reads the applicant field named by the
    // stage's check_type and applies the stage's operator to its threshold; a
    // watchlist stage is a plain is_true test. The first stage that fires sets
    // the outcome and breaks.
    s.foreach({
      as: "stage",
      list: ref("stages"),
      body: [
        s.conditional({
          when: or(
            and(expr(ref("stage.check_type"), "=", c.text("identity")), expr(ref("stage.operator"), "=", c.text("lte")), expr(ref("applicant.identity_score"), "<=", ref("stage.threshold"))),
            and(expr(ref("stage.check_type"), "=", c.text("identity")), expr(ref("stage.operator"), "=", c.text("gte")), expr(ref("applicant.identity_score"), ">=", ref("stage.threshold"))),
            and(expr(ref("stage.check_type"), "=", c.text("identity")), expr(ref("stage.operator"), "=", c.text("eq")), expr(ref("applicant.identity_score"), "=", ref("stage.threshold"))),
            and(expr(ref("stage.check_type"), "=", c.text("risk")), expr(ref("stage.operator"), "=", c.text("gte")), expr(ref("applicant.risk_score"), ">=", ref("stage.threshold"))),
            and(expr(ref("stage.check_type"), "=", c.text("risk")), expr(ref("stage.operator"), "=", c.text("lte")), expr(ref("applicant.risk_score"), "<=", ref("stage.threshold"))),
            and(expr(ref("stage.check_type"), "=", c.text("risk")), expr(ref("stage.operator"), "=", c.text("eq")), expr(ref("applicant.risk_score"), "=", ref("stage.threshold"))),
            and(expr(ref("stage.check_type"), "=", c.text("watchlist")), expr(ref("stage.operator"), "=", c.text("is_true")), expr(ref("applicant.watchlist_flag"), "=", c.bool(true))),
          ),
          then: [
            s.update_var("outcome", ref("stage.outcome_on_fire")),
            s.update_var("firing_id", ref("stage.id")),
            s.update_var("firing_key", ref("stage.stage_key")),
            s.update_var("reason", ref("stage.reason_code")),
            s.foreach_break(),
          ],
        }),
      ],
    }),

    // Record the audit row.
    s.db.add({
      table: decisions,
      row: {
        applicant_id: ref("applicant.id"),
        outcome: ref("outcome"),
        firing_stage_id: ref("firing_id"),
        firing_stage_key: ref("firing_key"),
        reason_code: ref("reason"),
        ruleset_version: ref("current_version"),
        decided_by: auth("id"),
      },
      as: "decision",
    }),
  ],
  response: ref("decision"),
});
