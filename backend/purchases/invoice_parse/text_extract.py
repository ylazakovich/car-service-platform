"""OCR and plain-text extraction from uploaded invoice files (PDF, images, UTF-8)."""

from __future__ import annotations

import io
import logging
import shutil

from PIL import Image

from .constants import (
    MAX_OCR_PDF_PAGES,
    MIN_PDF_TEXT_CHARS_FOR_SKIP_OCR,
    OCR_PDF_RENDER_DPI,
    TESSERACT_CONFIG,
    TESSERACT_LANG,
)

logger = logging.getLogger(__name__)


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
