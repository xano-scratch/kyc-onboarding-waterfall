import { query, s, c, ref, inp, input, expr } from "@xanots/sdk";
import { kyc } from "./kyc.js";
import { users } from "../tables/users.js";
import { applicants } from "../tables/applicants.js";
import { ruleStages } from "../tables/rule-stages.js";
import { decisions } from "../tables/decisions.js";

/**
 * One decision joined to its applicant and firing stage, so a reviewer sees the
 * outcome, the exact stage that decided, its reason code, the version, and the
 * facts side by side. Any authenticated role.
 *
 * The firing stage is read by field match (not get_by_id) because
 * firing_stage_id is 0 for an `approve` — it binds null there.
 */
export const decisionGetQuery = query({
  name: "decisions/{id}",
  verb: "GET",
  apiGroup: kyc,
  auth: users,
  input: { id: input.int({ required: true }) },
  stack: [
    s.db.get_by_id({ table: decisions, id: inp("id"), as: "decision" }),
    s.precondition({ expr: expr(ref("decision", { safe: true }), "!=", c.null()), error_type: "notfound", error: c.text("Decision not found.") }),
    s.db.get_by_id({ table: applicants, id: ref("decision.applicant_id"), as: "applicant" }),
    s.db.get({ table: ruleStages, fieldName: "id", fieldValue: ref("decision.firing_stage_id"), as: "firing_stage" }),
  ],
  response: {
    decision: ref("decision"),
    applicant: ref("applicant"),
    firing_stage: ref("firing_stage"),
  },
});
