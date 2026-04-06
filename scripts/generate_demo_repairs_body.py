#!/usr/bin/env python3
"""
Regenerate demo/demo_repairs_body.sql from a legacy demo_data.sql that still contains
the old `INSERT INTO repairs (... tracking_code ...)` block.

Usage (from repo root):
  python3 scripts/generate_demo_repairs_body.py path/to/legacy_demo_data.sql

The current demo/demo_data.sql is already assembled; keep a git-stashed copy of the
legacy file if you need to re-run this after editing historical repair rows.
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

MULTI_SCENARIOS = [
    {
        "tracking": "TOR-MV-001",
        "plate": "BH 5566 FF",
        "tasks": [
            (
                "Timing belt + water pump replacement",
                "Kit ordered — Gates KP15633XS. Vehicle stays until tensioner arrives.",
                "waiting_parts",
                None,
                119800,
                "2026-03-08 08:00:00+00",
            ),
            (
                "EGR valve cleaning",
                "Post-belt job: DPF light after long idle. EGR service bundled on same visit.",
                "in_progress",
                None,
                119800,
                "2026-03-08 09:30:00+00",
            ),
            (
                "Oil change + air filter",
                "Express lube added to same workshop visit.",
                "new",
                None,
                None,
                "2026-03-08 10:00:00+00",
            ),
        ],
    },
    {
        "tracking": "TOR-MV-002",
        "plate": "KA 4321 EE",
        "tasks": [
            (
                "Engine diagnostics",
                "CEL intermittent. Logging live data during road test.",
                "in_progress",
                None,
                31000,
                "2026-03-10 11:00:00+00",
            ),
            (
                "AC system diagnostics and re-gas",
                "Customer asked to bundle AC check with diagnostics slot.",
                "new",
                None,
                None,
                "2026-03-10 11:15:00+00",
            ),
        ],
    },
    {
        "tracking": "TOR-MV-003",
        "plate": "AA 1234 BB",
        "tasks": [
            (
                "Brake system service",
                "Front discs + pads done this week on same visit.",
                "completed",
                "2026-03-04",
                93120,
                "2026-03-03 08:30:00+00",
            ),
            (
                "Tire rotation and balancing",
                "Rotation after brake job — same TOR for client portal.",
                "new",
                None,
                93120,
                "2026-03-03 14:00:00+00",
            ),
        ],
    },
    {
        "tracking": "TOR-MV-004",
        "plate": "BH 1122 PP",
        "tasks": [
            (
                "Oil change — 5W-30 commercial",
                "Fleet van: scheduled oil at bay 2.",
                "completed",
                "2026-03-21",
                208450,
                "2026-03-20 07:00:00+00",
            ),
            (
                "Brake pads — full axle replacement",
                "Same visit — pads worn on front and rear.",
                "completed",
                "2026-03-21",
                208450,
                "2026-03-20 07:30:00+00",
            ),
            (
                "Transmission fluid change",
                "Optional gearbox fluid while van is on lift.",
                "completed",
                "2026-03-21",
                208450,
                "2026-03-20 08:00:00+00",
            ),
        ],
    },
]


def portal_token(tor: str) -> str:
    return hashlib.sha256(tor.encode()).hexdigest()[:40]


def esc(s: str) -> str:
    return s.replace("'", "''")


def parse_legacy_repairs(text: str) -> list[dict]:
    start = text.index("INSERT INTO repairs")
    end = text.index("ON CONFLICT (tracking_code)", start)
    block = text[start:end]
    rows_raw: list[str] = []
    buf: list[str] = []
    depth = 0
    for line in block.splitlines():
        s = line.strip()
        if not s or s.startswith("--") or s.startswith("INSERT"):
            continue
        for ch in s:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
        buf.append(s)
        if depth == 0 and buf:
            joined = " ".join(buf)
            if "license_plate" in joined:
                rows_raw.append(joined)
            buf = []
    pat = re.compile(
        r"license_plate = '([^']+)'\)\s*,\s*NULL\s*,\s*'((?:[^']|'')*)'\s*,\s*'((?:[^']|'')*)'\s*,\s*"
        r"'(completed|new|in_progress|waiting_parts)'\s*,\s*'(TOR-\d+)'",
        re.S,
    )
    rest_pat = re.compile(r",\s*(NULL|'[^']+'),\s*(NULL|\d+),\s*'([^']+)'\s*,\s*NOW\(\)\s*\)")
    rows: list[dict] = []
    for r in rows_raw:
        m = pat.search(r)
        if not m:
            raise ValueError("bad row " + r[:120])
        plate, svc, issue, st, tor = m.groups()
        m2 = rest_pat.search(r, m.end())
        if not m2:
            raise ValueError("bad rest " + r[:200])
        ca_raw, mileage_raw, created = m2.groups()
        completed_at = None if ca_raw == "NULL" else ca_raw.strip("'")
        mileage = None if mileage_raw == "NULL" else int(mileage_raw)
        rows.append(
            {
                "tor": tor,
                "plate": plate,
                "service": svc.replace("''", "'"),
                "issue": issue.replace("''", "'"),
                "status": st,
                "completed_at": completed_at,
                "mileage": mileage,
                "created": created,
            }
        )
    return rows


def emit_sql(rows: list[dict]) -> str:
    lines: list[str] = ["-- Generated by scripts/generate_demo_repairs_body.py\n"]
    for r in rows:
        tor = r["tor"]
        comp = "NULL" if r["completed_at"] is None else f"'{r['completed_at']}'::date"
        lines.append(
            f"INSERT INTO repair_visits (vehicle_id, tracking_code, portal_token, completed_at, created_at, updated_at)\n"
            f"SELECT id, '{esc(tor)}', '{portal_token(tor)}', {comp}, '{r['created']}'::timestamptz, NOW()\n"
            f"FROM vehicles WHERE license_plate = '{esc(r['plate'])}';\n"
        )
    for m in MULTI_SCENARIOS:
        tor = m["tracking"]
        plate = m["plate"]
        all_done = all(t[3] for t in m["tasks"])
        visit_comp = "NULL"
        if all_done:
            dates = [t[3] for t in m["tasks"] if t[3]]
            visit_comp = f"'{max(dates)}'::date"
        lines.append(
            f"INSERT INTO repair_visits (vehicle_id, tracking_code, portal_token, completed_at, created_at, updated_at)\n"
            f"SELECT id, '{tor}', '{portal_token(tor)}', {visit_comp}, NOW(), NOW()\n"
            f"FROM vehicles WHERE license_plate = '{esc(plate)}';\n"
        )
        for i, (svc, issue, st, comp, mileage, cr) in enumerate(m["tasks"]):
            comp_sql = "NULL" if comp is None else f"'{comp}'::date"
            mileage_sql = "NULL" if mileage is None else str(mileage)
            lines.append(
                "INSERT INTO repairs (visit_id, vehicle_id, master_id, service_name, issue_notes, status, "
                "completed_at, mileage_at_service, position, created_at, updated_at)\n"
                f"SELECT v.id, v.vehicle_id, NULL, '{esc(svc)}', '{esc(issue)}', '{st}', {comp_sql}, {mileage_sql}, {i}, "
                f"'{cr}'::timestamptz, NOW()\n"
                f"FROM repair_visits v WHERE v.tracking_code = '{tor}';\n"
            )
    for r in rows:
        comp_sql = "NULL" if r["completed_at"] is None else f"'{r['completed_at']}'::date"
        mileage_sql = "NULL" if r["mileage"] is None else str(r["mileage"])
        lines.append(
            "INSERT INTO repairs (visit_id, vehicle_id, master_id, service_name, issue_notes, status, "
            "completed_at, mileage_at_service, position, created_at, updated_at)\n"
            f"SELECT v.id, v.vehicle_id, NULL, '{esc(r['service'])}', '{esc(r['issue'])}', '{r['status']}', "
            f"{comp_sql}, {mileage_sql}, NULL, '{r['created']}'::timestamptz, NOW()\n"
            f"FROM repair_visits v WHERE v.tracking_code = '{esc(r['tor'])}';\n"
        )
    return "".join(lines)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: generate_demo_repairs_body.py <legacy_demo_data.sql>", file=sys.stderr)
        sys.exit(1)
    legacy_path = Path(sys.argv[1])
    text = legacy_path.read_text()
    rows = parse_legacy_repairs(text)
    out = Path(__file__).resolve().parent.parent / "demo" / "demo_repairs_body.sql"
    out.write_text(emit_sql(rows))
    print(f"Wrote {out} ({len(rows)} legacy visits + multi-task scenarios)")


if __name__ == "__main__":
    main()
