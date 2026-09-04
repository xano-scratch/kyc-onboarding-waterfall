import { query, s, ref } from "@xanots/sdk";
import { kyc } from "./kyc.js";
import { users } from "../tables/users.js";
import { ruleStages } from "../tables/rule-stages.js";

/** The current ordered rule set with its versions. Any authenticated role. */
export const stagesListQuery = query({
  name: "stages",
  verb: "GET",
  apiGroup: kyc,
  auth: users,
  stack: [
    s.db.query({ table: ruleStages, sort: [{ sortBy: "stage_order", dir: "asc" }], as: "rows" }),
  ],
  response: ref("rows"),
});
