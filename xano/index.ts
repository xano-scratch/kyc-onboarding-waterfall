import { workspace } from "@xanots/sdk";

import { users } from "./tables/users.js";
import { ruleStages } from "./tables/rule-stages.js";
import { applicants } from "./tables/applicants.js";
import { decisions } from "./tables/decisions.js";

import { kyc } from "./api/kyc.js";
import { seedQuery } from "./api/seed.js";
import { loginQuery } from "./api/login.js";
import { applicantsListQuery } from "./api/applicants-list.js";
import { applicantsCreateQuery } from "./api/applicants-create.js";
import { applicantsRunQuery } from "./api/applicants-run.js";
import { decisionGetQuery } from "./api/decision-get.js";
import { decisionsListQuery } from "./api/decisions-list.js";
import { stagesListQuery } from "./api/stages-list.js";
import { stagesEditQuery } from "./api/stages-edit.js";

/**
 * KYC Onboarding Decision Waterfall — a governed onboarding-decision API. The
 * onboarding rules live in one versioned table (rule_stages) instead of copied
 * across channel code; the waterfall records exactly which stage decided and
 * under which version (decisions). Auth is API-layer RBAC (users + tokens +
 * per-endpoint role preconditions), never row-level security.
 */
export default workspace("kyc-onboarding-waterfall")
  .registerTables([users, ruleStages, applicants, decisions])
  .registerApiGroups([kyc])
  .registerQueries([
    seedQuery,
    loginQuery,
    applicantsListQuery,
    applicantsCreateQuery,
    applicantsRunQuery,
    decisionGetQuery,
    decisionsListQuery,
    stagesListQuery,
    stagesEditQuery,
  ]);
