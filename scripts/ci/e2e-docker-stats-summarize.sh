#!/usr/bin/env bash
# Build docker-metrics/summary.json + GitHub step summary from samples.tsv (CI E2E).
set -euo pipefail

OUT_DIR="${DOCKER_METRICS_DIR:-docker-metrics}"
TSV="${DOCKER_STATS_LOG:-$OUT_DIR/samples.tsv}"
SUMMARY_JSON="$OUT_DIR/summary.json"

if [[ ! -s "$TSV" ]]; then
  echo "No samples at $TSV; skipping summary." >&2
  mkdir -p "$OUT_DIR"
  echo '{"error":"no_samples","path":"'"$TSV"'"}' >"$SUMMARY_JSON"
  exit 0
fi

python3 - "$TSV" "$SUMMARY_JSON" <<'PY'
import csv
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

tsv_path, json_path = sys.argv[1], sys.argv[2]

def parse_pct(s: str) -> Optional[float]:
    s = (s or "").strip().replace("%", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_docker_mem_usage_to_mib(raw: str) -> Optional[float]:
    """First segment of docker stats MemUsage, e.g. '245MiB / 7.653GiB' -> MiB."""
    part = (raw or "").split("/")[0].strip()
    if not part:
        return None
    m = re.match(r"^([\d.]+)\s*(B|KiB|MiB|GiB|TiB)\s*$", part, re.I)
    if not m:
        return None
    val = float(m.group(1))
    unit = m.group(2).lower()
    to_mib = {
        "b": 1.0 / 1024 / 1024,
        "kib": 1.0 / 1024,
        "mib": 1.0,
        "gib": 1024.0,
        "tib": 1024.0 * 1024,
    }
    mult = to_mib.get(unit)
    if mult is None:
        return None
    return val * mult


rows = []
with open(tsv_path, newline="") as f:
    r = csv.DictReader(f, delimiter="\t")
    for row in r:
        rows.append(row)

by_name: dict[str, list[tuple[Optional[float], Optional[float], Optional[float]]]] = defaultdict(list)
timestamps: list[str] = []
for row in rows:
    ts = (row.get("timestamp_iso") or "").strip()
    if ts:
        timestamps.append(ts)
    name = (row.get("container") or "").strip()
    if not name:
        continue
    cpu = parse_pct(row.get("cpu_percent") or "")
    mem = parse_pct(row.get("mem_percent") or "")
    mib = parse_docker_mem_usage_to_mib(row.get("mem_usage_raw") or "")
    by_name[name].append((cpu, mem, mib))

containers = []
for name, triples in sorted(by_name.items()):
    cpus = [c for c, _, _ in triples if c is not None]
    mems = [m for _, m, _ in triples if m is not None]
    mibs = [x for *_, x in triples if x is not None]
    entry = {"name": name, "sample_count": len(triples)}
    if cpus:
        entry["cpu_percent"] = {
            "avg": round(sum(cpus) / len(cpus), 3),
            "max": round(max(cpus), 3),
        }
    if mems:
        entry["mem_percent"] = {
            "avg": round(sum(mems) / len(mems), 3),
            "max": round(max(mems), 3),
        }
    if mibs:
        entry["mem_used_mib"] = {
            "avg": round(sum(mibs) / len(mibs), 2),
            "max": round(max(mibs), 2),
        }
    containers.append(entry)

interval = int(__import__("os").environ.get("DOCKER_STATS_INTERVAL", "5") or "5")
meta = {
    "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "github": {
        "run_id": __import__("os").environ.get("GITHUB_RUN_ID", ""),
        "run_attempt": __import__("os").environ.get("GITHUB_RUN_ATTEMPT", ""),
        "sha": __import__("os").environ.get("GITHUB_SHA", ""),
        "workflow": __import__("os").environ.get("GITHUB_WORKFLOW", ""),
        "ref": __import__("os").environ.get("GITHUB_REF", ""),
    },
    "window": {
        "interval_sec": interval,
        "row_count": len(rows),
        "first_ts": min(timestamps) if timestamps else "",
        "last_ts": max(timestamps) if timestamps else "",
    },
    "containers": containers,
}

with open(json_path, "w", encoding="utf-8") as out:
    json.dump(meta, out, indent=2)
    out.write("\n")
PY

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]] && [[ -f "$SUMMARY_JSON" ]]; then
  {
    echo "### Docker stack utilization (E2E window)"
    echo ""
    echo "Artifact: \`docker-resource-metrics-e2e\` → \`docker-metrics/summary.json\` + raw \`samples.tsv\`."
    echo ""
    python3 - "$SUMMARY_JSON" <<'PY'
import json, sys
p = sys.argv[1]
with open(p, encoding="utf-8") as f:
    d = json.load(f)
if d.get("error"):
    print("_No samples collected._")
    sys.exit(0)
w = d.get("window", {})
gh = d.get("github", {})
sha = gh.get("sha") or ""
short_sha = sha[:7] if sha else ""
print(f"- **Samples:** {w.get('row_count', 0)} rows (~every {w.get('interval_sec', '?')}s)")
print(f"- **Window:** `{w.get('first_ts', '')}` → `{w.get('last_ts', '')}`")
print(f"- **Run:** `{gh.get('run_id', '')}` attempt `{gh.get('run_attempt', '')}` · **SHA** `{short_sha}`")
print("")
print("_Mem % is share of the **runner host** RAM (not a 2 GiB cap). `mem_used_mib` is the first value from `docker stats` MemUsage (RSS-ish usage in the container cgroup)._")
print("")
print("| Container | CPU % max | CPU % avg | Mem % max | Mem % avg | Mem used max (MiB) | Mem used avg (MiB) |")
print("|-----------|-----------|-----------|-----------|-----------|--------------------|--------------------|")
for c in d.get("containers", []):
    name = c.get("name", "")
    cpu = c.get("cpu_percent") or {}
    mem = c.get("mem_percent") or {}
    mm = c.get("mem_used_mib") or {}
    print(
        f"| `{name}` | {cpu.get('max', '—')} | {cpu.get('avg', '—')} | "
        f"{mem.get('max', '—')} | {mem.get('avg', '—')} | "
        f"{mm.get('max', '—')} | {mm.get('avg', '—')} |"
    )
PY
  } >>"$GITHUB_STEP_SUMMARY"
fi

echo "Wrote $SUMMARY_JSON"
