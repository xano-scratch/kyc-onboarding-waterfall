import { table, f } from "@xanots/sdk";
import { users } from "./users.js";
import { applicants } from "./applicants.js";
import { ruleStages } from "./rule-stages.js";

/**
 * The audit record: one row per waterfall run, capturing exactly which stage
 * decided and under which rule-set version. This is the defensible trail a
 * financial-crime team can point at.
 *
 * `firing_stage_id` is 0 when nothing fired (outcome `approve`); read it back
 * with a field-match get (not get_by_id, which rejects the 0 sentinel).
 */
export const decisions = table({
  name: "decisions",
  schema: {
    applicant_id: f.tableRef(applicants, { required: true }),
    outcome: f.enum(["approve", "refer", "decline"], { required: true }),
    firing_stage_id: f.tableRef(ruleStages, { required: true, default: 0 }),
    firing_stage_key: f.text({ default: "" }),
    reason_code: f.text({ default: "" }),
    ruleset_version: f.int({ required: true }),
    decided_by: f.tableRef(users, { required: true, default: 0 }),
  },
});
