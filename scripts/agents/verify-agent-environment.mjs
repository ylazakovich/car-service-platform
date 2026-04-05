#!/usr/bin/env node
/**
 * Read-only checks: repo layout + user-level MCP config (+ optional gh / stdio GitHub token).
 *
 * Usage (repo root):
 *   node scripts/agents/verify-agent-environment.mjs          # default: Codex (~/.codex/config.toml)
 *   node scripts/agents/verify-agent-environment.mjs --mcp-target cursor
 *   node scripts/agents/verify-agent-environment.mjs --mcp-target claude
 *   node scripts/agents/verify-agent-environment.mjs --require-github --require-stdio-github
 *   node scripts/agents/verify-agent-environment.mjs --skip-user-mcp-file
 *   node scripts/agents/verify-agent-environment.mjs --quiet && echo OK
 *
 * Exit 0 = all selected checks passed; non-zero = fix messages on stderr.
 *
 * @see AGENTS.md (политика проверки окружения)
 * @see docs/dev/agent-session-bootstrap.md
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const PLACEHOLDER_TOKENS = new Set([
  "",
  "ghp_replace_me",
  "YOUR_GITHUB_PAT_HERE",
  "replace_me",
]);

function printHelp() {
  console.log(`Usage: node scripts/agents/verify-agent-environment.mjs [options]

Options:
  --mcp-target codex|cursor|claude   User config to check (default: codex → ~/.codex/config.toml)
  --require-github           gh must be installed and authenticated (gh auth status)
  --require-stdio-github       mcp/local.overrides.json must define a real github PAT
                               for stdio server (not for plugin-only GitHub MCP)
  --skip-user-mcp-file       Only check repo files (e.g. CI)
  --quiet                    Minimal output
  --help, -h                 This message

Typical (Codex — default):
  node scripts/agents/verify-agent-environment.mjs

Cursor / Claude Code:
  node scripts/agents/verify-agent-environment.mjs --mcp-target cursor
  node scripts/agents/verify-agent-environment.mjs --mcp-target claude

Strict (GitHub MCP via stdio + gh):
  node scripts/agents/verify-agent-environment.mjs --require-github --require-stdio-github
`);
}

function parseArgs(argv) {
  const out = {
    mcpTarget: "codex",
    requireGithub: false,
    requireStdioGithub: false,
    skipUserMcpFile: false,
    quiet: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--mcp-target" && argv[i + 1]) out.mcpTarget = argv[++i];
    else if (a === "--require-github") out.requireGithub = true;
    else if (a === "--require-stdio-github") out.requireStdioGithub = true;
    else if (a === "--skip-user-mcp-file") out.skipUserMcpFile = true;
    else if (a === "--quiet") out.quiet = true;
    else {
      console.error(`Unknown argument: ${a}`);
      printHelp();
      process.exit(1);
    }
  }
  if (!["codex", "cursor", "claude"].includes(out.mcpTarget)) {
    console.error("Unknown --mcp-target (use codex | cursor | claude)");
    process.exit(1);
  }
  return out;
}

function log(msg, quiet) {
  if (!quiet) console.log(msg);
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  log("Agent environment verification…", opts.quiet);

  const requiredPaths = [
    join(ROOT, "AGENTS.md"),
    join(ROOT, "scripts", "mcp", "install-user.mjs"),
    join(ROOT, "mcp", "car-service-platform.default.json"),
  ];
  for (const p of requiredPaths) {
    if (!existsSync(p)) {
      console.error(`Missing repo file: ${p}`);
      process.exit(1);
    }
  }
  log("  OK  repo layout (AGENTS.md, install-user, default MCP profile)", opts.quiet);

  if (!opts.skipUserMcpFile) {
    if (opts.mcpTarget === "codex") {
      const dest = join(homedir(), ".codex", "config.toml");
      if (!existsSync(dest)) {
        console.error(`Codex config missing: ${dest}`);
        console.error(
          "  Create ~/.codex/config.toml and add [mcp_servers.*] entries (see https://developers.openai.com/codex/mcp and mcp/README.md).",
        );
        process.exit(1);
      }
      const raw = readFileSync(dest, "utf8");
      if (!/\[\s*mcp_servers\s*[\].]/m.test(raw)) {
        console.error(`No [mcp_servers] section in ${dest}`);
        console.error(
          "  Add at least one MCP server block, e.g. from mcp/car-service-platform.standalone.json → TOML (mcp/README.md).",
        );
        process.exit(1);
      }
      log(`  OK  Codex config (${dest}) contains mcp_servers`, opts.quiet);
    } else {
      const dest =
        opts.mcpTarget === "cursor"
          ? join(homedir(), ".cursor", "mcp.json")
          : join(homedir(), ".claude", "settings.json");
      if (!existsSync(dest)) {
        console.error(`User MCP config missing: ${dest}`);
        console.error(
          `  Run: bash scripts/agents/bootstrap-agent-session.sh --mcp-target ${opts.mcpTarget}`,
        );
        process.exit(1);
      }
      let j;
      try {
        j = JSON.parse(readFileSync(dest, "utf8"));
      } catch {
        console.error(`Invalid JSON: ${dest}`);
        process.exit(1);
      }
      if (typeof j.mcpServers !== "object" || j.mcpServers === null) {
        console.error(`Missing mcpServers object in ${dest}`);
        process.exit(1);
      }
      log(`  OK  user MCP file (${dest})`, opts.quiet);
    }
  }

  if (opts.requireGithub) {
    try {
      execSync("gh auth status", { stdio: "ignore" });
    } catch {
      console.error("GitHub CLI not installed or not authenticated.");
      console.error("  Install https://cli.github.com/ then: gh auth login");
      process.exit(1);
    }
    log("  OK  gh auth status", opts.quiet);
  }

  if (opts.requireStdioGithub) {
    const ov = join(ROOT, "mcp", "local.overrides.json");
    if (!existsSync(ov)) {
      console.error(`Missing ${ov}`);
      console.error(
        "  Run: node scripts/mcp/sync-github-token-from-gh.mjs && node scripts/mcp/install-user.mjs",
      );
      process.exit(1);
    }
    let o;
    try {
      o = JSON.parse(readFileSync(ov, "utf8"));
    } catch {
      console.error(`Invalid JSON: ${ov}`);
      process.exit(1);
    }
    const tok = o?.mcpServers?.github?.env?.GITHUB_PERSONAL_ACCESS_TOKEN;
    if (typeof tok !== "string" || PLACEHOLDER_TOKENS.has(tok.trim())) {
      console.error(
        "mcp/local.overrides.json: missing or placeholder GITHUB_PERSONAL_ACCESS_TOKEN for mcpServers.github",
      );
      process.exit(1);
    }
    log("  OK  mcp/local.overrides.json defines github token (value not printed)", opts.quiet);
  }

  log("", opts.quiet);
  log("Agent environment check passed.", opts.quiet);
  if (!opts.skipUserMcpFile) {
    if (opts.mcpTarget === "codex") {
      log("If MCP does not load, restart Codex / your IDE.", opts.quiet);
    } else {
      log("If MCP does not load in the IDE, restart Cursor / Claude Code.", opts.quiet);
    }
  }
}

main();
