import { table, f } from "@xanots/sdk";

/**
 * The heart of the app: the ordered, versioned KYC rule set. Onboarding
 * decision rules live here in one governed place instead of copied across
 * channel code. The waterfall reads the active stages in `stage_order`, and the
 * FIRST stage whose operator/threshold fires decides the outcome.
 *
 * Editing a stage bumps `ruleset_version`, so a threshold change is a versioned
 * edit a later run reflects, with the prior decision still on record.
 *
 * `threshold` is non-null (default 0); a `watchlist` stage uses the `is_true`
 * operator and ignores it.
 */
export const ruleStages = table({
  name: "rule_stages",
  schema: {
    stage_key: f.text({ required: true }),
    label: f.text({ required: true }),
    stage_order: f.int({ required: true }),
    check_type: f.enum(["identity", "risk", "watchlist"], { required: true }),
    operator: f.enum(["gte", "lte", "eq", "is_true"], { required: true }),
    threshold: f.decimal({ default: 0 }),
    outcome_on_fire: f.enum(["refer", "decline"], { required: true }),
    reason_code: f.text({ required: true }),
    ruleset_version: f.int({ required: true, default: 1 }),
    active: f.bool({ default: true }),
  },
});
