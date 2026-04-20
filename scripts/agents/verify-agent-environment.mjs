#!/usr/bin/env node
/**
 * Read-only checks: repo layout + user-level MCP config.
 *
 * Usage (repo root):
 *   node scripts/agents/verify-agent-environment.mjs          # default: auto (cursor → claude → codex)
 *   node scripts/agents/verify-agent-environment.mjs --mcp-target cursor
 *   node scripts/agents/verify-agent-environment.mjs --mcp-target codex
 *   node scripts/agents/verify-agent-environment.mjs --strict   # fail if Cursor/Claude mcpServers is {}
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

const TARGETS = ["codex", "cursor", "claude", "auto"];

function printHelp() {
  console.log(`Usage: node scripts/agents/verify-agent-environment.mjs [options]

Options:
  --mcp-target codex|cursor|claude|auto   User config to check (default: auto — first existing:
                                          ~/.cursor/mcp.json → cursor,
                                          else ~/.claude/settings.json → claude,
                                          else ~/.codex/config.toml → codex)
  --strict                   For cursor/claude: exit 1 if mcpServers is empty (default: warn only)
  --skip-user-mcp-file       Only check repo files (e.g. CI)
  --quiet                    Minimal output
  --help, -h                 This message

Examples:
  node scripts/agents/verify-agent-environment.mjs
  node scripts/agents/verify-agent-environment.mjs --mcp-target codex
  node scripts/agents/verify-agent-environment.mjs --mcp-target cursor
`);
}

function parseArgs(argv) {
  const out = {
    mcpTarget: "auto",
    skipUserMcpFile: false,
    quiet: false,
    strict: false,
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--mcp-target" && argv[i + 1]) out.mcpTarget = argv[++i];
    else if (a === "--skip-user-mcp-file") out.skipUserMcpFile = true;
    else if (a === "--quiet") out.quiet = true;
    else if (a === "--strict") out.strict = true;
    else {
      console.error(`Unknown argument: ${a}`);
      printHelp();
      process.exit(1);
    }
  }
  if (!TARGETS.includes(out.mcpTarget)) {
    console.error("Unknown --mcp-target (use codex | cursor | claude | auto)");
    process.exit(1);
  }
  return out;
}

function log(msg, quiet) {
  if (!quiet) console.log(msg);
}

/**
 * @param {string} home
 * @param {boolean} quiet
 * @returns {"cursor"|"claude"|"codex"}
 */
function resolveAutoTarget(home, quiet) {
  const cursor = join(home, ".cursor", "mcp.json");
  const claude = join(home, ".claude", "settings.json");
  const codex = join(home, ".codex", "config.toml");
  if (existsSync(cursor)) {
    log(`  Auto-detected MCP target: cursor (${cursor})`, quiet);
    return "cursor";
  }
  if (existsSync(claude)) {
    log(`  Auto-detected MCP target: claude (${claude})`, quiet);
    return "claude";
  }
  if (existsSync(codex)) {
    log(`  Auto-detected MCP target: codex (${codex})`, quiet);
    return "codex";
  }
  console.error(
    "No user-level MCP config found for --mcp-target auto. Expected one of:\n" +
      `  ${cursor}\n` +
      `  ${claude}\n` +
      `  ${codex}\n` +
      "Run: bash scripts/agents/bootstrap-agent-session.sh [--mcp-target cursor|claude]\n" +
      "Or pass an explicit target: --mcp-target codex|cursor|claude",
  );
  process.exit(1);
}

/**
 * @param {string} dest
 * @param {boolean} quiet
 */
function verifyCodexConfig(dest, quiet) {
  if (!existsSync(dest)) {
    console.error(`Codex config missing: ${dest}`);
    console.error(
      "  Create ~/.codex/config.toml and add [mcp_servers.*] entries (see https://developers.openai.com/codex/mcp and scripts/mcp/README.md).",
    );
    process.exit(1);
  }
  const raw = readFileSync(dest, "utf8");
  if (!/\[\s*mcp_servers\s*[\].]/m.test(raw)) {
    console.error(`No [mcp_servers] section in ${dest}`);
    console.error(
      "  Add at least one MCP server block, e.g. from scripts/mcp/car-service-platform.standalone.json → TOML (scripts/mcp/README.md).",
    );
    process.exit(1);
  }
  log(`  OK  Codex config (${dest}) contains mcp_servers`, quiet);
}

/**
 * @param {"cursor"|"claude"} kind
 * @param {string} dest
 * @param {boolean} strict
 * @param {boolean} quiet
 */
function verifyJsonMcpFile(kind, dest, strict, quiet) {
  if (!existsSync(dest)) {
    console.error(`User MCP config missing: ${dest}`);
    console.error(`  Run: bash scripts/agents/bootstrap-agent-session.sh --mcp-target ${kind}`);
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
  const n = Object.keys(j.mcpServers).length;
  if (n === 0) {
    const msg =
      `verify-agent-environment: ${dest} has empty mcpServers — OK if tools come only from IDE/plugins (e.g. ECC); otherwise run bootstrap. Use --strict to fail on empty.`;
    if (strict) {
      console.error(msg);
      process.exit(1);
    }
    console.warn(msg);
  }
  log(`  OK  user MCP file (${dest})`, quiet);
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
    const home = homedir();
    const effective =
      opts.mcpTarget === "auto" ? resolveAutoTarget(home, opts.quiet) : opts.mcpTarget;

    if (effective === "codex") {
      verifyCodexConfig(join(home, ".codex", "config.toml"), opts.quiet);
    } else {
      const dest =
        effective === "cursor"
          ? join(home, ".cursor", "mcp.json")
          : join(home, ".claude", "settings.json");
      verifyJsonMcpFile(effective, dest, opts.strict, opts.quiet);
    }
  }

  log("", opts.quiet);
  log("Agent environment check passed.", opts.quiet);
  if (!opts.skipUserMcpFile) {
    log("If MCP does not load, restart your client (Cursor / Claude Code / Codex).", opts.quiet);
  }
}

main();
