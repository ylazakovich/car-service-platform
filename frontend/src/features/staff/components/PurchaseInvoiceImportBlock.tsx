import axios from "axios";
import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import {
  suggestInvoiceParseMultipart,
  type ParsedInvoiceLine,
  type SupplierResolution,
  type SuggestInvoiceParseResponse,
} from "../../../api/invoiceParse";
import type { ParsedImportLine, PurchaseInvoiceImportApplyOptions } from "../hooks/usePurchases";

type PurchaseInvoiceImportBlockProps = {
  onApplyParsed: (lines: ParsedImportLine[], options?: PurchaseInvoiceImportApplyOptions) => void;
  /**
   * After a successful parse from a dropped/selected file, upload and link that same file as the purchase invoice.
   * Dropping another file replaces the linked document.
   */
  linkInvoiceFileAfterScan?: (file: File) => Promise<boolean>;
};

function supplierNameForForm(
  resolution: SupplierResolution | null | undefined,
  rawFromOcr: string | null | undefined,
): string | null {
  const m = resolution?.match;
  if (m === "exact" || m === "fuzzy" || m === "normalized" || m === "alias") {
    return resolution?.resolved_name?.trim() || null;
  }
  return rawFromOcr?.trim() || null;
}

function readApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }
    const body = error.response?.data;
    if (body && typeof body === "object") {
      for (const v of Object.values(body as Record<string, unknown>)) {
        if (Array.isArray(v) && typeof v[0] === "string") {
          return v[0];
        }
        if (typeof v === "string") {
          return v;
        }
      }
    }
  }
  return fallback;
}

function lineNeedsOperatorAttention(line: ParsedInvoiceLine): boolean {
  const raw = line.uom_raw?.trim();
  if (!raw) return false;
  const m = line.uom_resolution?.match;
  return m === "none" || m === "ambiguous";
}

function supplierNeedsOperatorAttention(res: SupplierResolution | null | undefined): boolean {
  const m = res?.match;
  return m === "none" || m === "ambiguous";
}

type MappedSuggestApply = { lines: ParsedImportLine[]; options: PurchaseInvoiceImportApplyOptions } | null;

function mapSuggestToApply(res: SuggestInvoiceParseResponse): MappedSuggestApply {
  if (!res.matched || !("line_pattern" in res)) {
    return null;
  }
  const lines = res.preview_lines ?? [];
  const mapped: ParsedImportLine[] = lines.map((row) => ({
    part_name: row.part_name,
    quantity: row.quantity,
    purchase_price: row.purchase_price,
    unit_of_measure_id: row.unit_of_measure_id,
    uom_raw: row.uom_raw,
  }));
  return {
    lines: mapped,
    options: {
      supplierName: supplierNameForForm(res.supplier_resolution, res.preview_supplier_name),
      supplierNeedsAttention: supplierNeedsOperatorAttention(res.supplier_resolution ?? null),
      linePartNeedsAttention: lines.map((ln) => lineNeedsOperatorAttention(ln)),
    },
  };
}

export function PurchaseInvoiceImportBlock({ onApplyParsed, linkInvoiceFileAfterScan }: PurchaseInvoiceImportBlockProps) {
  const baseId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastFileLabel, setLastFileLabel] = useState("");
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okHint, setOkHint] = useState("");

  /** @returns line count on success, `false` on failure */
  function applyFromSuggestResponse(res: SuggestInvoiceParseResponse): false | number {
    const mapped = mapSuggestToApply(res);
    if (!mapped) {
      setError(
        res.matched === false && res.detail
          ? res.detail
          : "Could not parse line items from this file. Try another file or layout.",
      );
      return false;
    }
    onApplyParsed(mapped.lines, mapped.options);
    setOkHint(`Filled ${mapped.lines.length} line(s).`);
    return mapped.lines.length;
  }

  async function scanFileAndFill(file: File) {
    setBusy(true);
    setError("");
    setOkHint("");
    setLastFileLabel(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await suggestInvoiceParseMultipart(fd);
      const lineCount = applyFromSuggestResponse(res);
      if (lineCount === false) {
        return;
      }
      if (linkInvoiceFileAfterScan) {
        const linked = await linkInvoiceFileAfterScan(file);
        if (!linked) {
          setError(
            "Lines were filled, but the invoice file could not be stored. Check the error under the line items, then try again.",
          );
        } else {
          setOkHint(`Filled ${lineCount} line(s). Invoice file linked.`);
        }
      }
    } catch (err) {
      setError(readApiError(err, "Could not read the file or parse the invoice."));
    } finally {
      setBusy(false);
    }
  }

  const dropDisabled = busy;

  function handleZoneDragEnter(e: DragEvent<HTMLDivElement>) {
    if (dropDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDropzoneActive(true);
  }

  function handleZoneDragLeave(e: DragEvent<HTMLDivElement>) {
    if (dropDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) {
      return;
    }
    setDropzoneActive(false);
  }

  function handleZoneDragOver(e: DragEvent<HTMLDivElement>) {
    if (dropDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleZoneDrop(e: DragEvent<HTMLDivElement>) {
    if (dropDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDropzoneActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      void scanFileAndFill(f);
    }
  }

  function handleDropzoneClick() {
    if (dropDisabled) return;
    fileInputRef.current?.click();
  }

  function handleDropzoneKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (dropDisabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }

  async function handleFileInputChange(file: File | null) {
    if (!file) return;
    await scanFileAndFill(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="purchase-invoice-import-block purchase-invoice-import-block--compact">
      {error ? <p className="form-error">{error}</p> : null}
      {okHint ? (
        <p className="workspace-note purchase-invoice-import-ok" role="status">
          {okHint}
        </p>
      ) : null}

      <input
        id={`${baseId}-file`}
        ref={fileInputRef}
        type="file"
        className="hidden-file-input"
        accept=".pdf,.txt,.text,.html,.png,.jpg,.jpeg,.webp,.tif,.tiff"
        disabled={dropDisabled}
        tabIndex={-1}
        onChange={(e) => void handleFileInputChange(e.target.files?.[0] ?? null)}
      />

      <div
        className={`invoice-parse-dropzone${dropzoneActive ? " invoice-parse-dropzone--active" : ""}${dropDisabled ? " invoice-parse-dropzone--disabled" : ""}`}
        role="button"
        tabIndex={dropDisabled ? -1 : 0}
        aria-label="Upload invoice: drop a file here or press to choose. PDF, images, or text."
        onClick={handleDropzoneClick}
        onKeyDown={handleDropzoneKeyDown}
        onDragEnter={handleZoneDragEnter}
        onDragLeave={handleZoneDragLeave}
        onDragOver={handleZoneDragOver}
        onDrop={handleZoneDrop}
      >
        <span className="invoice-parse-dropzone-icon" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="invoice-parse-dropzone-title">Drop invoice file here</span>
        <span className="invoice-parse-dropzone-hint">or click to choose a file from disk</span>
        <span className="invoice-parse-dropzone-formats">PDF · PNG · JPG · WEBP · TIFF · TXT</span>
        {busy ? <span className="invoice-parse-dropzone-busy">Parsing…</span> : null}
      </div>

      {lastFileLabel && !busy ? (
        <p className="workspace-note purchase-invoice-last-file">
          Last file: <strong>{lastFileLabel}</strong>
        </p>
      ) : null}
    </div>
  );
}
