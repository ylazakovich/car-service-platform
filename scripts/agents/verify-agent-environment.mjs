#!/usr/bin/env node
/**
 * Read-only checks: repo layout + user-level MCP config.
 *
 * Usage (repo root):
 *   node scripts/agents/verify-agent-environment.mjs          # default: Codex (~/.codex/config.toml)
 *   node scripts/agents/verify-agent-environment.mjs --mcp-target cursor
 *   node scripts/agents/verify-agent-environment.mjs --mcp-target claude
 *   node scripts/agents/verify-agent-environment.mjs --skip-user-mcp-file
 *   node scripts/agents/verify-agent-environment.mjs --quiet && echo OK
 *
 * Exit 0 = all selected checks passed; non-zero = fix messages on stderr.
 *
 * @see AGENTS.md (политика проверки окружения)
 * @see docs/dev/agent-session-bootstrap.md
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

function printHelp() {
  console.log(`Usage: node scripts/agents/verify-agent-environment.mjs [options]

Options:
  --mcp-target codex|cursor|claude   User config to check (default: codex → ~/.codex/config.toml)
  --skip-user-mcp-file       Only check repo files (e.g. CI)
  --quiet                    Minimal output
  --help, -h                 This message

Typical (Codex — default):
  node scripts/agents/verify-agent-environment.mjs

Cursor / Claude Code:
  node scripts/agents/verify-agent-environment.mjs --mcp-target cursor
  node scripts/agents/verify-agent-environment.mjs --mcp-target claude
`);
}

function parseArgs(argv) {
  const out = {
    mcpTarget: "codex",
    skipUserMcpFile: false,
    quiet: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--mcp-target" && argv[i + 1]) out.mcpTarget = argv[++i];
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
