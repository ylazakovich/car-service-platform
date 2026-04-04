import * as allure from "allure-js-commons";

/**
 * Allure Behaviors: epic END-TO-END → feature (role) → story (surface).
 * Matches DEVELOPMENT_PLAN.md LATER block and allure.config.mjs groupBy.
 */
export async function e2eBehaviors(role: "admin" | "staff", storyTitle: string): Promise<void> {
  await allure.epic("END-TO-END");
  await allure.feature(role);
  await allure.story(storyTitle);
}
