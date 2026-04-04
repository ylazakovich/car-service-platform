import * as allure from "allure-js-commons";

/**
 * Allure Behaviors: epic END-TO-END → feature (role) → story (surface).
 * Matches DEVELOPMENT_PLAN.md LATER block and allure.config.mjs groupBy.
 *
 * Playwright attaches **trace** (retain-on-failure in CI) and screenshots; the `allure-playwright`
 * reporter maps them into the result (including `playwright-trace` for the zip). Open the attachment
 * in Allure or run `npx playwright show-trace <trace.zip>`.
 */
export async function e2eBehaviors(role: "admin" | "staff", storyTitle: string): Promise<void> {
  await allure.epic("end-to-end");
  await allure.feature(role);
  await allure.story(storyTitle);
  await allure.description(
    "Docker stack E2E. The Allure Playwright reporter attaches **trace** (zip, open with Playwright trace viewer) and **screenshot** on failure.",
  );
}
