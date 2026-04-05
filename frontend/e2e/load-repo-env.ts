import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** `frontend/e2e` → monorepo root */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Injects key=value pairs from repo-root `.env` into `process.env` only when a key is unset.
 * Keeps CI/job `E2E_*` and exported vars authoritative; aligns local runs with `docker compose` credentials.
 */
export function applyRepoRootDotEnv(): void {
  const envPath = resolve(repoRoot, ".env");
  if (!existsSync(envPath)) {
    return;
  }
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (!key) {
      continue;
    }
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}
