import { expect, test } from "@playwright/test";
import { e2eBehaviors } from "./allure-helpers";

/**
 * Deliberately failing E2E for CI / Allure inspection (trace, report). Remove this file after use.
 * @desktop — only desktop-chrome (see playwright.config.ts grepInvert for mobile).
 */
test.describe("CI · intentional E2E failure (remove after inspection) @desktop", () => {
  test("fails on purpose — validates failure pipeline + Allure", async () => {
    await e2eBehaviors("admin", "ci · intentional failure");
    expect(
      true,
      "Temporary spec: delete frontend/e2e/ci-intentional-failure.spec.ts when done",
    ).toBe(false);
  });
});
