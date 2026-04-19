import axios from "axios";
import { useCallback, useEffect, useId, useState } from "react";
import {
  fetchInvoiceParseTemplates,
  previewInvoiceParseJson,
  previewInvoiceParseMultipart,
  suggestInvoicePattern,
  type InvoiceParseTemplateItem,
  type ParsedInvoiceLine,
} from "../../../api/invoiceParse";
import type { ParsedImportLine } from "../hooks/usePurchases";

type PurchaseInvoiceImportBlockProps = {
  onApplyParsed: (lines: ParsedImportLine[], options?: { supplierName?: string | null }) => void;
};

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
    setPreviewWarnings([]);
    try {
      const body = rawText.trim();
      if (!body) {
        setError("Сначала вставьте текст (или загрузите файл и снова нажмите — текст подставится после предпросмотра).");
        return;
      }
      const res = await suggestInvoicePattern(body);
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
            : "Шаблон строк не подобрался. Укажите regex строк вручную (Registers → Invoice lines).",
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
    setPreviewWarnings([]);
    try {
      const tid = templateId === "" ? NaN : Number(templateId);
      const useTemplate = Number.isFinite(tid) && tid > 0;
      const pattern = customPattern.trim();
      if (!useTemplate && !pattern) {
        setError("Выберите сохранённый шаблон или введите regex строк (part_name, quantity, purchase_price).");
        return;
      }
      if (useTemplate && pattern) {
        setError("Либо шаблон из списка, либо свой regex строк — не оба сразу.");
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
    onApplyParsed(previewLines, { supplierName: previewSupplierName });
  }

  return (
    <div className="purchase-invoice-import-block purchase-invoice-import-block--ru">
      <p className="eyebrow">Импорт из инвойса</p>
      <p className="workspace-note">
        Загрузите PDF или фото — сервер прогонит <strong>Tesseract (PL+EN)</strong> и получит <strong>весь текст</strong> документа.
        Затем по шаблону из справочника извлекаются <strong>поставщик</strong> (если задан regex) и <strong>все строки таблицы</strong>.
        Можно только вставить текст вручную.
      </p>
      {templatesError ? <p className="form-error">{templatesError}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-grid purchase-invoice-import-grid">
        <label>
          <span>Шаблон из Registers</span>
          <select
            id={`${baseId}-tpl`}
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              setCustomPattern("");
              setCustomSupplierPattern("");
            }}
          >
            <option value="">Только свои regex</option>
            {templates.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Regex поставщика (если «Только свои regex»)</span>
          <textarea
            id={`${baseId}-sup`}
            value={customSupplierPattern}
            onChange={(e) => setCustomSupplierPattern(e.target.value)}
            rows={2}
            className="purchase-invoice-import-regex"
            placeholder="Группа supplier_name; чаще заполняется кнопкой «Подобрать regex»"
            spellCheck={false}
            disabled={templateId !== ""}
          />
        </label>
        <label>
          <span>Regex строк таблицы (если не выбран шаблон)</span>
          <textarea
            id={`${baseId}-rx`}
            value={customPattern}
            onChange={(e) => setCustomPattern(e.target.value)}
            rows={3}
            className="purchase-invoice-import-regex"
            placeholder="Группы: part_name, quantity, purchase_price"
            spellCheck={false}
            disabled={templateId !== ""}
          />
        </label>
      </div>

      <label>
        <span>Текст / вставка после OCR</span>
        <textarea
          id={`${baseId}-raw`}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={5}
          placeholder="Вставьте полный текст фактуры…"
        />
      </label>

      <label>
        <span>Файл: PDF, изображение или .txt</span>
        <input
          id={`${baseId}-file`}
          type="file"
          accept=".pdf,.txt,.text,.html,.png,.jpg,.jpeg,.webp,.tif,.tiff"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <div className="purchase-invoice-import-actions">
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => void handleSuggest()}>
          Подобрать regex
        </button>
        <button type="button" className="button" disabled={busy} onClick={() => void handlePreview()}>
          Предпросмотр
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

      {previewSupplierName ? (
        <div className="invoice-parse-supplier-preview purchase-invoice-supplier-preview">
          <span className="invoice-parse-supplier-label">Поставщик</span>
          <strong>{previewSupplierName}</strong>
        </div>
      ) : null}

      {previewLines && previewLines.length > 0 ? (
        <div className="purchase-invoice-import-preview">
          <p className="workspace-note">
            Строк таблицы: <strong>{previewLines.length}</strong>. Проверьте и нажмите «Подставить в форму».
          </p>
          <table className="data-table purchase-invoice-import-preview-table">
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Кол-во</th>
                <th>Цена</th>
              </tr>
            </thead>
            <tbody>
              {previewLines.map((row, i) => (
                <tr key={`${row.part_name}-${i}`}>
                  <td>{row.part_name}</td>
                  <td>{row.quantity}</td>
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
