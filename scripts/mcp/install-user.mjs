#!/usr/bin/env node
/**
 * Merge the repo MCP profile into a user-level config (one-time or repeat-safe).
 *
 * Usage (from repo root):
 *   node scripts/mcp/install-user.mjs
 *   node scripts/mcp/install-user.mjs --dry-run
 *   node scripts/mcp/install-user.mjs --target claude
 *   node scripts/mcp/install-user.mjs --force-profile
 *
 * Targets:
 *   cursor (default) → ~/.cursor/mcp.json  { mcpServers: {...} }
 *   claude          → ~/.claude/settings.json  merges top-level mcpServers
 *
 * Merge order (per server name): existing user → profile from repo → mcp/local.overrides.json
 * Env vars are deep-merged for the same server. Use --force-profile to drop existing servers
 * that are not in the profile or overrides (only those names survive from profile+overrides).
 *
 * @see mcp/README.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const DEFAULT_PROFILE = join(REPO_ROOT, "mcp", "car-service-platform.default.json");
const LOCAL_OVERRIDES = join(REPO_ROOT, "mcp", "local.overrides.json");

function parseArgs(argv) {
  const out = { dryRun: false, target: "cursor", forceProfile: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--force-profile") out.forceProfile = true;
    else if (a === "--target" && argv[i + 1]) {
      out.target = argv[++i];
      if (!["cursor", "claude"].includes(out.target)) {
        console.error(`Unknown --target ${out.target} (use cursor | claude)`);
        process.exit(1);
      }
    }
  }
  return out;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function deepMergeServer(base, patch) {
  if (!patch) return base ? { ...base } : undefined;
  if (!base) return { ...patch };
  return {
    ...base,
    ...patch,
    env: { ...(base.env || {}), ...(patch.env || {}) },
  };
}

/**
 * @param {Record<string, object>} existing
 * @param {Record<string, object>} profile
 * @param {Record<string, object>} overrides
 */
function mergeAllServers(existing, profile, overrides) {
  const names = new Set([
    ...Object.keys(existing),
    ...Object.keys(profile),
    ...Object.keys(overrides),
  ]);
  const out = {};
  for (const name of names) {
    const e = existing[name];
    const p = profile[name];
    const o = overrides[name];
    let merged = deepMergeServer(deepMergeServer(e, p), o);
    if (merged) out[name] = merged;
  }
  return out;
}

function forceProfileOnly(profile, overrides) {
  const names = new Set([...Object.keys(profile), ...Object.keys(overrides)]);
  const out = {};
  for (const name of names) {
    const merged = deepMergeServer(profile[name], overrides[name]);
    if (merged) out[name] = merged;
  }
  return out;
}

function installCursor({ dryRun, forceProfile }) {
  const cursorDir = join(homedir(), ".cursor");
  const dest = join(cursorDir, "mcp.json");
  const { mcpServers: profile } = readJson(DEFAULT_PROFILE);
  const overrides = existsSync(LOCAL_OVERRIDES) ? readJson(LOCAL_OVERRIDES).mcpServers || {} : {};

  let existingRoot = {};
  if (existsSync(dest)) {
    existingRoot = readJson(dest);
  }
  const existing = existingRoot.mcpServers || {};

  const mcpServers = forceProfile
    ? forceProfileOnly(profile, overrides)
    : mergeAllServers(existing, profile, overrides);

  const output = { ...existingRoot, mcpServers };

  if (dryRun) {
    console.log("[dry-run] Would write:", dest);
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  mkdirSync(cursorDir, { recursive: true });
  if (existsSync(dest)) {
    const bak = `${dest}.bak.${Date.now()}`;
    copyFileSync(dest, bak);
    console.log("Backup:", bak);
  }
  writeFileSync(dest, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log("Wrote", dest);
}

function installClaude({ dryRun, forceProfile }) {
  const claudeDir = join(homedir(), ".claude");
  const dest = join(claudeDir, "settings.json");
  const { mcpServers: profile } = readJson(DEFAULT_PROFILE);
  const overrides = existsSync(LOCAL_OVERRIDES) ? readJson(LOCAL_OVERRIDES).mcpServers || {} : {};

  let existingRoot = {};
  if (existsSync(dest)) {
    existingRoot = readJson(dest);
  }
  const existing = existingRoot.mcpServers || {};

  const mcpServers = forceProfile
    ? forceProfileOnly(profile, overrides)
    : mergeAllServers(existing, profile, overrides);

  const output = { ...existingRoot, mcpServers };

  if (dryRun) {
    console.log("[dry-run] Would write:", dest);
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  mkdirSync(claudeDir, { recursive: true });
  if (existsSync(dest)) {
    const bak = `${dest}.bak.${Date.now()}`;
    copyFileSync(dest, bak);
    console.log("Backup:", bak);
  }
  writeFileSync(dest, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log("Wrote", dest);
}

function main() {
  const opts = parseArgs(process.argv);
  if (!existsSync(DEFAULT_PROFILE)) {
    console.error("Missing profile:", DEFAULT_PROFILE);
    process.exit(1);
  }

  console.log("Profile:", DEFAULT_PROFILE);
  if (existsSync(LOCAL_OVERRIDES)) {
    console.log("Local overrides:", LOCAL_OVERRIDES);
  } else {
    console.log(
      "Optional: mcp/local.overrides.json (gitignored) — copy from mcp/local.overrides.json.example",
    );
  }

  if (opts.target === "cursor") {
    installCursor(opts);
  } else {
    installClaude(opts);
  }

  console.log("\nRestart Cursor / Claude Code so MCP reloads.");
}

main();
