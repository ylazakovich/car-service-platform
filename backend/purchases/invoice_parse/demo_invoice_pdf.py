"""
Build a small PDF invoice sample with a real **text layer** (no scan OCR needed).

Keep body text aligned with ``docs/samples/sample-invoice-pl-01-table-classic.txt``
so PDF upload matches plain-text behaviour in ``/invoice-parse/suggest/``.
"""

from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Preformatted, SimpleDocTemplate, Spacer

# Sync with docs/samples/sample-invoice-pl-01-table-classic.txt (embedded for Docker / CI).
DEMO_PL_TABLE_INVOICE_TEXT = """================================================================================
                    FAKTURA VAT — WZÓR A (klasyczna tabela ASCII)
================================================================================
Sprzedawca: AUTO-CZĘŚCI WZÓR SP. Z O.O.
            ul. Magazynowa 7, 01-234 Kraków
            NIP: PL9560000000 (numer fikcyjny — dokument testowy)

Nabywca:    SERWIS SAMOCHODOWY „DĘBOWA”
            ul. Dębowa 15, 50-001 Wrocław
            NIP: PL8990000001 (fikcyjny)

Nr faktury: FV/WZOR/A/2026/0088
Data wystawienia: 2026-04-10
Data sprzedaży: 2026-04-09
Forma płatności: przelew 14 dni
Waluta: PLN

--------------------------------------------------------------------------------
Lp | Nazwa towaru / usługi                    | Ilość | j.m. | Cena netto | Netto   | Stawka | VAT    | Brutto
---+------------------------------------------+-------+------+------------+---------+--------+--------+--------
 1 | Łożysko koła przód SKF (wzór)            |   2   | szt  |    55,40   |  110,80 |  23%   |  25,48 | 136,28
 2 | Zestaw paska rozrządu Gates (wzór)       |   1   | kpl  |   412,00   |  412,00 |  23%   |  94,76 | 506,76
 3 | Filtr powietrza Mann (wzór)              |   3   | szt  |    28,90   |   86,70 |  23%   |  19,94 | 106,64
--------------------------------------------------------------------------------
Suma netto: 609,50 PLN    Suma VAT: 140,18 PLN    Do zapłaty: 749,68 PLN
Słownie: siedemset czterdzieści dziewięć PLN 68/100

Uwagi: dokument wyłącznie do testów OCR / parsera — bez wartości prawnej.
================================================================================
"""


def _try_load_sample_from_repo() -> str | None:
    """When running from full monorepo checkout, prefer the tracked .txt file."""
    start = Path(__file__).resolve().parent
    for d in list(start.parents)[:8]:
        candidate = d / "docs" / "samples" / "sample-invoice-pl-01-table-classic.txt"
        if candidate.is_file():
            return candidate.read_text(encoding="utf-8")
    return None


def _register_unicode_font() -> str:
    """DejaVu Sans for Polish letters; fall back to Helvetica (ASCII-only risk)."""
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            pdfmetrics.registerFont(TTFont("DemoInvoiceFont", path))
            return "DemoInvoiceFont"
    return "Helvetica"


def load_sample_pl_table_classic_text() -> str:
    return (_try_load_sample_from_repo() or DEMO_PL_TABLE_INVOICE_TEXT).strip() + "\n"


def build_sample_pl_table_invoice_pdf_bytes(body: str | None = None) -> bytes:
    """
    PDF bytes for the PL pipe-table demo (text layer long enough to skip raster OCR).
    """
    text = (body if body is not None else load_sample_pl_table_classic_text()).strip() + "\n"
    font = _register_unicode_font()
    style = ParagraphStyle(
        "demo_invoice_pre",
        fontName=font,
        fontSize=6.5,
        leading=7.5,
    )
    buf = BytesIO()
    page = landscape(A4)
    doc = SimpleDocTemplate(
        buf,
        pagesize=page,
        leftMargin=8 * mm,
        rightMargin=8 * mm,
        topMargin=8 * mm,
        bottomMargin=8 * mm,
    )
    story = [
        Preformatted(text, style),
        Spacer(1, 3 * mm),
    ]
    doc.build(story)
    out = buf.getvalue()
    if not out.startswith(b"%PDF"):
        raise RuntimeError("reportlab did not produce a PDF")
    return out
