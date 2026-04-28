"""Compatibility entrypoint: invoice OCR + regex parsing lives in ``invoice_parse``."""

from .invoice_parse import (
    REQUIRED_REGEX_GROUPS,
    SUGGESTION_CANDIDATES,
    SUPPLIER_PATTERN_CANDIDATES,
    SUPPLIER_REGEX_GROUP,
    compile_line_pattern,
    compile_pattern_or_raise,
    enrich_parsed_lines,
    extract_supplier,
    extract_text_from_file,
    normalize_decimal,
    parse_invoice_lines,
    resolve_supplier_name,
    suggest_line_pattern,
    suggest_supplier_pattern,
)

__all__ = [
    "REQUIRED_REGEX_GROUPS",
    "SUPPLIER_REGEX_GROUP",
    "SUGGESTION_CANDIDATES",
    "SUPPLIER_PATTERN_CANDIDATES",
    "compile_line_pattern",
    "compile_pattern_or_raise",
    "enrich_parsed_lines",
    "extract_supplier",
    "extract_text_from_file",
    "normalize_decimal",
    "parse_invoice_lines",
    "resolve_supplier_name",
    "suggest_line_pattern",
    "suggest_supplier_pattern",
]
