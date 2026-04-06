"""Generate and persist completion PDF + financial snapshot for a repair visit."""

from __future__ import annotations

from typing import TYPE_CHECKING

from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Max

from purchases.models import Purchase
from services.models import Service

from .financial_totals import compute_completion_financial_totals_multi
from .models import Repair, RepairDocument, RepairFinancialSnapshot, RepairVisit
from .pdf_generator import generate_completion_act_pdf

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser


def get_latest_visit_document(visit: RepairVisit) -> RepairDocument | None:
    return RepairDocument.objects.filter(visit_id=visit.pk).order_by("-version", "-id").first()


def _visit_tasks_completed(visit: RepairVisit) -> bool:
    tasks = list(visit.repairs.all())
    return bool(tasks) and all(t.status == Repair.Status.COMPLETED for t in tasks)


@transaction.atomic
def export_visit_pdf_and_snapshot(visit: RepairVisit, user: AbstractBaseUser) -> tuple[bytes, RepairDocument]:
    """
    Build PDF bytes, write RepairDocument + RepairFinancialSnapshot under row lock on visit.
    Requires every child Repair to be completed.
    """
    visit_locked = RepairVisit.objects.select_for_update().get(pk=visit.pk)
    if not _visit_tasks_completed(visit_locked):
        raise ValueError("All visit tasks must be completed before exporting the act.")

    max_v = RepairDocument.objects.filter(visit_id=visit_locked.pk).aggregate(m=Max("version")).get("m")
    version = (max_v or 0) + 1

    purchases = list(
        Purchase.objects.filter(repair_code=visit_locked.tracking_code).select_related("supplier")
    )
    tasks = list(visit_locked.repairs.all().order_by("id"))
    labor_lines: list[tuple[str, object | None]] = []
    service_prices: list[object | None] = []
    for t in tasks:
        svc = Service.objects.filter(name=t.service_name).first()
        price = svc.price if svc and svc.price is not None else None
        labor_lines.append((t.service_name, price))
        service_prices.append(price)

    financials = compute_completion_financial_totals_multi(service_prices, purchases)
    pdf_bytes = generate_completion_act_pdf(visit_locked, labor_lines, purchases)

    filename = f"act_{visit_locked.tracking_code}.pdf"
    doc = RepairDocument(
        visit=visit_locked,
        version=version,
        original_filename=filename,
        exported_by=user,
    )
    doc.file.save(f"v{version}.pdf", ContentFile(pdf_bytes), save=True)

    RepairFinancialSnapshot.objects.create(
        visit=visit_locked,
        document=doc,
        labor_total=financials.labor_total,
        parts_client_total=financials.parts_client_total,
        parts_purchase_total=financials.parts_purchase_total,
        other_expenses_total=financials.other_expenses_total,
        document_total=financials.document_total,
    )
    return pdf_bytes, doc
