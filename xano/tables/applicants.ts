import { table, f } from "@xanots/sdk";
import { users } from "./users.js";

/**
 * The inbound facts a stage evaluates against. Scores are held on a 0..100
 * scale (identity: match confidence, higher is a better match; risk: higher is
 * riskier). `submitted_by` records which analyst entered the applicant.
 */
export const applicants = table({
  name: "applicants",
  schema: {
    full_name: f.text({ required: true }),
    country: f.text({ required: true }),
    identity_score: f.decimal({ required: true }),
    risk_score: f.decimal({ required: true }),
    watchlist_flag: f.bool({ default: false }),
    // Optional-ish FK: a 0 sentinel means "not attributed" (never nullable — a
    // null FK is unqueryable by field match).
    submitted_by: f.tableRef(users, { required: true, default: 0 }),
  },
});
