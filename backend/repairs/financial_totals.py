"""Single source of truth for completion act / PDF money totals."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Sequence


@dataclass(frozen=True)
class CompletionFinancialTotals:
    labor_total: Decimal
    parts_client_total: Decimal
    parts_purchase_total: Decimal
    other_expenses_total: Decimal
    document_total: Decimal


def compute_completion_financial_totals(
    labor_prices: Sequence[Decimal | None],
    purchases: Sequence[Any],
) -> CompletionFinancialTotals:
    """
    Sum labor lines (optional price per line) + parts at client sale prices.
    """
    labor = Decimal("0")
    for p in labor_prices:
        if p is not None:
            labor += p
    parts_client = Decimal("0")
    parts_purchase = Decimal("0")
    for p in purchases:
        parts_client += Decimal(p.quantity) * Decimal(p.sale_price)
        parts_purchase += Decimal(p.quantity) * Decimal(p.purchase_price)
    other = Decimal("0")
    document_total = labor + parts_client
    return CompletionFinancialTotals(
        labor_total=labor,
        parts_client_total=parts_client,
        parts_purchase_total=parts_purchase,
        other_expenses_total=other,
        document_total=document_total,
    )
