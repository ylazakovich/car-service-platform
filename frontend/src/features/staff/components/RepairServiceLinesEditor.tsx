import type { ServiceItem } from "../../../api/services";
import type { RepairServiceLineDraft } from "../shared/repairs";
import { newRepairServiceLineDraft } from "../shared/repairs";

type RepairServiceLinesEditorProps = {
  lines: RepairServiceLineDraft[];
  onChange: (lines: RepairServiceLineDraft[]) => void;
  catalog: ServiceItem[];
  disabled?: boolean;
  idPrefix: string;
};

function matchCatalog(name: string, catalog: ServiceItem[]): ServiceItem | null {
  const t = name.trim().toLowerCase();
  if (!t) {
    return null;
  }
  return catalog.find((s) => s.name.trim().toLowerCase() === t) ?? null;
}

export function repairDraftsFromEntryLines(
  lines: { id: string | null; name: string; catalog_service_id: number | null }[]
): RepairServiceLineDraft[] {
  if (lines.length === 0) {
    return [newRepairServiceLineDraft()];
  }
  return lines.map((l) => ({
    key: l.id ?? crypto.randomUUID(),
    name: l.name,
    catalog_service_id: l.catalog_service_id,
  }));
}

export function RepairServiceLinesEditor({
  lines,
  onChange,
  catalog,
  disabled = false,
  idPrefix,
}: RepairServiceLinesEditorProps) {
  const datalistId = `${idPrefix}-service-names`;

  function updateLine(index: number, patch: Partial<RepairServiceLineDraft>) {
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function onNameBlur(index: number) {
    const line = lines[index];
    const m = matchCatalog(line.name, catalog);
    updateLine(index, { catalog_service_id: m?.id ?? null });
  }

  function removeLine(index: number) {
    if (lines.length <= 1) {
      return;
    }
    onChange(lines.filter((_, i) => i !== index));
  }

  return (
    <div className="repair-service-lines-editor">
      <datalist id={datalistId}>
        {catalog
          .filter((s) => s.is_active)
          .map((s) => (
            <option key={s.id} value={s.name} />
          ))}
      </datalist>
      {lines.map((line, index) => {
        const matched = line.name.trim() ? matchCatalog(line.name, catalog) : null;
        const custom = Boolean(line.name.trim() && !matched);

        return (
          <div key={line.key} className="repair-service-line-row">
            <label className="repair-service-line-label">
              <span>Service {index + 1}</span>
              <input
                type="text"
                list={datalistId}
                value={line.name}
                disabled={disabled}
                onChange={(e) => updateLine(index, { name: e.target.value, catalog_service_id: null })}
                onBlur={() => onNameBlur(index)}
                placeholder="Type or pick from catalog"
                aria-label={`Service ${index + 1}`}
              />
            </label>
            {matched ? (
              <p className="repair-service-line-hint repair-service-line-hint-catalog">Linked to catalog (pricing in PDF)</p>
            ) : null}
            {custom ? (
              <p className="repair-service-line-hint repair-service-line-hint-custom">Not in catalog — saved as a new custom service name</p>
            ) : null}
            {!disabled && lines.length > 1 ? (
              <button type="button" className="button button-secondary repair-service-line-remove" onClick={() => removeLine(index)}>
                Remove
              </button>
            ) : null}
          </div>
        );
      })}
      {!disabled ? (
        <button
          type="button"
          className="button button-secondary repair-service-line-add"
          onClick={() => onChange([...lines, newRepairServiceLineDraft()])}
        >
          + Add service
        </button>
      ) : null}
    </div>
  );
}
