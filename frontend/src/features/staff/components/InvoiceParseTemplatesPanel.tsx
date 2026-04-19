import axios from "axios";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createInvoiceParseTemplate,
  deleteInvoiceParseTemplate,
  fetchInvoiceParseTemplates,
  previewInvoiceParseJson,
  suggestInvoicePattern,
  updateInvoiceParseTemplate,
  type InvoiceParseTemplateItem,
  type ParsedInvoiceLine,
} from "../../../api/invoiceParse";
import { DEMO_INVOICE_PLAIN_FULL } from "../data/demoInvoicePlain";

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
  const [rows, setRows] = useState<InvoiceParseTemplateItem[]>([]);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linePattern, setLinePattern] = useState("");
  const [supplierPattern, setSupplierPattern] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [labText, setLabText] = useState(DEMO_INVOICE_PLAIN_FULL);
  const [labLinePattern, setLabLinePattern] = useState("");
  const [labSupplierPattern, setLabSupplierPattern] = useState("");
  const [labBusy, setLabBusy] = useState(false);
  const [labError, setLabError] = useState("");
  const [labPreviewLines, setLabPreviewLines] = useState<ParsedInvoiceLine[] | null>(null);
  const [labPreviewSupplier, setLabPreviewSupplier] = useState<string | null>(null);

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

  function startEdit(row: InvoiceParseTemplateItem) {
    setEditingId(row.id);
    setName(row.name);
    setDescription(row.description);
    setLinePattern(row.line_pattern);
    setSupplierPattern(row.supplier_pattern ?? "");
    setIsActive(row.is_active);
    setSortOrder(row.sort_order);
    setFormError("");
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDescription("");
    setLinePattern("");
    setSupplierPattern("");
    setIsActive(true);
    setSortOrder(0);
    setFormError("");
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        line_pattern: linePattern.trim(),
        supplier_pattern: supplierPattern.trim(),
        is_active: isActive,
        sort_order: sortOrder,
      };
      if (editingId != null) {
        await updateInvoiceParseTemplate(editingId, payload);
      } else {
        await createInvoiceParseTemplate(payload);
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

  async function handleLabSuggest() {
    setLabError("");
    setLabBusy(true);
    setLabPreviewLines(null);
    setLabPreviewSupplier(null);
    try {
      const body = labText.trim();
      if (!body) {
        setLabError("Вставьте текст фактуры (или полный OCR).");
        return;
      }
      const res = await suggestInvoicePattern(body);
      if (!res.matched || !("line_pattern" in res)) {
        setLabError(
          res.matched === false && res.detail
            ? res.detail
            : "Встроенный шаблон строк не подошёл. Введите regex строк вручную.",
        );
        if ("suggested_supplier_pattern" in res && res.suggested_supplier_pattern) {
          setLabSupplierPattern(res.suggested_supplier_pattern);
        }
        if ("preview_supplier_name" in res && res.preview_supplier_name) {
          setLabPreviewSupplier(res.preview_supplier_name);
        }
        return;
      }
      setLabLinePattern(res.line_pattern);
      setLabPreviewLines(res.preview_lines ?? []);
      if (res.suggested_supplier_pattern) {
        setLabSupplierPattern(res.suggested_supplier_pattern);
      }
      if (res.preview_supplier_name) {
        setLabPreviewSupplier(res.preview_supplier_name);
      }
    } catch (err) {
      setLabError(readApiError(err, "Подсказка не сработала."));
    } finally {
      setLabBusy(false);
    }
  }

  async function handleLabPreview() {
    setLabError("");
    setLabBusy(true);
    setLabPreviewLines(null);
    setLabPreviewSupplier(null);
    try {
      const lp = labLinePattern.trim();
      if (!lp) {
        setLabError("Сначала нажмите «Подобрать regex» или вставьте regex строк.");
        return;
      }
      const out = await previewInvoiceParseJson({
        raw_text: labText,
        line_pattern: lp,
        supplier_pattern: labSupplierPattern.trim() || undefined,
      });
      setLabPreviewLines(out.lines);
      setLabPreviewSupplier(out.supplier_name);
    } catch (err) {
      setLabError(readApiError(err, "Предпросмотр не удался."));
    } finally {
      setLabBusy(false);
    }
  }

  return (
    <div className="invoice-parse-templates-panel invoice-parse-templates-panel--ru">
      <section className="invoice-parse-intro-card">
        <h3 className="invoice-parse-card-title">Разбор инвойса: как это устроено</h3>
        <ol className="invoice-parse-steps">
          <li>
            <strong>OCR / PDF</strong> на экране закупки превращает файл в <em>один сплошной текст</em> (вся
            страница, не только таблица).
          </li>
          <li>
            <strong>Поставщик</strong> — опциональный regex по <em>всему</em> тексту с группой{" "}
            <code>supplier_name</code> (например строка «Sprzedawca …»).
          </li>
          <li>
            <strong>Позиции</strong> — regex <em>по строкам</em> с группами <code>part_name</code>,{" "}
            <code>quantity</code>, <code>purchase_price</code> (часто колонка «netto» / сумма строки).
          </li>
          <li>
            В закупке вы выбираете сохранённый шаблон → «Предпросмотр» → «Подставить в строки»; поле «Поставщик»
            заполнится, если regex поставщика сработал.
          </li>
        </ol>
      </section>

      {loadError ? <p className="form-error">{loadError}</p> : null}
      {formError ? <p className="form-error">{formError}</p> : null}

      <section className="invoice-parse-card">
        <h3 className="invoice-parse-card-title">Сохранённые шаблоны</h3>
        <p className="workspace-note invoice-parse-card-lead">
          Активные шаблоны видны в выпадающем списке при создании закупки / расходников.
        </p>
        <div className="invoice-parse-table-wrap">
          <table className="data-table uom-admin-table invoice-parse-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Активен</th>
                <th>Порядок</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.is_active ? "Да" : "Нет"}</td>
                  <td>{row.sort_order}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="invoice-parse-card">
        <h3 className="invoice-parse-card-title">{editingId != null ? "Редактирование шаблона" : "Новый шаблон"}</h3>
        <form className="invoice-parse-form" onSubmit={(e) => void handleSave(e)}>
          <div className="invoice-parse-form-grid">
            <label className="invoice-parse-field">
              <span>Название</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={128} />
            </label>
            <label className="invoice-parse-field">
              <span>Порядок в списке</span>
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              />
            </label>
            <label className="invoice-parse-field invoice-parse-field--full">
              <span>Описание (для себя)</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
            </label>
            <label className="invoice-parse-field invoice-parse-field--full">
              <span>Regex поставщика (необязательно)</span>
              <textarea
                className="invoice-parse-templates-regex"
                rows={2}
                value={supplierPattern}
                onChange={(e) => setSupplierPattern(e.target.value)}
                placeholder="Именованная группа supplier_name, поиск по всему тексту OCR"
                spellCheck={false}
              />
            </label>
            <label className="invoice-parse-field invoice-parse-field--full">
              <span>Regex строк таблицы (обязательно)</span>
              <textarea
                className="invoice-parse-templates-regex"
                rows={4}
                value={linePattern}
                onChange={(e) => setLinePattern(e.target.value)}
                required
                placeholder="Группы: part_name, quantity, purchase_price"
                spellCheck={false}
              />
            </label>
            <label className="invoice-parse-field invoice-parse-field--inline-check">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span>Активен — показывать в закупке</span>
            </label>
          </div>
          <div className="invoice-parse-form-actions">
            <button type="submit" className="button" disabled={saving}>
              {editingId != null ? "Сохранить" : "Создать шаблон"}
            </button>
            {editingId != null ? (
              <button type="button" className="button button-secondary" disabled={saving} onClick={resetForm}>
                Отмена
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="invoice-parse-card invoice-parse-lab">
        <h3 className="invoice-parse-card-title">Проверка на демо-фактуре</h3>
        <p className="workspace-note">
          Ниже уже подставлен полный текст из репозитория (как после OCR). Нажмите «Подобрать regex», затем «Предпросмотр»
          — должны появиться поставщик и все строки таблицы.
        </p>
        {labError ? <p className="form-error">{labError}</p> : null}

        <div className="invoice-parse-lab-flow">
          <div className="invoice-parse-lab-step">
            <span className="invoice-parse-lab-step-num">1</span>
            <label className="invoice-parse-field invoice-parse-field--full">
              <span>Текст фактуры</span>
              <textarea rows={10} value={labText} onChange={(e) => setLabText(e.target.value)} spellCheck={false} />
            </label>
          </div>
          <div className="invoice-parse-lab-step">
            <span className="invoice-parse-lab-step-num">2</span>
            <button type="button" className="button" disabled={labBusy} onClick={() => void handleLabSuggest()}>
              Подобрать regex
            </button>
          </div>
          <div className="invoice-parse-lab-step">
            <span className="invoice-parse-lab-step-num">3</span>
            <div className="invoice-parse-lab-regex-grid">
              <label className="invoice-parse-field invoice-parse-field--full">
                <span>Regex поставщика (подставится автоматически, можно править)</span>
                <textarea
                  className="invoice-parse-templates-regex"
                  rows={2}
                  value={labSupplierPattern}
                  onChange={(e) => setLabSupplierPattern(e.target.value)}
                  spellCheck={false}
                />
              </label>
              <label className="invoice-parse-field invoice-parse-field--full">
                <span>Regex строк таблицы</span>
                <textarea
                  className="invoice-parse-templates-regex"
                  rows={3}
                  value={labLinePattern}
                  onChange={(e) => setLabLinePattern(e.target.value)}
                  spellCheck={false}
                />
              </label>
            </div>
            <button type="button" className="button button-secondary" disabled={labBusy} onClick={() => void handleLabPreview()}>
              Предпросмотр
            </button>
          </div>
        </div>

        {labPreviewSupplier ? (
          <div className="invoice-parse-supplier-preview">
            <span className="invoice-parse-supplier-label">Поставщик (из текста)</span>
            <strong>{labPreviewSupplier}</strong>
          </div>
        ) : null}

        {labPreviewLines && labPreviewLines.length > 0 ? (
          <div className="invoice-parse-lines-preview">
            <p className="workspace-note">
              Найдено позиций: <strong>{labPreviewLines.length}</strong>
            </p>
            <table className="data-table purchase-invoice-import-preview-table">
              <thead>
                <tr>
                  <th>Наименование</th>
                  <th>Кол-во</th>
                  <th>Цена закупки (строка)</th>
                </tr>
              </thead>
              <tbody>
                {labPreviewLines.map((r, i) => (
                  <tr key={`${r.part_name}-${i}`}>
                    <td>{r.part_name}</td>
                    <td>{r.quantity}</td>
                    <td>{r.purchase_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
