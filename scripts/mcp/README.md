# MCP profile (provider-agnostic JSON + installer)

**Not part of product spec** (`docs/spec/`): optional tooling for Cursor / Claude Code / Codex. App build and run: [`docs/spec/RUNBOOK.md`](../../docs/spec/RUNBOOK.md).

**Location:** `scripts/mcp/` (profiles + installer live together). This folder holds a **portable** MCP server list in JSON. The format matches what **Cursor** (`~/.cursor/mcp.json`) and **Claude Code** (`~/.claude/settings.json` → `mcpServers`) expect: a top-level `mcpServers` object.

It is **not** tied to a single vendor UI: you can copy the JSON manually, or run the Node installer once.

## Avoiding duplicates (everything-claude-code)

If you use the **everything-claude-code** plugin, Built-in MCPs already cover context7, playwright, github, memory, sequential-thinking, exa, etc. Adding the **same** servers again via project merge or **project-local** `~/.claude.json` creates duplicate processes (two Playwright MCPs, etc.).

**Default in this repo:** `car-service-platform.default.json` has an **empty** `mcpServers`. Running `install-user.mjs` then only merges **what you already have** plus optional `local.overrides.json` — it does **not** inject a second copy of Playwright.

**Full stdio stack without the plugin:** use `--profile standalone` (reads `car-service-platform.standalone.json`).

Canonical checklist: **`docs/dev/mcp-deduplication.md`**.

## Files

| File | Purpose |
|------|---------|
| `car-service-platform.default.json` | **Empty** `mcpServers` by default — ECC-friendly; no duplicate stdio servers. |
| `car-service-platform.standalone.json` | Full stdio set (Context7, GitHub, Playwright, sequential-thinking, memory) when no plugin. Placeholders for secrets in GitHub entry. |
| `local.overrides.json.example` | Template for real tokens; copy to `local.overrides.json` (gitignored). |
| `local.overrides.json` | Optional; merged last by the installer. **Never commit.** |

## One-shot install (recommended)

From the **repository root**:

```bash
node scripts/mcp/install-user.mjs
```

- Writes **`~/.cursor/mcp.json`** (Cursor global MCP).
- Merges with what you already have: existing servers stay; names from the chosen **profile** are updated (default profile adds no new names unless you extend the JSON).
- Backs up the previous file to `mcp.json.bak.<timestamp>`.

**Claude Code** (same JSON shape under `mcpServers`):

```bash
node scripts/mcp/install-user.mjs --target claude
```

**Standalone profile** (no ECC / need full stdio list):

```bash
node scripts/mcp/install-user.mjs --profile standalone
node scripts/mcp/install-user.mjs --target claude --profile standalone
```

Preview without writing:

```bash
node scripts/mcp/install-user.mjs --dry-run
```

Replace user MCP entirely with only profile + overrides (drops other server names):

```bash
node scripts/mcp/install-user.mjs --force-profile
```

## Secrets

1. Put a PAT in **`scripts/mcp/local.overrides.json`** (create from `scripts/mcp/local.overrides.json.example`), **or**
2. Edit `~/.cursor/mcp.json` after install and set `GITHUB_PERSONAL_ACCESS_TOKEN` there, **or**
3. Rely on your environment if the client expands env vars (depends on IDE version).

If you use **only** the plugin’s GitHub MCP, configure its token per plugin docs; the `github` key in overrides applies to the **stdio** server with that name.

## Bootstrap from this repo

Agent / local setup (**no** host npm/pip by default — Docker is the norm): `bash scripts/agents/bootstrap-agent-session.sh`. Optional: `--mcp-profile standalone` if you have no ECC. See **`docs/dev/agent-session-bootstrap.md`**.

## Other tools (Codex, etc.)

- **Codex** often uses `~/.codex/config.toml` — different format; translate entries manually from `car-service-platform.standalone.json` if you need the full list.
- Upstream catalog with more servers: [everything-claude-code `mcp-configs/mcp-servers.json`](https://github.com/affaan-m/everything-claude-code/blob/main/mcp-configs/mcp-servers.json).

## Disable servers per project

- **Codex:** project **`.codex/config.toml`** in the repo (when the project is trusted) can set `[mcp_servers.NAME] enabled = false` for servers defined in user config — see `docs/dev/mcp-deduplication.md`.
- **Cursor:** project `.cursor/mcp.json` or workspace MCP settings (see current Cursor docs). Prefer **one** source per capability (plugin **or** stdio), not both.
