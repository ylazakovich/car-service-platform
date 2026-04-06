"""Resolve catalog-backed labor unit prices for repair service lines (PDF / totals)."""

from __future__ import annotations

from decimal import Decimal

from services.models import Service

from .models import Repair, RepairServiceLine


def unit_price_for_line(line: RepairServiceLine) -> Decimal | None:
    if line.catalog_service_id and line.catalog_service is not None and line.catalog_service.price is not None:
        return line.catalog_service.price
    svc = Service.objects.filter(name=line.name).first()
    if svc and svc.price is not None:
        return svc.price
    return None


def build_labor_rows_for_pdf(repair: Repair) -> list[tuple[str, Decimal | None]]:
    lines = list(
        RepairServiceLine.objects.filter(repair_id=repair.pk)
        .select_related("catalog_service")
        .order_by("sort_order", "id")
    )
    rows: list[tuple[str, Decimal | None]] = []
    for line in lines:
        rows.append((line.name, unit_price_for_line(line)))
    if not rows and repair.service_name:
        svc = Service.objects.filter(name=repair.service_name).first()
        price = svc.price if svc and svc.price is not None else None
        rows.append((repair.service_name, price))
    return rows
