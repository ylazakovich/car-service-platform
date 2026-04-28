#!/usr/bin/env python3
"""Write ``docs/samples/sample-invoice-pl-01-demo.pdf`` (text-layer demo invoice)."""

from __future__ import annotations

import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "samples" / "sample-invoice-pl-01-demo.pdf"

_MOD_PATH = ROOT / "backend" / "purchases" / "invoice_parse" / "demo_invoice_pdf.py"
_ns = runpy.run_path(str(_MOD_PATH), run_name="__main__")
build_sample_pl_table_invoice_pdf_bytes = _ns["build_sample_pl_table_invoice_pdf_bytes"]


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = build_sample_pl_table_invoice_pdf_bytes()
    OUT.write_bytes(data)
    print(f"Wrote {OUT} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
