#!/usr/bin/env node
/**
 * Writes the current `gh auth token` into gitignored mcp/local.overrides.json
 * for server "github" (GITHUB_PERSONAL_ACCESS_TOKEN). Does not print the token.
 *
 * Prerequisites: `gh` installed and `gh auth login` completed.
 *
 * Usage (repo root):
 *   node scripts/mcp/sync-github-token-from-gh.mjs
 *   node scripts/mcp/sync-github-token-from-gh.mjs --dry-run   # shows actions only
 *
 * Then run: node scripts/mcp/install-user.mjs
 *
 * @see docs/dev/agent-session-bootstrap.md
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OVERRIDES = join(ROOT, "mcp", "local.overrides.json");

function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

function getTokenFromGh() {
  try {
    const t = execSync("gh auth token", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (!t) throw new Error("empty token");
    return t;
  } catch {
    throw new Error(
      "gh auth token failed. Install GitHub CLI and run: gh auth login",
    );
  }
}

function deepMergeGithubEnv(existing, token) {
  const base = existing && typeof existing === "object" ? existing : {};
  return {
    ...base,
    command: base.command || "npx",
    args: base.args || ["-y", "@modelcontextprotocol/server-github"],
    env: {
      ...(base.env || {}),
      GITHUB_PERSONAL_ACCESS_TOKEN: token,
    },
  };
}

function main() {
  const { dryRun } = parseArgs(process.argv);
  const token = dryRun ? "DRY_RUN_PLACEHOLDER" : getTokenFromGh();

  let root = { mcpServers: {} };
  if (existsSync(OVERRIDES)) {
    root = JSON.parse(readFileSync(OVERRIDES, "utf8"));
  }
  if (!root.mcpServers || typeof root.mcpServers !== "object") {
    root.mcpServers = {};
  }

  const prevGh = root.mcpServers.github;
  root.mcpServers.github = deepMergeGithubEnv(prevGh, token);

  if (dryRun) {
    console.log("[dry-run] Would write:", OVERRIDES);
    console.log("[dry-run] github server env would set GITHUB_PERSONAL_ACCESS_TOKEN (value hidden)");
    return;
  }

  mkdirSync(dirname(OVERRIDES), { recursive: true });
  writeFileSync(OVERRIDES, `${JSON.stringify(root, null, 2)}\n`, "utf8");
  console.log("Wrote", OVERRIDES, "(gitignored) — GITHUB_PERSONAL_ACCESS_TOKEN set from gh");
  console.log("Next: node scripts/mcp/install-user.mjs   (then restart IDE)");
}

main();
