"""Generate and persist completion PDF + financial snapshot for a repair."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Max

from purchases.models import Purchase

from .financial_totals import compute_completion_financial_totals
from .labor_pricing import build_labor_rows_for_pdf
from .models import Repair, RepairDocument, RepairFinancialSnapshot
from .pdf_generator import generate_completion_act_pdf

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser


def get_latest_repair_document(repair: Repair) -> RepairDocument | None:
    return RepairDocument.objects.filter(repair_id=repair.pk).order_by("-version", "-id").first()


@transaction.atomic
def export_repair_pdf_and_snapshot(repair: Repair, user: AbstractBaseUser) -> tuple[bytes, RepairDocument]:
    """
    Build PDF bytes, write RepairDocument + RepairFinancialSnapshot under row lock on repair.
    """
    repair_locked = Repair.objects.select_for_update().get(pk=repair.pk)
    max_v = RepairDocument.objects.filter(repair_id=repair_locked.pk).aggregate(m=Max("version")).get("m")
    version = (max_v or 0) + 1

    purchases = list(
        Purchase.objects.filter(repair_code=repair_locked.tracking_code)
        .exclude(is_shop_consumable=True)
        .select_related("supplier", "unit_of_measure")
    )
    labor_rows = build_labor_rows_for_pdf(repair_locked)
    labor_prices = [price for _name, price in labor_rows]

    financials = compute_completion_financial_totals(labor_prices, purchases)
    pdf_bytes = generate_completion_act_pdf(repair_locked, purchases, labor_rows)

    filename = f"act_{repair_locked.tracking_code}.pdf"
    doc = RepairDocument(
        repair=repair_locked,
        version=version,
        original_filename=filename,
        exported_by=user,
    )
    doc.file.save(f"v{version}.pdf", ContentFile(pdf_bytes), save=True)

    RepairFinancialSnapshot.objects.create(
        repair=repair_locked,
        document=doc,
        labor_total=financials.labor_total,
        parts_client_total=financials.parts_client_total,
        parts_purchase_total=financials.parts_purchase_total,
        other_expenses_total=financials.other_expenses_total,
        document_total=financials.document_total,
    )
    return pdf_bytes, doc
