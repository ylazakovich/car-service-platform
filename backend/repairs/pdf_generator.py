from __future__ import annotations

import os
from decimal import Decimal
from io import BytesIO
from typing import Any, Sequence

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .financial_totals import compute_completion_financial_totals

BLACK = colors.HexColor("#111111")
DARK_GRAY = colors.HexColor("#333333")
MID_GRAY = colors.HexColor("#888888")
LIGHT_GRAY = colors.HexColor("#f2f2f2")
BORDER = colors.HexColor("#cccccc")
WHITE = colors.white


def _register_font() -> str:
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    ]
    for path in font_paths:
        if os.path.exists(path):
            pdfmetrics.registerFont(TTFont("AppFont", path))
            return "AppFont"
    return "Helvetica"


def _styles(font: str) -> dict[str, ParagraphStyle]:
    return {
        "title": ParagraphStyle(
            "title", fontName=font, fontSize=20, leading=24,
            textColor=BLACK, spaceAfter=0,
        ),
        "doc_id": ParagraphStyle(
            "doc_id", fontName=font, fontSize=18, leading=22,
            textColor=BLACK, alignment=2,
        ),
        "info_label": ParagraphStyle(
            "info_label", fontName=font, fontSize=8, leading=12,
            textColor=MID_GRAY,
        ),
        "info_value": ParagraphStyle(
            "info_value", fontName=font, fontSize=10, leading=14,
            textColor=BLACK,
        ),
        "section": ParagraphStyle(
            "section", fontName=font, fontSize=8, leading=11,
            textColor=MID_GRAY, spaceBefore=8, spaceAfter=3,
        ),
        "th": ParagraphStyle(
            "th", fontName=font, fontSize=9, leading=12,
            textColor=WHITE,
        ),
        "td": ParagraphStyle(
            "td", fontName=font, fontSize=10, leading=14,
            textColor=BLACK,
        ),
        "td_right": ParagraphStyle(
            "td_right", fontName=font, fontSize=10, leading=14,
            textColor=BLACK, alignment=2,
        ),
        "subtotal": ParagraphStyle(
            "subtotal", fontName=font, fontSize=10, leading=14,
            textColor=BLACK, alignment=2,
        ),
        "total": ParagraphStyle(
            "total", fontName=font, fontSize=13, leading=17,
            textColor=BLACK, alignment=2,
        ),
        "footer": ParagraphStyle(
            "footer", fontName=font, fontSize=8, leading=11,
            textColor=MID_GRAY, alignment=1,
        ),
    }


def _format_date(val: Any) -> str:
    if val is None:
        return "—"
    return val.strftime("%d.%m.%Y")


def _master_name(repair: Any) -> str:
    if repair.master is None:
        return "—"
    parts = [repair.master.first_name, repair.master.last_name]
    name = " ".join(p for p in parts if p).strip()
    return name or repair.master.email


def _fmt(amount: Any) -> str:
    return f"{amount:,.2f} PLN"


def _top_block(repair: Any, font: str, width: float) -> Table:
    s = _styles(font)
    left = Paragraph("CERTIFICATE<br/>OF COMPLETION", s["title"])
    right = Paragraph(f"<b>{repair.tracking_code}</b>", s["doc_id"])
    t = Table([[left, right]], colWidths=[width * 0.6, width * 0.4])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def _divider(width: float) -> Table:
    t = Table([[""]], colWidths=[width])
    t.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 1.5, BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def _info_block(repair: Any, font: str, width: float) -> Table:
    s = _styles(font)
    vehicle = repair.vehicle
    vehicle_text = f"{vehicle.license_plate} \u2022 {vehicle.make} {vehicle.model}"

    def row(label: str, value: str) -> list:
        return [Paragraph(label, s["info_label"]), Paragraph(value, s["info_value"])]

    data = [
        row("VEHICLE", vehicle_text),
        row("CLIENT", vehicle.customer.full_name),
        row("MASTER", _master_name(repair)),
        row("DATE CREATED", _format_date(repair.created_at)),
        row("DATE COMPLETED", _format_date(repair.completed_at)),
    ]

    col_l = 32 * mm
    col_v = width * 0.55 - col_l
    padding = width * 0.45

    rows_with_padding = [[d[0], d[1], Paragraph("", s["info_label"])] for d in data]
    t = Table(rows_with_padding, colWidths=[col_l, col_v, padding])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (1, -1), 0.3, BORDER),
    ]))
    return t


def _items_table(
    labor_rows: Sequence[tuple[str, Decimal | None]],
    purchases: Sequence[Any],
    font: str,
    width: float,
) -> tuple[Table, Decimal]:
    s = _styles(font)

    def th(text: str) -> Paragraph:
        return Paragraph(text, s["th"])

    def td(text: str) -> Paragraph:
        return Paragraph(text, s["td"])

    def td_r(text: str) -> Paragraph:
        return Paragraph(text, s["td_right"])

    headers = [th("Description"), th("Qty"), th("Price"), th("Total")]
    data = [headers]

    purchase_list = list(purchases)
    labor_prices = [p for _name, p in labor_rows]
    totals = compute_completion_financial_totals(labor_prices, purchase_list)
    grand_total = totals.document_total

    for service_name, service_price in labor_rows:
        if service_price is not None:
            svc_price_str = _fmt(service_price)
            svc_total_str = _fmt(service_price)
        else:
            svc_price_str = "—"
            svc_total_str = "—"
        data.append([td(service_name or "—"), td_r("1"), td_r(svc_price_str), td_r(svc_total_str)])
    for p in purchase_list:
        line_total = p.quantity * p.sale_price
        data.append([
            td(p.part_name),
            td_r(str(p.quantity)),
            td_r(_fmt(p.sale_price)),
            td_r(_fmt(line_total)),
        ])

    last_row = len(data) - 1

    col_widths = [width - 75 * mm, 15 * mm, 30 * mm, 30 * mm]
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GRAY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, last_row), 0.3, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, last_row), [WHITE, LIGHT_GRAY]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t, grand_total


def _total_block(total: Decimal, font: str, width: float) -> Table:
    s = _styles(font)
    cell = Paragraph(f"<b>TOTAL DUE: {_fmt(total)}</b>", s["total"])
    t = Table([[cell]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("LINEABOVE", (0, 0), (-1, 0), 1.5, BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def generate_completion_act_pdf(
    repair: Any,
    purchases: Sequence[Any],
    labor_rows: Sequence[tuple[str, Decimal | None]],
) -> bytes:
    buffer = BytesIO()
    font = _register_font()

    page_w, _ = A4
    margin = 20 * mm
    width = page_w - 2 * margin

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=margin,
        bottomMargin=margin,
    )

    s = _styles(font)
    story = [
        _top_block(repair, font, width),
        Spacer(1, 3 * mm),
        _divider(width),
        Spacer(1, 6 * mm),
        _info_block(repair, font, width),
        Spacer(1, 8 * mm),
        Paragraph("SERVICES &amp; PARTS", s["section"]),
    ]

    items_tbl, grand_total = _items_table(
        list(labor_rows),
        list(purchases),
        font,
        width,
    )
    story.append(items_tbl)
    story.append(Spacer(1, 5 * mm))
    story.append(_total_block(grand_total, font, width))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph(
        "All work has been completed in full and accepted by the customer.",
        s["footer"],
    ))

    doc.build(story)
    return buffer.getvalue()
