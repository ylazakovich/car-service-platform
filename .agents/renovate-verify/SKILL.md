# renovate-verify

## Purpose
Validate that `renovate.json` (including `customManagers` / regex rules) actually discovers dependencies when Renovate runs, **before** the bot opens PRs on GitHub.

## When to use
- You changed `renovate.json`, `customManagers`, `managerFilePatterns`, or `matchStrings`.
- You added tracking for Node (or other fields) in the composite action `.github/actions/setup-node/action.yml`.
- Renovate stays silent or does not propose expected updates.

## How to run (canonical for this repo)

From the `car-service-platform` repository root:

```bash
chmod +x scripts/renovate-local-verify.sh   # once, if needed
./scripts/renovate-local-verify.sh
```

The script:
- mounts the repo into the `renovate/renovate` container;
- runs `renovate --platform=local` with `RENOVATE_DRY_RUN=lookup` (no Git writes, no token);
- writes the full log to a tempfile (path printed at the end);
- asserts that the **regex manager** matched `.github/actions/setup-node/action.yml`.

Optional environment variables:
- `RENOVATE_IMAGE` — image (default `renovate/renovate:latest`)
- `RENOVATE_LOG_LEVEL` — default `debug`
- `RENOVATE_LOG` — explicit log path instead of a tempfile

## How to read the result

### Success for composite Node (`customManagers` + `node-version`)
The log should contain a line like:
`Matched N file(s) for manager regex: ...setup-node/action.yml...`

If it is missing, the usual mistake is **`managerFilePatterns`**: in Renovate this must be a **slash-delimited regex** (see docs: `"/^Dockerfile$/"`), not a raw string without delimiters. For this composite action, use the full path from the repo root:

`"/^\\.github\\/actions\\/setup-node\\/action\\.ya?ml$/"`

Without the outer slashes, Renovate may not associate the file with your rule (the log will only show preset matches such as `tsconfig.json`).

### False positives
The `github-actions` manager also parses `setup-node/action.yml` and may show `depName: node` with `currentValue: ${{ inputs.node-version }}` — that is **not** proof your regex `customManager` ran. Rely on the **Matched … manager regex** line for the target file.

### Manual inspection
```bash
grep -E 'custom regex|manager regex|setup-node/action|node-version|currentValue' "$RENOVATE_LOG"
```

## Agent report output
- Command run and script exit code.
- Path to the saved log (or the last relevant grep lines).
- On FAIL: likely cause (file pattern, typo in `matchStrings`, wrong `datasourceTemplate`).

## Risks
- First image pull needs network and time.
- `latest` may differ from the GitHub App Renovate version; pin a digest in docs or set `RENOVATE_IMAGE` if you need parity.
