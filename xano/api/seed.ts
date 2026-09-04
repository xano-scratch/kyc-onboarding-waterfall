import { query, s, c, ref, obj } from "@xanots/sdk";
import { kyc } from "./kyc.js";
import { users } from "../tables/users.js";
import { ruleStages } from "../tables/rule-stages.js";
import { applicants } from "../tables/applicants.js";
import { decisions } from "../tables/decisions.js";

/**
 * Idempotent bootstrap so a fresh ephemeral is browsable immediately. Wipes the
 * four tables (truncate + reset), then writes three users (one per role), a v1
 * ordered rule set, and four sample applicants that land on all four outcomes.
 * Returns the shared demo password and a ready token per role.
 *
 * The demo password is a deliberate public fixture, not a secret.
 */
export const seedQuery = query({
  name: "seed",
  verb: "POST",
  apiGroup: kyc,
  stack: [
    // Reset children before parents; reset:true restarts the id sequences so
    // the seeded ids are stable across re-deploys.
    s.db.truncate({ table: decisions, reset: true }),
    s.db.truncate({ table: applicants, reset: true }),
    s.db.truncate({ table: ruleStages, reset: true }),
    s.db.truncate({ table: users, reset: true }),

    // Users — the f.password column hashes the plaintext on write.
    s.db.add({ table: users, row: { email: "viewer@example.com", password: "kyc-demo-1234", role: "viewer", name: "Val Viewer" }, as: "viewer" }),
    s.db.add({ table: users, row: { email: "analyst@example.com", password: "kyc-demo-1234", role: "analyst", name: "Ana Analyst" }, as: "analyst" }),
    s.db.add({ table: users, row: { email: "admin@example.com", password: "kyc-demo-1234", role: "admin", name: "Adam Admin" }, as: "admin" }),

    // v1 rule set — ordered most-severe first, so the waterfall stops at the
    // strongest applicable stage: a watchlist hit declines outright, else a high
    // risk score refers, else a low identity match refers, else approve.
    s.db.add({ table: ruleStages, row: { stage_key: "watchlist_hit", label: "Watchlist hit", stage_order: 10, check_type: "watchlist", operator: "is_true", threshold: 0, outcome_on_fire: "decline", reason_code: "WATCHLIST_HIT", ruleset_version: 1, active: true } }),
    s.db.add({ table: ruleStages, row: { stage_key: "risk_score", label: "Risk score high", stage_order: 20, check_type: "risk", operator: "gte", threshold: 75, outcome_on_fire: "refer", reason_code: "RISK_SCORE_HIGH", ruleset_version: 1, active: true } }),
    s.db.add({ table: ruleStages, row: { stage_key: "identity_match", label: "Identity match low", stage_order: 30, check_type: "identity", operator: "lte", threshold: 70, outcome_on_fire: "refer", reason_code: "IDENTITY_MATCH_LOW", ruleset_version: 1, active: true } }),

    // Sample applicants (submitted by the analyst) — one per outcome:
    // Grace: clean → approve (raise the identity threshold to watch her refer).
    s.db.add({ table: applicants, row: { full_name: "Grace Okoro", country: "NG", identity_score: 95, risk_score: 20, watchlist_flag: false, submitted_by: ref("analyst.id") } }),
    // Liam: low identity match → refer (IDENTITY_MATCH_LOW).
    s.db.add({ table: applicants, row: { full_name: "Liam Doyle", country: "IE", identity_score: 55, risk_score: 30, watchlist_flag: false, submitted_by: ref("analyst.id") } }),
    // Priya: high risk → refer (RISK_SCORE_HIGH).
    s.db.add({ table: applicants, row: { full_name: "Priya Nair", country: "IN", identity_score: 90, risk_score: 88, watchlist_flag: false, submitted_by: ref("analyst.id") } }),
    // Viktor: watchlist hit → decline (WATCHLIST_HIT), the most severe stage.
    s.db.add({ table: applicants, row: { full_name: "Viktor Petrov", country: "BG", identity_score: 85, risk_score: 40, watchlist_flag: true, submitted_by: ref("analyst.id") } }),

    // A ready token per role, for one-click sign-in and curl smoke tests.
    s.security.create_auth_token({ table: users, id: ref("viewer.id"), as: "viewer_token" }),
    s.security.create_auth_token({ table: users, id: ref("analyst.id"), as: "analyst_token" }),
    s.security.create_auth_token({ table: users, id: ref("admin.id"), as: "admin_token" }),
  ],
  response: {
    ok: c.bool(true),
    password: c.text("kyc-demo-1234"),
    users: c.int(3),
    stages: c.int(3),
    applicants: c.int(4),
    tokens: obj({ viewer: ref("viewer_token"), analyst: ref("analyst_token"), admin: ref("admin_token") }),
  },
});
