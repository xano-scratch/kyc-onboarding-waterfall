import { query, s, ref } from "@xanots/sdk";
import { kyc } from "./kyc.js";
import { users } from "../tables/users.js";
import { decisions } from "../tables/decisions.js";

/** The audit trail: every run, newest first. Any authenticated role. */
export const decisionsListQuery = query({
  name: "decisions",
  verb: "GET",
  apiGroup: kyc,
  auth: users,
  stack: [
    s.db.query({ table: decisions, sort: [{ sortBy: "created_at", dir: "desc" }], as: "rows" }),
  ],
  response: ref("rows"),
});
