import { query, s, ref } from "@xanots/sdk";
import { kyc } from "./kyc.js";
import { users } from "../tables/users.js";
import { applicants } from "../tables/applicants.js";

/** List applicants, newest first. Any authenticated role. */
export const applicantsListQuery = query({
  name: "applicants/list",
  verb: "GET",
  apiGroup: kyc,
  auth: users,
  stack: [
    s.db.query({ table: applicants, sort: [{ sortBy: "created_at", dir: "desc" }], as: "rows" }),
  ],
  response: ref("rows"),
});
