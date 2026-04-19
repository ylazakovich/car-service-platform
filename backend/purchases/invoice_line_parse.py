"""Extract line items from invoice plain text using a Python regex with named groups."""

from __future__ import annotations

import decimal
import io
import logging
import re
import shutil
from typing import Any

from PIL import Image

REQUIRED_REGEX_GROUPS = frozenset({"part_name", "quantity", "purchase_price"})
SUPPLIER_REGEX_GROUP = "supplier_name"

logger = logging.getLogger(__name__)

# If PDF text layer is shorter than this, try rasterizing pages and running Tesseract.
MIN_PDF_TEXT_CHARS_FOR_SKIP_OCR = 48
# OCR is CPU-heavy; cap pages for scanned PDFs.
MAX_OCR_PDF_PAGES = 15
# Rendered page width in pixels (height scales); balance quality vs memory.
OCR_PDF_RENDER_DPI = 200
TESSERACT_LANG = "pol+eng"
TESSERACT_CONFIG = "--oem 1 --psm 6"


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


def compile_pattern_or_raise(pattern: str) -> re.Pattern[str]:
    try:
        return re.compile(pattern)
    except re.error as exc:
        raise ValueError(f"Invalid regex: {exc}") from exc


def compile_line_pattern(pattern: str) -> re.Pattern[str]:
    return compile_pattern_or_raise(pattern)


def parse_invoice_lines(raw_text: str, pattern: str) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Scan each non-empty line; if the regex finds a match with required named groups, emit one row.

    Each emitted row: part_name (str), quantity (int), purchase_price (str decimal).
    """
    rx = compile_line_pattern(pattern)
    try:
        groupindex = rx.groupindex
    except AttributeError:
        groupindex = {}
    missing = REQUIRED_REGEX_GROUPS - frozenset(groupindex.keys())
    if missing:
        raise ValueError(f"Regex must define named groups: {', '.join(sorted(REQUIRED_REGEX_GROUPS))}")

    lines_out: list[dict[str, Any]] = []
    warnings: list[str] = []

    for raw_line in raw_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if set(line) <= {"-", "=", "|", "."}:
            continue
        m = rx.search(line)
        if not m:
            continue
        gd = m.groupdict()
        try:
            part = (gd.get("part_name") or "").strip()
            if not part:
                continue
            qty_raw = (gd.get("quantity") or "").strip()
            price_raw = (gd.get("purchase_price") or "").strip()
            if not qty_raw or not price_raw:
                continue
            qty = int(qty_raw)
            if qty < 1:
                warnings.append(f"Skipped non-positive quantity on line: {line[:120]}")
                continue
            price = normalize_decimal(price_raw)
            if price < 0:
                warnings.append(f"Skipped negative price on line: {line[:120]}")
                continue
        except (ValueError, TypeError, decimal.InvalidOperation) as exc:
            warnings.append(f"Could not parse values ({exc}): {line[:120]}")
            continue

        lines_out.append(
            {
                "part_name": part[:255],
                "quantity": qty,
                "purchase_price": str(price),
            }
        )

    return lines_out, warnings


def extract_supplier(raw_text: str, supplier_pattern: str | None) -> tuple[str | None, list[str]]:
    """
    Run one regex over the full OCR/text document; must define named group supplier_name.
    """
    warnings: list[str] = []
    pat = (supplier_pattern or "").strip()
    if not pat:
        return None, warnings
    try:
        rx = compile_pattern_or_raise(pat)
    except ValueError as exc:
        warnings.append(f"Supplier regex: {exc}")
        return None, warnings
    if SUPPLIER_REGEX_GROUP not in rx.groupindex:
        warnings.append(f"Supplier regex must define named group (?P<{SUPPLIER_REGEX_GROUP}>…).")
        return None, warnings
    m = rx.search(raw_text)
    if not m:
        warnings.append("Supplier regex did not match the document text.")
        return None, warnings
    name = (m.groupdict().get(SUPPLIER_REGEX_GROUP) or "").strip()
    if not name:
        return None, warnings
    return name[:255], warnings


# Heuristic supplier-line patterns (Polish / generic); first match wins.
SUPPLIER_PATTERN_CANDIDATES: list[tuple[str, str]] = [
    (
        "PL Sprzedawca (Seller): …",
        r"(?is)Sprzedawca\s*\([^)]*\)\s*:\s*(?P<supplier_name>[^\r\n]+)",
    ),
    (
        "EN Vendor: …",
        r"(?is)Vendor\s*:\s*(?P<supplier_name>[^\r\n]+)",
    ),
    (
        "PL Dostawca: …",
        r"(?is)Dostawca\s*:\s*(?P<supplier_name>[^\r\n]+)",
    ),
]


def suggest_supplier_pattern(raw_text: str) -> tuple[str | None, str | None]:
    """Return (pattern, preview_supplier_name) or (None, None)."""
    for _label, pattern in SUPPLIER_PATTERN_CANDIDATES:
        name, _w = extract_supplier(raw_text, pattern)
        if name:
            return pattern, name
    return None, None


def _tesseract_available() -> bool:
    return shutil.which("tesseract") is not None


def _pil_image_to_str_via_ocr(image: Image.Image) -> str:
    if not _tesseract_available():
        raise RuntimeError(
            "Tesseract OCR is not installed on the server (missing `tesseract` binary). "
            "Install tesseract-ocr and language packs, or paste recognized text manually."
        )
    import pytesseract

    rgb = _ensure_rgb(image)
    try:
        return pytesseract.image_to_string(rgb, lang=TESSERACT_LANG, config=TESSERACT_CONFIG) or ""
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError("Tesseract executable not found. Install tesseract-ocr on the server.") from exc


def _ensure_rgb(image: Image.Image) -> Image.Image:
    if image.mode in ("RGBA", "LA"):
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[-1])
        return background
    if image.mode == "P":
        return image.convert("RGB")
    if image.mode != "RGB":
        return image.convert("RGB")
    return image


def _ocr_image_bytes(raw: bytes) -> str:
    try:
        with Image.open(io.BytesIO(raw)) as img:
            img.load()
            text = _pil_image_to_str_via_ocr(img)
    except OSError as exc:
        raise ValueError("Could not open image for OCR.") from exc
    return text.strip()


def _extract_pdf_text_layer(reader) -> str:
    chunks: list[str] = []
    for page in reader.pages:
        chunks.append(page.extract_text() or "")
    return "\n".join(chunks).strip()


def _ocr_pdf_bytes(raw: bytes) -> str:
    try:
        from pdf2image import convert_from_bytes
    except ImportError as exc:
        raise RuntimeError("pdf2image is not installed; cannot OCR scanned PDF pages.") from exc

    if not _tesseract_available():
        raise RuntimeError(
            "This PDF has no extractable text layer. Install Tesseract on the server to OCR scanned pages, "
            "or paste OCR text manually."
        )

    try:
        images = convert_from_bytes(
            raw,
            dpi=OCR_PDF_RENDER_DPI,
            first_page=1,
            last_page=MAX_OCR_PDF_PAGES,
        )
    except Exception as exc:  # noqa: BLE001 — poppler/pdf errors vary
        logger.exception("pdf2image failed")
        raise ValueError("Could not rasterize PDF for OCR (poppler/pdf issue).") from exc

    parts: list[str] = []
    for i, pil_page in enumerate(images):
        try:
            parts.append(_pil_image_to_str_via_ocr(pil_page))
        except RuntimeError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.warning("OCR failed on PDF page %s: %s", i + 1, exc)
    return "\n\n".join(p for p in parts if p.strip()).strip()


def extract_text_from_file(file) -> str:
    """
    Return best-effort plain text from an uploaded invoice file.

    - **PDF**: extract embedded text with pypdf; if the layer is nearly empty, rasterize pages
      (poppler + pdf2image) and run **Tesseract** (pol+eng).
    - **Raster images** (png, jpeg, webp, tiff): **Tesseract OCR** (pol+eng).
    - **Plain text**: decode as UTF-8.
    """
    name = (getattr(file, "name", "") or "").lower()
    raw = file.read()
    if not raw:
        return ""

    if name.endswith(".pdf") or raw[:4] == b"%PDF":
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise RuntimeError("PDF support is not installed.") from exc

        reader = PdfReader(io.BytesIO(raw))
        text_layer = _extract_pdf_text_layer(reader)
        if len(text_layer) >= MIN_PDF_TEXT_CHARS_FOR_SKIP_OCR:
            return text_layer
        ocr_text = _ocr_pdf_bytes(raw)
        if ocr_text:
            return ocr_text
        return text_layer

    if name.endswith((".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff")):
        return _ocr_image_bytes(raw)

    # Plain text / unknown extension: treat as UTF-8 text
    try:
        return raw.decode("utf-8").strip()
    except UnicodeDecodeError:
        return raw.decode("utf-8", errors="replace").strip()


# Built-in patterns tried by /invoice-parse/suggest/ (name, pattern, min_matches)
SUGGESTION_CANDIDATES: list[tuple[str, str, int]] = [
    (
        "Pipe table (demo PL)",
        r"^\s*\d+\s*\|\s*(?P<part_name>.+?)\s*\|\s*(?P<quantity>\d+)\s*\|\s*\S+\s*\|\s*[\d\s.,]+\s*\|\s*(?P<purchase_price>[\d\s.,]+)",
        2,
    ),
    (
        "Tab-separated line total",
        r"(?P<part_name>[^\t]+)\t+(?P<quantity>\d+)\t+(?P<purchase_price>[\d\s.,]+)\s*$",
        2,
    ),
    (
        "Trailing qty and price (flex)",
        r"(?P<part_name>.+?)\s+(?P<quantity>\d+)\s+(?P<purchase_price>[\d\s.,]+)\s*$",
        3,
    ),
]


def suggest_line_pattern(raw_text: str) -> tuple[str | None, str | None, list[dict[str, Any]]]:
    """
    Pick the candidate pattern with the most parsed lines (respecting min_matches).

    Returns (pattern, candidate_name, preview_lines) or (None, None, []).
    """
    best: tuple[int, str, str, list[dict[str, Any]]] | None = None
    for label, pattern, minimum in SUGGESTION_CANDIDATES:
        try:
            rows, _warnings = parse_invoice_lines(raw_text, pattern)
        except ValueError:
            continue
        if len(rows) < minimum:
            continue
        score = len(rows)
        if best is None or score > best[0]:
            best = (score, label, pattern, rows[:20])

    if best is None:
        return None, None, []
    _score, label, pattern, preview = best
    return pattern, label, preview
