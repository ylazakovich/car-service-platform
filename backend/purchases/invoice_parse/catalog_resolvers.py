"""Resolve OCR / regex snippets to Supplier and UnitOfMeasure catalog rows (in-house, no LLM)."""

from __future__ import annotations

import re
from difflib import get_close_matches
from typing import Any, TypedDict

from django.db.models import QuerySet

from ..models import Supplier, SupplierAlias, UnitOfMeasure


def _compact_lower(s: str) -> str:
    return " ".join(s.lower().split())


# Polish (and common) tokens → UnitOfMeasure.code in this project (see migration 0006).
UOM_SYNONYM_TO_CODE: dict[str, str] = {
    "szt": "pcs",
    "sztuka": "pcs",
    "sztuki": "pcs",
    "sztuk": "pcs",
    "kpl": "set",
    "komplet": "set",
    "zestaw": "set",
    "kompl": "set",
    "litr": "L",
    "litry": "L",
    "l": "L",
    "kg": "kg",
    "kilogram": "kg",
    "kilogramy": "kg",
    "para": "pair",
    "pary": "pair",
    "metr": "m",
    "metry": "m",
    "m": "m",
    "szt.": "pcs",
}


class SupplierResolution(TypedDict, total=False):
    raw_name: str | None
    supplier_id: int | None
    resolved_name: str | None
    match: str
    candidates: list[dict[str, Any]]


class UomResolution(TypedDict, total=False):
    raw: str | None
    unit_of_measure_id: int | None
    unit_of_measure_code: str | None
    unit_of_measure_name: str | None
    match: str


def resolve_supplier_name(raw_name: str | None, *, queryset: QuerySet[Supplier] | None = None) -> SupplierResolution:
    """
    Match supplier string to catalog: exact name, saved aliases, normalized name, then fuzzy (difflib).

    ``match``: exact | alias | normalized | fuzzy | ambiguous | none
    """
    out: SupplierResolution = {"raw_name": None, "supplier_id": None, "resolved_name": None, "match": "none"}
    if raw_name is None or not str(raw_name).strip():
        return out

    cleaned = str(raw_name).strip()
    out["raw_name"] = cleaned[:255]
    ckey = _compact_lower(cleaned)

    qs = queryset if queryset is not None else Supplier.objects.all()
    hit = qs.filter(name__iexact=cleaned).first()
    if hit:
        out["supplier_id"] = hit.id
        out["resolved_name"] = hit.name
        out["match"] = "exact"
        return out

    alias_row = SupplierAlias.objects.select_related("supplier").filter(normalized_key=ckey).first()
    if alias_row:
        sup = alias_row.supplier
        if qs.filter(pk=sup.pk).exists():
            out["supplier_id"] = sup.id
            out["resolved_name"] = sup.name
            out["match"] = "alias"
            return out

    names = list(qs.values_list("id", "name", flat=False))
    if not names:
        return out

    by_lower: dict[str, tuple[int, str]] = {}
    for pk, name in names:
        key = _compact_lower(name)
        if key not in by_lower:
            by_lower[key] = (pk, name)

    if ckey in by_lower:
        pk, name = by_lower[ckey]
        out["supplier_id"] = pk
        out["resolved_name"] = name
        out["match"] = "normalized"
        return out

    choice_names = [n for _, n in names]
    matches = get_close_matches(cleaned, choice_names, n=5, cutoff=0.88)
    if len(matches) == 1:
        hit = qs.filter(name=matches[0]).first()
        if hit:
            out["supplier_id"] = hit.id
            out["resolved_name"] = hit.name
            out["match"] = "fuzzy"
            return out

    if len(matches) > 1:
        candidates: list[dict[str, Any]] = []
        for m in matches:
            sup = qs.filter(name=m).first()
            if sup:
                candidates.append({"id": sup.id, "name": sup.name})
        out["match"] = "ambiguous"
        out["candidates"] = candidates[:8]
        return out

    return out


def resolve_uom_token(
    raw: str | None,
    *,
    queryset: QuerySet[UnitOfMeasure] | None = None,
) -> UomResolution:
    """
    Map OCR unit token (e.g. ``szt``, ``kompl``) to active UnitOfMeasure.

    ``match``: code | synonym | name | none
    """
    out: UomResolution = {"raw": None, "unit_of_measure_id": None, "unit_of_measure_code": None, "match": "none"}
    if raw is None or not str(raw).strip():
        return out

    token = re.sub(r"\s+", " ", str(raw).strip())
    out["raw"] = token[:64]
    lookup = token.lower().rstrip(".")

    qs = queryset if queryset is not None else UnitOfMeasure.objects.filter(is_active=True)

    by_code = {u.code.lower(): u for u in qs}
    hit = by_code.get(lookup)
    if hit:
        out["unit_of_measure_id"] = hit.id
        out["unit_of_measure_code"] = hit.code
        out["unit_of_measure_name"] = hit.name
        out["match"] = "code"
        return out

    code = UOM_SYNONYM_TO_CODE.get(lookup)
    if code:
        hit = qs.filter(code__iexact=code).first()
        if hit:
            out["unit_of_measure_id"] = hit.id
            out["unit_of_measure_code"] = hit.code
            out["unit_of_measure_name"] = hit.name
            out["match"] = "synonym"
            return out

    hit = qs.filter(name__iexact=token).first()
    if hit:
        out["unit_of_measure_id"] = hit.id
        out["unit_of_measure_code"] = hit.code
        out["unit_of_measure_name"] = hit.name
        out["match"] = "name"
        return out

    return out


def enrich_parsed_lines(
    lines: list[dict[str, Any]],
    supplier_name: str | None,
    *,
    suppliers: QuerySet[Supplier] | None = None,
    units: QuerySet[UnitOfMeasure] | None = None,
) -> tuple[list[dict[str, Any]], SupplierResolution]:
    """Attach ``uom_resolution`` and unit ids to each line; return supplier_resolution for the header."""
    uqs = units if units is not None else UnitOfMeasure.objects.filter(is_active=True)
    supplier_resolution = resolve_supplier_name(supplier_name, queryset=suppliers)

    enriched: list[dict[str, Any]] = []
    for row in lines:
        item = dict(row)
        raw_uom = item.get("uom_raw")
        uom_res = resolve_uom_token(raw_uom if isinstance(raw_uom, str) else None, queryset=uqs)
        item["uom_resolution"] = uom_res
        if uom_res.get("unit_of_measure_id") is not None:
            item["unit_of_measure_id"] = uom_res["unit_of_measure_id"]
            item["unit_of_measure_code"] = uom_res.get("unit_of_measure_code")
        enriched.append(item)

    return enriched, supplier_resolution
