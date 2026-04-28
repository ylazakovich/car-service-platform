"""Normalize European-style decimal strings for invoice amounts."""

from __future__ import annotations

import decimal


def normalize_decimal(value: str) -> decimal.Decimal:
    """Parse amounts like 85,00 / 1 041,57 / 1041.57 into Decimal."""
    text = value.strip().replace("\xa0", " ")
    if not text:
        raise decimal.InvalidOperation("empty amount")
    # Remove spaces used as thousand separators
    compact = text.replace(" ", "").replace("\u202f", "")
    if not compact:
        raise decimal.InvalidOperation("empty amount")
    if compact.count(",") == 1 and compact.count(".") >= 1:
        # European style 1.041,57
        if compact.rfind(",") > compact.rfind("."):
            normalized = compact.replace(".", "").replace(",", ".")
        else:
            normalized = compact.replace(",", "")
    elif "," in compact and "." not in compact:
        normalized = compact.replace(",", ".")
    else:
        normalized = compact
    return decimal.Decimal(normalized)
