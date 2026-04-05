# MCP profile (provider-agnostic JSON + installer)

This folder holds a **portable** MCP server list in JSON. The format matches what **Cursor** (`~/.cursor/mcp.json`) and **Claude Code** (`~/.claude/settings.json` → `mcpServers`) expect: a top-level `mcpServers` object.

It is **not** tied to a single vendor UI: you can copy the JSON manually, or run the Node installer once.

## Files

| File | Purpose |
|------|---------|
| `car-service-platform.default.json` | Default servers (Context7, GitHub, Playwright, sequential-thinking, memory). **Commit-safe** — use placeholders for secrets. |
| `local.overrides.json.example` | Template for real tokens; copy to `local.overrides.json` (gitignored). |
| `local.overrides.json` | Optional; merged last by the installer. **Never commit.** |

## One-shot install (recommended)

From the **repository root**:

```bash
node scripts/mcp/install-user.mjs
```

- Writes **`~/.cursor/mcp.json`** (Cursor global MCP).
- Merges with what you already have: existing servers stay; names from this profile are updated.
- Backs up the previous file to `mcp.json.bak.<timestamp>`.

**Claude Code** (same JSON shape under `mcpServers`):

```bash
node scripts/mcp/install-user.mjs --target claude
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

1. Put a PAT in **`mcp/local.overrides.json`** (create from `local.overrides.json.example`), **or**
2. Edit `~/.cursor/mcp.json` after install and set `GITHUB_PERSONAL_ACCESS_TOKEN` there, **or**
3. Rely on your environment if the client expands env vars (depends on IDE version).

Remove placeholder `YOUR_GITHUB_PAT_HERE` from the default file before relying on GitHub MCP.

## Session token via GitHub CLI (required for agents in this repo)

For **each working session**, prefer the token issued to [GitHub CLI](https://cli.github.com/) instead of a long-lived PAT in git:

```bash
node scripts/mcp/sync-github-token-from-gh.mjs
node scripts/mcp/install-user.mjs          # or --target claude
```

- Writes **`mcp/local.overrides.json`** (gitignored) with `GITHUB_PERSONAL_ACCESS_TOKEN` from `gh auth token`.
- The script does **not** print the token.
- Requires `gh auth login` beforehand.

Default bootstrap (MCP + gh, **no** host npm/pip — Docker is the norm): `bash scripts/agents/bootstrap-agent-session.sh`. Optional host packages: `--with-host-deps`. See **`docs/dev/agent-session-bootstrap.md`**.

## Other tools (Codex, etc.)

- **Codex** often uses `~/.codex/config.toml` — different format; translate entries manually from `car-service-platform.default.json`.
- Upstream catalog with more servers: [everything-claude-code `mcp-configs/mcp-servers.json`](https://github.com/affaan-m/everything-claude-code/blob/main/mcp-configs/mcp-servers.json).

## Disable servers per project

Cursor: project `.cursor/mcp.json` or `disabledMcpServers` in settings (see current Cursor docs). Keep the global profile lean (this repo suggests ≤5–6 servers).
