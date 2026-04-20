import axios from "axios";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  createInvoiceParseTemplate,
  deleteInvoiceParseTemplate,
  extractInvoiceParseText,
  fetchInvoiceParseTemplates,
  previewInvoiceParseJson,
  suggestInvoicePattern,
  updateInvoiceParseTemplate,
  type InvoiceParseTemplateItem,
  type ParsedInvoiceLine,
} from "../../../api/invoiceParse";

function readApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }
    const body = error.response?.data;
    if (body && typeof body === "object") {
      for (const [, v] of Object.entries(body as Record<string, unknown>)) {
        if (Array.isArray(v) && typeof v[0] === "string") {
          return v[0];
        }
      }
    }
  }
  return fallback;
}

export function InvoiceParseTemplatesPanel() {
  const draftFileInputId = useId();
  const draftFileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<InvoiceParseTemplateItem[]>([]);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [composerError, setComposerError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingSortOrder, setEditingSortOrder] = useState(0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linePattern, setLinePattern] = useState("");
  const [supplierPattern, setSupplierPattern] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [draftRawText, setDraftRawText] = useState("");
  const [draftFileName, setDraftFileName] = useState("");
  const [draftExtractBusy, setDraftExtractBusy] = useState(false);
  const [draftWorkflowBusy, setDraftWorkflowBusy] = useState(false);
  const [draftPreviewLines, setDraftPreviewLines] = useState<ParsedInvoiceLine[] | null>(null);
  const [draftPreviewSupplier, setDraftPreviewSupplier] = useState<string | null>(null);
  const [draftPreviewWarnings, setDraftPreviewWarnings] = useState<string[]>([]);
  const [dropzoneActive, setDropzoneActive] = useState(false);

  const [tplSearch, setTplSearch] = useState("");
  const tplQuery = useDeferredValue(tplSearch.trim().toLowerCase());
  const filteredRows = useMemo(() => {
    if (!tplQuery) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(tplQuery) || r.description.toLowerCase().includes(tplQuery));
  }, [rows, tplQuery]);

  const reload = useCallback(async () => {
    setLoadError("");
    try {
      const data = await fetchInvoiceParseTemplates(true);
      setRows(data);
    } catch {
      setLoadError("Не удалось загрузить шаблоны.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const clearComposerFields = useCallback(() => {
    setDraftRawText("");
    setDraftFileName("");
    setDraftPreviewLines(null);
    setDraftPreviewSupplier(null);
    setDraftPreviewWarnings([]);
    setComposerError("");
    setName("");
    setDescription("");
    setLinePattern("");
    setSupplierPattern("");
    setIsActive(true);
    if (draftFileInputRef.current) {
      draftFileInputRef.current.value = "";
    }
    setDropzoneActive(false);
  }, []);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setEditingSortOrder(0);
    setFormError("");
    clearComposerFields();
  }, [clearComposerFields]);

  function startEdit(row: InvoiceParseTemplateItem) {
    clearComposerFields();
    setEditingId(row.id);
    setEditingSortOrder(row.sort_order);
    setName(row.name);
    setDescription(row.description);
    setLinePattern(row.line_pattern);
    setSupplierPattern(row.supplier_pattern ?? "");
    setIsActive(row.is_active);
    setFormError("");
  }

  async function handleDraftFileSelected(file: File | null) {
    if (!file) return;
    setDraftExtractBusy(true);
    setComposerError("");
    setDraftPreviewLines(null);
    setDraftPreviewSupplier(null);
    setDraftPreviewWarnings([]);
    setDraftFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { raw_text: text } = await extractInvoiceParseText(fd);
      setDraftRawText(text);
      if (!text.trim()) {
        setComposerError("Из файла не получилось извлечь текст. Попробуйте другой файл или вставьте текст вручную.");
      }
    } catch (err) {
      setComposerError(readApiError(err, "Не удалось извлечь текст из файла."));
    } finally {
      setDraftExtractBusy(false);
    }
  }

  const composerDisabled = saving || Boolean(loadError);
  const draftBusy = draftExtractBusy || draftWorkflowBusy;
  const dropzoneDisabled = composerDisabled || draftBusy;

  function handleZoneDragEnter(e: DragEvent<HTMLDivElement>) {
    if (dropzoneDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDropzoneActive(true);
  }

  function handleZoneDragLeave(e: DragEvent<HTMLDivElement>) {
    if (dropzoneDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) {
      return;
    }
    setDropzoneActive(false);
  }

  function handleZoneDragOver(e: DragEvent<HTMLDivElement>) {
    if (dropzoneDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleZoneDrop(e: DragEvent<HTMLDivElement>) {
    if (dropzoneDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setDropzoneActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      void handleDraftFileSelected(f);
    }
  }

  function handleDropzoneClick() {
    if (dropzoneDisabled) return;
    draftFileInputRef.current?.click();
  }

  function handleDropzoneKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (dropzoneDisabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      draftFileInputRef.current?.click();
    }
  }

  async function handleDraftSuggest() {
    setComposerError("");
    setDraftWorkflowBusy(true);
    setDraftPreviewLines(null);
    setDraftPreviewSupplier(null);
    setDraftPreviewWarnings([]);
    try {
      const body = draftRawText.trim();
      if (!body) {
        setComposerError("Сначала загрузите фактуру или вставьте текст OCR.");
        return;
      }
      const res = await suggestInvoicePattern(body);
      if (res.suggested_supplier_pattern) {
        setSupplierPattern(res.suggested_supplier_pattern);
      }
      if (res.preview_supplier_name) {
        setDraftPreviewSupplier(res.preview_supplier_name);
      }
      if (!res.matched || !("line_pattern" in res)) {
        setComposerError(
          res.matched === false && res.detail
            ? res.detail
            : "Не удалось подобрать regex по этому тексту. Попробуйте отредактировать текст или задайте regex вручную ниже.",
        );
        return;
      }
      setLinePattern(res.line_pattern);
      setName((prev) => {
        const t = prev.trim();
        if (t) return prev;
        const suggested = ("suggested_name" in res && res.suggested_name ? String(res.suggested_name).trim() : "") || "";
        return suggested || prev;
      });
    } catch (err) {
      setComposerError(readApiError(err, "Подбор regex не удался."));
    } finally {
      setDraftWorkflowBusy(false);
    }
  }

  async function handleDraftPreview() {
    setComposerError("");
    setDraftWorkflowBusy(true);
    setDraftPreviewLines(null);
    setDraftPreviewSupplier(null);
    setDraftPreviewWarnings([]);
    try {
      const body = draftRawText.trim();
      const lp = linePattern.trim();
      if (!body) {
        setComposerError("Нет текста фактуры для предпросмотра.");
        return;
      }
      if (!lp) {
        setComposerError("Сначала нажмите «Подобрать regex» или введите regex строк таблицы вручную.");
        return;
      }
      const out = await previewInvoiceParseJson({
        raw_text: body,
        line_pattern: lp,
        supplier_pattern: supplierPattern.trim() || undefined,
      });
      setDraftPreviewLines(out.lines);
      setDraftPreviewWarnings(out.warnings);
      setDraftPreviewSupplier(out.supplier_name);
    } catch (err) {
      setComposerError(readApiError(err, "Предпросмотр не удался."));
    } finally {
      setDraftWorkflowBusy(false);
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const base = {
        name: name.trim(),
        description: description.trim(),
        line_pattern: linePattern.trim(),
        supplier_pattern: supplierPattern.trim(),
        is_active: isActive,
      };
      if (editingId != null) {
        await updateInvoiceParseTemplate(editingId, { ...base, sort_order: editingSortOrder });
      } else {
        const nextSort = rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.sort_order)) + 1;
        await createInvoiceParseTemplate({ ...base, sort_order: nextSort });
      }
      resetForm();
      await reload();
    } catch (err) {
      setFormError(readApiError(err, "Сохранение не удалось."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: InvoiceParseTemplateItem) {
    const ok = window.confirm(`Удалить шаблон «${row.name}»?`);
    if (!ok) {
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await deleteInvoiceParseTemplate(row.id);
      if (editingId === row.id) {
        resetForm();
      }
      await reload();
    } catch (err) {
      setFormError(readApiError(err, "Удаление не удалось."));
    } finally {
      setSaving(false);
    }
  }

  function renderTemplateFields(inputsDisabled: boolean) {
    const saveLabel =
      editingId != null ? (saving ? "Сохранение…" : "Сохранить") : saving ? "Сохранение…" : "Сохранить шаблон";
    return (
      <>
        <div className="invoice-parse-form-grid invoice-parse-form-grid--register">
          <label className="invoice-parse-field">
            <span>Название шаблона</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={128}
              disabled={inputsDisabled}
              autoComplete="off"
              className="uom-admin-cell-input"
            />
          </label>
          <label className="invoice-parse-field invoice-parse-field--full">
            <span>Описание (для себя)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              disabled={inputsDisabled}
              autoComplete="off"
              className="uom-admin-cell-input"
            />
          </label>
          <label className="invoice-parse-field invoice-parse-field--full">
            <span>Regex поставщика (необязательно)</span>
            <textarea
              className="invoice-parse-templates-regex uom-admin-cell-input--compact"
              rows={2}
              value={supplierPattern}
              onChange={(e) => setSupplierPattern(e.target.value)}
              placeholder="Именованная группа supplier_name"
              spellCheck={false}
              disabled={inputsDisabled}
            />
          </label>
          <label className="invoice-parse-field invoice-parse-field--full">
            <span>Regex строк таблицы (обязательно)</span>
            <textarea
              className="invoice-parse-templates-regex uom-admin-cell-input--compact"
              rows={4}
              value={linePattern}
              onChange={(e) => setLinePattern(e.target.value)}
              required
              placeholder="Группы: part_name, quantity, purchase_price"
              spellCheck={false}
              disabled={inputsDisabled}
            />
          </label>
          <label className="invoice-parse-field invoice-parse-field--inline-check">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={inputsDisabled} />
            <span>Активен — показывать в закупке</span>
          </label>
        </div>
        <div className="invoice-parse-form-actions">
          <button type="submit" className="button" disabled={saving}>
            {saveLabel}
          </button>
          {editingId != null ? (
            <button type="button" className="button button-secondary" disabled={saving} onClick={resetForm}>
              Отмена
            </button>
          ) : (
            <button type="button" className="button button-secondary" disabled={saving} onClick={clearComposerFields}>
              Сбросить черновик
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <section
      className="uom-admin-page services-register-page invoice-parse-register-page"
      aria-labelledby="invoice-parse-register-title"
    >
      <div className="registers-embedded-section-head">
        <h3 id="invoice-parse-register-title" className="uom-admin-subtitle">
          Шаблоны строк фактуры
        </h3>
      </div>
      <p className="workspace-note uom-admin-lead">
        Сверху — сохранённые шаблоны (поиск и таблица с прокруткой). Внизу — новый шаблон по фактуре: файл → извлечение
        текста → <strong>Подобрать regex</strong> → <strong>Предпросмотр</strong> → <strong>Сохранить шаблон</strong>.
      </p>

      {loadError ? <p className="form-error">{loadError}</p> : null}
      {formError ? <p className="form-error">{formError}</p> : null}

      <div className="invoice-parse-list-region">
        <h4 className="uom-admin-subtitle invoice-parse-sub-block-title invoice-parse-list-head">Сохранённые шаблоны</h4>
        <p className="workspace-note uom-admin-lead invoice-parse-list-lead">
          Активные шаблоны доступны в выпадающем списке при импорте фактуры в закупке.
        </p>

        <div className="registers-search-toolbar invoice-parse-list-search">
          <label className="registers-search-field">
            <span>Поиск</span>
            <input
              type="search"
              value={tplSearch}
              onChange={(e) => setTplSearch(e.target.value)}
              placeholder="Название или описание…"
              autoComplete="off"
              aria-label="Поиск шаблонов"
            />
          </label>
        </div>

        <p className="services-register-table-hint" id="invoice-parse-templates-table-hint">
          Изменение regex — через «Изменить»; порядок в списке закупки задаётся автоматически при создании.
        </p>
        <div className="uom-admin-table-wrap invoice-parse-templates-list-scroll">
          <table
            className="uom-admin-table uom-admin-table--compact invoice-parse-templates-table"
            aria-describedby="invoice-parse-templates-table-hint"
          >
            <thead>
              <tr>
                <th scope="col">Название</th>
                <th scope="col">Активен</th>
                <th scope="col">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <p className="workspace-note">
                      {rows.length === 0 ? "Шаблонов пока нет — создайте первый блоком ниже." : "Ничего не найдено."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.is_active ? "Да" : "Нет"}</td>
                    <td className="invoice-parse-table-actions">
                      <button type="button" className="purchase-inline-action" onClick={() => startEdit(row)}>
                        Изменить
                      </button>
                      <button
                        type="button"
                        className="purchase-inline-action purchase-inline-action-danger"
                        onClick={() => void handleDelete(row)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingId !== null ? (
        <div className="invoice-parse-edit-card">
          <h4 className="uom-admin-subtitle invoice-parse-sub-block-title">Редактирование шаблона</h4>
          <form className="invoice-parse-form" onSubmit={(e) => void handleSave(e)}>
            {renderTemplateFields(saving)}
          </form>
        </div>
      ) : (
        <div className="invoice-parse-composer-card">
          <h4 className="uom-admin-subtitle invoice-parse-sub-block-title">Добавить по фактуре</h4>
          {composerError ? <p className="form-error">{composerError}</p> : null}

          <div className="invoice-parse-register-source invoice-parse-register-source--stack">
            <div className="invoice-parse-stack-label">
              <span className="invoice-parse-stack-label-text">Файл фактуры</span>
              <input
                id={draftFileInputId}
                ref={draftFileInputRef}
                type="file"
                className="hidden-file-input"
                accept=".pdf,.txt,.text,.html,.png,.jpg,.jpeg,.webp,.tif,.tiff"
                disabled={dropzoneDisabled}
                tabIndex={-1}
                onChange={(e) => void handleDraftFileSelected(e.target.files?.[0] ?? null)}
              />
              <div
                className={`invoice-parse-dropzone${dropzoneActive ? " invoice-parse-dropzone--active" : ""}${dropzoneDisabled ? " invoice-parse-dropzone--disabled" : ""}`}
                role="button"
                tabIndex={dropzoneDisabled ? -1 : 0}
                aria-label="Загрузить фактуру: перетащите файл сюда или нажмите, чтобы выбрать на диске. Допустимы PDF, изображения и текстовые файлы."
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
                <span className="invoice-parse-dropzone-title">Перетащите фактуру сюда</span>
                <span className="invoice-parse-dropzone-hint">или нажмите, чтобы выбрать файл на диске</span>
                <span className="invoice-parse-dropzone-formats">PDF · PNG · JPG · WEBP · TIFF · TXT</span>
              </div>
            </div>
            <label className="invoice-parse-stack-label" htmlFor={`${draftFileInputId}-raw`}>
              <span className="invoice-parse-stack-label-text">Текст (после загрузки или вставьте OCR вручную)</span>
              <textarea
                id={`${draftFileInputId}-raw`}
                value={draftRawText}
                onChange={(e) => setDraftRawText(e.target.value)}
                rows={6}
                spellCheck={false}
                disabled={composerDisabled || draftExtractBusy}
                placeholder="Загрузите PDF или изображение — текст появится здесь…"
                className="invoice-parse-raw-textarea"
              />
            </label>
          </div>

          {draftFileName ? (
            <p className="workspace-note invoice-parse-file-meta">
              Файл: <strong>{draftFileName}</strong>
              {draftExtractBusy ? " — извлечение текста…" : null}
            </p>
          ) : null}

          <div className="invoice-parse-register-toolbar">
            <button
              type="button"
              className="button"
              disabled={composerDisabled || draftBusy || !draftRawText.trim()}
              onClick={() => void handleDraftSuggest()}
            >
              {draftWorkflowBusy && !draftExtractBusy ? "Подбор…" : "Подобрать regex"}
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={composerDisabled || draftBusy || !draftRawText.trim() || !linePattern.trim()}
              onClick={() => void handleDraftPreview()}
            >
              Предпросмотр
            </button>
          </div>

          {draftPreviewWarnings.length > 0 ? (
            <ul className="workspace-note purchase-invoice-import-warnings">
              {draftPreviewWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          {draftPreviewSupplier ? (
            <div className="invoice-parse-supplier-preview">
              <span className="invoice-parse-supplier-label">Поставщик (предпросмотр)</span>
              <strong>{draftPreviewSupplier}</strong>
            </div>
          ) : null}

          {draftPreviewLines && draftPreviewLines.length > 0 ? (
            <div className="invoice-parse-lines-preview">
              <p className="workspace-note">
                Строк в предпросмотре: <strong>{draftPreviewLines.length}</strong>
              </p>
              <div className="uom-admin-table-wrap invoice-parse-composer-preview-scroll">
                <table className="data-table uom-admin-table uom-admin-table--compact purchase-invoice-import-preview-table">
                  <thead>
                    <tr>
                      <th>Наименование</th>
                      <th>Кол-во</th>
                      <th>Цена закупки (строка)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftPreviewLines.map((r, i) => (
                      <tr key={`${r.part_name}-${i}`}>
                        <td>{r.part_name}</td>
                        <td>{r.quantity}</td>
                        <td>{r.purchase_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <form className="invoice-parse-form invoice-parse-form--composer" onSubmit={(e) => void handleSave(e)}>
            {renderTemplateFields(composerDisabled || draftBusy)}
          </form>
        </div>
      )}
    </section>
  );
}
