import type { FullConfig } from "@playwright/test";

function apiHealthUrl(baseURL: string): string {
  return new URL("/api/health", baseURL).href;
}

/**
 * Waits until Django `/api/health` responds through the same origin as Playwright (nginx → backend).
 * Skippable for local debugging: `E2E_SKIP_GLOBAL_SETUP=1`.
 *
 * @see docs/testing/playwright-e2e-framework.md
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  if (process.env.E2E_SKIP_GLOBAL_SETUP === "1" || process.env.E2E_SKIP_GLOBAL_SETUP === "true") {
    console.warn("[e2e global-setup] E2E_SKIP_GLOBAL_SETUP set — skipping API health wait");
    return;
  }

  const baseURL =
    (typeof config.use?.baseURL === "string" ? config.use.baseURL : null) ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "http://127.0.0.1:4173";

  const url = apiHealthUrl(baseURL);
  const maxAttempts = process.env.CI ? 90 : 45;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const body = (await res.json()) as { status?: string };
      if (body.status !== "ok") {
        throw new Error(`Unexpected JSON: ${JSON.stringify(body)}`);
      }
      console.log(`[e2e global-setup] ${url} OK (attempt ${attempt}/${maxAttempts})`);
      return;
    } catch (e) {
      if (attempt === maxAttempts) {
        throw new Error(
          `[e2e global-setup] API health failed after ${maxAttempts} attempts (${url}): ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
