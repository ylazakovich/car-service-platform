import axios from "axios";
import { useCallback, useEffect, useId, useState } from "react";
import {
  fetchInvoiceParseTemplates,
  previewInvoiceParseJson,
  previewInvoiceParseMultipart,
  suggestInvoicePattern,
  type InvoiceParseTemplateItem,
  type ParsedInvoiceLine,
  type SupplierResolution,
} from "../../../api/invoiceParse";
import type { ParsedImportLine } from "../hooks/usePurchases";

type PurchaseInvoiceImportBlockProps = {
  onApplyParsed: (lines: ParsedImportLine[], options?: { supplierName?: string | null }) => void;
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

export function PurchaseInvoiceImportBlock({ onApplyParsed }: PurchaseInvoiceImportBlockProps) {
  const baseId = useId();
  const [templates, setTemplates] = useState<InvoiceParseTemplateItem[]>([]);
  const [templatesError, setTemplatesError] = useState("");
  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [templateId, setTemplateId] = useState<string>("");
  const [customPattern, setCustomPattern] = useState("");
  const [customSupplierPattern, setCustomSupplierPattern] = useState("");
  const [previewLines, setPreviewLines] = useState<ParsedInvoiceLine[] | null>(null);
  const [previewSupplierName, setPreviewSupplierName] = useState<string | null>(null);
  const [supplierResolution, setSupplierResolution] = useState<SupplierResolution | null>(null);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadTemplates = useCallback(async () => {
    setTemplatesError("");
    try {
      const rows = await fetchInvoiceParseTemplates(false);
      setTemplates(rows);
    } catch {
      setTemplatesError("Не удалось загрузить шаблоны из Registers.");
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  async function handleSuggest() {
    setError("");
    setBusy(true);
    setPreviewLines(null);
    setPreviewSupplierName(null);
    setSupplierResolution(null);
    setPreviewWarnings([]);
    try {
      const body = rawText.trim();
      if (!body) {
        setError("Сначала вставьте текст или сделайте «Предпросмотр» с файлом — текст подставится автоматически.");
        return;
      }
      const res = await suggestInvoicePattern(body);
      setSupplierResolution(res.supplier_resolution ?? null);
      if (res.suggested_supplier_pattern) {
        setCustomSupplierPattern(res.suggested_supplier_pattern);
      }
      if (res.preview_supplier_name) {
        setPreviewSupplierName(res.preview_supplier_name);
      }
      if (!res.matched || !("line_pattern" in res)) {
        setError(
          res.matched === false && res.detail
            ? res.detail
            : "Шаблон строк не подобрался. Выберите сохранённый шаблон или задайте regex в блоке ниже.",
        );
        return;
      }
      setCustomPattern(res.line_pattern);
      setPreviewLines(res.preview_lines ?? []);
    } catch (err) {
      setError(readApiError(err, "Подбор regex не удался."));
    } finally {
      setBusy(false);
    }
  }

  async function handlePreview() {
    setError("");
    setBusy(true);
    setPreviewLines(null);
    setPreviewSupplierName(null);
    setSupplierResolution(null);
    setPreviewWarnings([]);
    try {
      const tid = templateId === "" ? NaN : Number(templateId);
      const useTemplate = Number.isFinite(tid) && tid > 0;
      const pattern = customPattern.trim();
      if (!useTemplate && !pattern) {
        setError("Выберите шаблон из списка или откройте «Свои regex» и введите шаблон строк.");
        return;
      }
      if (useTemplate && pattern) {
        setError("Либо шаблон из списка, либо свой regex — не оба сразу.");
        return;
      }

      if (file) {
        const fd = new FormData();
        if (rawText.trim()) {
          fd.append("raw_text", rawText.trim());
        }
        fd.append("file", file);
        if (useTemplate) {
          fd.append("template_id", String(tid));
        } else {
          fd.append("line_pattern", pattern);
          const sp = customSupplierPattern.trim();
          if (sp) {
            fd.append("supplier_pattern", sp);
          }
        }
        const out = await previewInvoiceParseMultipart(fd);
        setPreviewLines(out.lines);
        setPreviewWarnings(out.warnings);
        setPreviewSupplierName(out.supplier_name);
        setSupplierResolution(out.supplier_resolution ?? null);
        return;
      }

      const out = await previewInvoiceParseJson({
        raw_text: rawText.trim() || undefined,
        ...(useTemplate
          ? { template_id: tid }
          : {
              line_pattern: pattern,
              supplier_pattern: customSupplierPattern.trim() || undefined,
            }),
      });
      setPreviewLines(out.lines);
      setPreviewWarnings(out.warnings);
      setPreviewSupplierName(out.supplier_name);
      setSupplierResolution(out.supplier_resolution ?? null);
    } catch (err) {
      setError(readApiError(err, "Предпросмотр не удался."));
    } finally {
      setBusy(false);
    }
  }

  function handleApply() {
    if (!previewLines?.length) {
      return;
    }
    onApplyParsed(previewLines, {
      supplierName: supplierNameForForm(supplierResolution, previewSupplierName),
    });
  }

  const useCustomOnly = templateId === "";

  return (
    <div className="purchase-invoice-import-block purchase-invoice-import-block--ru">
      <div className="purchase-invoice-import-head">
        <p className="eyebrow">Фактура PL</p>
        <p className="workspace-note purchase-invoice-import-lead">
          PDF или изображение — на сервере извлекается текст (OCR). Затем по шаблону из Registers подтягиваются строки и при необходимости поставщик.
        </p>
      </div>
      {templatesError ? <p className="form-error">{templatesError}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="purchase-invoice-import-source">
        <label className="purchase-invoice-import-file-label">
          <span className="purchase-invoice-import-label-text">Файл</span>
          <input
            id={`${baseId}-file`}
            type="file"
            accept=".pdf,.txt,.text,.html,.png,.jpg,.jpeg,.webp,.tif,.tiff"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="purchase-invoice-import-raw-label">
          <span className="purchase-invoice-import-label-text">Текст (вставка или после предпросмотра)</span>
          <textarea
            id={`${baseId}-raw`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={4}
            placeholder="Текст фактуры…"
          />
        </label>
      </div>

      <label className="purchase-invoice-import-template-row">
        <span className="purchase-invoice-import-label-text">Шаблон из Registers</span>
        <select
          id={`${baseId}-tpl`}
          value={templateId}
          onChange={(e) => {
            setTemplateId(e.target.value);
            setCustomPattern("");
            setCustomSupplierPattern("");
          }}
        >
          <option value="">— Свои regex (ниже) —</option>
          {templates.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <details className="purchase-invoice-import-advanced" open={useCustomOnly}>
        <summary>Свои regex (только если шаблон не выбран)</summary>
        <div className="purchase-invoice-import-advanced-body">
          <label>
            <span>Regex поставщика</span>
            <textarea
              id={`${baseId}-sup`}
              value={customSupplierPattern}
              onChange={(e) => setCustomSupplierPattern(e.target.value)}
              rows={2}
              className="purchase-invoice-import-regex"
              placeholder="Именованная группа supplier_name; часто хватает «Подобрать regex»"
              spellCheck={false}
              disabled={!useCustomOnly}
            />
          </label>
          <label>
            <span>Regex строк (part_name, quantity, purchase_price)</span>
            <textarea
              id={`${baseId}-rx`}
              value={customPattern}
              onChange={(e) => setCustomPattern(e.target.value)}
              rows={3}
              className="purchase-invoice-import-regex"
              spellCheck={false}
              disabled={!useCustomOnly}
            />
          </label>
        </div>
      </details>

      <div className="purchase-invoice-import-actions">
        <button type="button" className="button" disabled={busy} onClick={() => void handlePreview()}>
          Предпросмотр
        </button>
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => void handleSuggest()}>
          Подобрать regex
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={busy || !previewLines?.length}
          onClick={handleApply}
        >
          Подставить в форму
        </button>
      </div>

      {previewWarnings.length > 0 ? (
        <ul className="workspace-note purchase-invoice-import-warnings">
          {previewWarnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      {(supplierResolution?.match === "none" || supplierResolution?.match === "ambiguous") &&
      (previewSupplierName || supplierResolution?.raw_name) ? (
        <p className="workspace-note purchase-invoice-import-supplier-hint">
          Нажмите «Подставить в форму», затем проверьте поле <strong>Supplier</strong> ниже по этой форме. Если
          поставщика ещё нет в базе, исправьте имя при необходимости и сохраните закупку — запись поставщика создастся
          автоматически. NIP из поля ниже сохранится в карточку поставщика, если он новый или в справочнике у этой
          записи ещё не был указан NIP.
        </p>
      ) : null}

      {previewSupplierName || supplierResolution?.raw_name ? (
        <div className="invoice-parse-supplier-preview purchase-invoice-supplier-preview">
          <span className="invoice-parse-supplier-label">Поставщик</span>
          <div className="purchase-invoice-supplier-meta">
            <strong>{supplierResolution?.resolved_name ?? previewSupplierName ?? supplierResolution?.raw_name}</strong>
            {supplierResolution?.match && supplierResolution.match !== "none" ? (
              <span className="workspace-note purchase-invoice-import-match-pill">
                {supplierResolution.match === "exact"
                  ? "справочник"
                  : supplierResolution.match === "fuzzy"
                    ? "похожее имя"
                    : supplierResolution.match === "normalized"
                      ? "справочник"
                      : supplierResolution.match === "alias"
                        ? "алиас"
                        : supplierResolution.match === "ambiguous"
                          ? "несколько кандидатов"
                          : supplierResolution.match}
              </span>
            ) : null}
            {previewSupplierName &&
            supplierResolution?.resolved_name &&
            previewSupplierName.trim() !== supplierResolution.resolved_name.trim() ? (
              <span className="workspace-note">из текста: {previewSupplierName}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {previewLines && previewLines.length > 0 ? (
        <div className="purchase-invoice-import-preview">
          <p className="workspace-note">
            Строк: <strong>{previewLines.length}</strong>. Проверьте и нажмите «Подставить в форму».
          </p>
          <table className="data-table purchase-invoice-import-preview-table">
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Кол-во</th>
                <th>Ед.</th>
                <th>Цена</th>
              </tr>
            </thead>
            <tbody>
              {previewLines.map((row, i) => (
                <tr key={`${row.part_name}-${i}`}>
                  <td>{row.part_name}</td>
                  <td>{row.quantity}</td>
                  <td>
                    {row.uom_raw ? (
                      <>
                        <span>{row.uom_raw}</span>
                        {row.unit_of_measure_code ? (
                          <span className="workspace-note"> → {row.unit_of_measure_code}</span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{row.purchase_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
