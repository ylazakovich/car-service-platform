"""Shared constants for invoice text extraction and regex parsing."""

REQUIRED_REGEX_GROUPS = frozenset({"part_name", "quantity", "purchase_price"})
SUPPLIER_REGEX_GROUP = "supplier_name"

# If PDF text layer is shorter than this, try rasterizing pages and running Tesseract.
MIN_PDF_TEXT_CHARS_FOR_SKIP_OCR = 48
# OCR is CPU-heavy; cap pages for scanned PDFs.
MAX_OCR_PDF_PAGES = 15
# Rendered page width in pixels (height scales); balance quality vs memory.
OCR_PDF_RENDER_DPI = 200
TESSERACT_LANG = "pol+eng"
TESSERACT_CONFIG = "--oem 1 --psm 6"
