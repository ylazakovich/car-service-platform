"""Keep Repair.service_name in sync with RepairServiceLine rows (search, legacy fields)."""

from __future__ import annotations

from .models import Repair, RepairServiceLine


def sync_repair_service_name(repair_id: int) -> None:
    names = list(
        RepairServiceLine.objects.filter(repair_id=repair_id)
        .order_by("sort_order", "id")
        .values_list("name", flat=True)
    )
    joined = "; ".join((n or "").strip() for n in names if (n or "").strip())
    Repair.objects.filter(pk=repair_id).update(service_name=joined or "")
