import { query, s, c, ref, inp, auth, input, expr } from "@xanots/sdk";
import { kyc } from "./kyc.js";
import { users } from "../tables/users.js";
import { ruleStages } from "../tables/rule-stages.js";

/**
 * Edit a stage's threshold / outcome / order / active flag and BUMP the
 * rule-set version, so the change is versioned rather than silent. Admin only.
 * The new version is one past the highest version any stage currently holds, so
 * a re-run of the same applicant records the new version and both decisions stay
 * on the audit trail. The editable fields are all required — the frontend
 * pre-fills them from the current stage and submits the full set.
 */
export const stagesEditQuery = query({
  name: "stages/{id}",
  verb: "PUT",
  apiGroup: kyc,
  auth: users,
  input: {
    id: input.int({ required: true }),
    threshold: input.decimal({ required: true }),
    outcome_on_fire: input.enum(["refer", "decline"], { required: true }),
    stage_order: input.int({ required: true }),
    active: input.bool({ required: true }),
  },
  stack: [
    // Role guard: admin only.
    s.db.get_by_id({ table: users, id: auth("id"), as: "me" }),
    s.precondition({ expr: expr(ref("me", { safe: true }), "!=", c.null()), error_type: "unauthorized", error: c.text("Session user not found.") }),
    s.precondition({ expr: expr(ref("me.role"), "=", c.text("admin")), error_type: "accessdenied", error: c.text("Only an admin can edit a rule stage.") }),

    // Stage must exist.
    s.db.get_by_id({ table: ruleStages, id: inp("id"), as: "stage" }),
    s.precondition({ expr: expr(ref("stage", { safe: true }), "!=", c.null()), error_type: "notfound", error: c.text("Rule stage not found.") }),

    // Next version = highest version any stage holds + 1.
    s.db.query({ table: ruleStages, sort: [{ sortBy: "ruleset_version", dir: "desc" }], returnType: "single", as: "top" }),
    s.set_var("new_version", ref("top.ruleset_version")),
    s.math.add({ name: "new_version", value: c.int(1) }),

    s.db.edit({
      table: ruleStages,
      fieldName: "id",
      fieldValue: inp("id"),
      row: {
        threshold: inp("threshold"),
        outcome_on_fire: inp("outcome_on_fire"),
        stage_order: inp("stage_order"),
        active: inp("active"),
        ruleset_version: ref("new_version"),
      },
      as: "updated",
    }),
  ],
  response: {
    stage: ref("updated"),
    ruleset_version: ref("new_version"),
  },
});
