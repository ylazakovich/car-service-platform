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
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

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
            pdfmetrics.registerFont(TTFont("PoFont", path))
            return "PoFont"
    return "Helvetica"


def _styles(font: str) -> dict[str, ParagraphStyle]:
    return {
        "title": ParagraphStyle("title", fontName=font, fontSize=21, leading=25, textColor=BLACK),
        "meta": ParagraphStyle("meta", fontName=font, fontSize=9, leading=13, textColor=MID_GRAY),
        "label": ParagraphStyle("label", fontName=font, fontSize=8, leading=11, textColor=MID_GRAY),
        "value": ParagraphStyle("value", fontName=font, fontSize=10, leading=14, textColor=BLACK),
        "section": ParagraphStyle("section", fontName=font, fontSize=8, leading=11, textColor=MID_GRAY),
        "th": ParagraphStyle("th", fontName=font, fontSize=9, leading=12, textColor=WHITE),
        "td": ParagraphStyle("td", fontName=font, fontSize=9, leading=13, textColor=BLACK),
        "td_right": ParagraphStyle("td_right", fontName=font, fontSize=9, leading=13, textColor=BLACK, alignment=2),
        "total": ParagraphStyle("total", fontName=font, fontSize=13, leading=17, textColor=BLACK, alignment=2),
        "footer": ParagraphStyle("footer", fontName=font, fontSize=8, leading=11, textColor=MID_GRAY, alignment=1),
    }


def _fmt_money(amount: Decimal) -> str:
    return f"{amount:,.2f} PLN"


def _fmt_date(value: Any) -> str:
    if value is None:
        return "-"
    return value.strftime("%d.%m.%Y")


def _divider(width: float) -> Table:
    table = Table([[""]], colWidths=[width])
    table.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 1.5, BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def _top_block(payload: dict[str, Any], font: str, width: float) -> Table:
    s = _styles(font)
    left = Paragraph("PURCHASE ORDER", s["title"])
    right = Paragraph(f"Order date<br/><b>{_fmt_date(payload['order_date'])}</b>", s["meta"])
    table = Table([[left, right]], colWidths=[width * 0.64, width * 0.36])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return table


def _info_block(payload: dict[str, Any], font: str, width: float) -> Table:
    s = _styles(font)
    delivery = _fmt_date(payload.get("approximate_delivery_date"))
    supplier_nip = (payload.get("supplier_nip") or "").strip() or "-"
    registered_address = (payload.get("supplier_registered_address") or "").strip() or "-"
    rows = [
        [Paragraph("SUPPLIER", s["label"]), Paragraph(payload["supplier_name"], s["value"])],
        [Paragraph("NIP", s["label"]), Paragraph(supplier_nip, s["value"])],
        [Paragraph("REG. ADDRESS", s["label"]), Paragraph(registered_address, s["value"])],
        [Paragraph("REQUESTED DELIVERY", s["label"]), Paragraph(delivery, s["value"])],
    ]
    table = Table(rows, colWidths=[42 * mm, width - 42 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _items_table(lines: Sequence[dict[str, Any]], font: str, width: float) -> tuple[Table, Decimal]:
    s = _styles(font)

    def th(text: str) -> Paragraph:
        return Paragraph(text, s["th"])

    def td(text: str) -> Paragraph:
        return Paragraph(text, s["td"])

    def td_r(text: str) -> Paragraph:
        return Paragraph(text, s["td_right"])

    data = [[th("Item"), th("Qty"), th("Unit"), th("Unit cost"), th("Total")]]
    grand_total = Decimal("0")

    for line in lines:
        quantity = Decimal(str(line["quantity"]))
        unit_cost = line["purchase_price"]
        line_total = quantity * unit_cost
        grand_total += line_total
        uom = line.get("unit_of_measure")
        unit_label = getattr(uom, "code", "") or "pcs"
        data.append([
            td(line["part_name"]),
            td_r(f"{quantity:g}"),
            td(unit_label),
            td_r(_fmt_money(unit_cost)),
            td_r(_fmt_money(line_total)),
        ])

    col_widths = [width - 89 * mm, 15 * mm, 18 * mm, 28 * mm, 28 * mm]
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK_GRAY),
        ("GRID", (0, 0), (-1, -1), 0.3, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table, grand_total


def _total_block(total: Decimal, font: str, width: float) -> Table:
    s = _styles(font)
    cell = Paragraph(f"<b>ORDER TOTAL: {_fmt_money(total)}</b>", s["total"])
    table = Table([[cell]], colWidths=[width])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("LINEABOVE", (0, 0), (-1, 0), 1.5, BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    return table


def generate_purchase_order_pdf(payload: dict[str, Any]) -> bytes:
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
        _top_block(payload, font, width),
        Spacer(1, 3 * mm),
        _divider(width),
        Spacer(1, 6 * mm),
        _info_block(payload, font, width),
        Spacer(1, 8 * mm),
        Paragraph("ORDER LINES", s["section"]),
    ]
    items, total = _items_table(payload["lines"], font, width)
    story.append(items)
    story.append(Spacer(1, 5 * mm))
    story.append(_total_block(total, font, width))

    doc.build(story)
    return buffer.getvalue()
