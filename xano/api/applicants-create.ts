import { query, s, c, ref, inp, auth, input, expr, and, or } from "@xanots/sdk";
import { kyc } from "./kyc.js";
import { users } from "../tables/users.js";
import { applicants } from "../tables/applicants.js";

/**
 * Submit an applicant. Analyst or admin only — the role is read from the
 * caller's own row (API-layer RBAC) and the scores are validated at the
 * endpoint before the row is stored.
 */
export const applicantsCreateQuery = query({
  name: "applicants",
  verb: "POST",
  apiGroup: kyc,
  auth: users,
  input: {
    full_name: input.text({ required: true }),
    country: input.text({ required: true }),
    identity_score: input.decimal({ required: true }),
    risk_score: input.decimal({ required: true }),
    watchlist_flag: input.bool({ default: false }),
  },
  stack: [
    // Role guard.
    s.db.get_by_id({ table: users, id: auth("id"), as: "me" }),
    s.precondition({ expr: expr(ref("me", { safe: true }), "!=", c.null()), error_type: "unauthorized", error: c.text("Session user not found.") }),
    s.precondition({ expr: or(expr(ref("me.role"), "=", c.text("analyst")), expr(ref("me.role"), "=", c.text("admin"))), error_type: "accessdenied", error: c.text("Only an analyst or admin can submit an applicant.") }),

    // Validate the inbound facts.
    s.precondition({ expr: and(expr(inp("identity_score"), ">=", c.decimal(0)), expr(inp("identity_score"), "<=", c.decimal(100))), error_type: "inputerror", error: c.text("identity_score must be between 0 and 100.") }),
    s.precondition({ expr: and(expr(inp("risk_score"), ">=", c.decimal(0)), expr(inp("risk_score"), "<=", c.decimal(100))), error_type: "inputerror", error: c.text("risk_score must be between 0 and 100.") }),

    s.db.add({
      table: applicants,
      row: {
        full_name: inp("full_name"),
        country: inp("country"),
        identity_score: inp("identity_score"),
        risk_score: inp("risk_score"),
        watchlist_flag: inp("watchlist_flag"),
        submitted_by: auth("id"),
      },
      as: "applicant",
    }),
  ],
  response: ref("applicant"),
});
