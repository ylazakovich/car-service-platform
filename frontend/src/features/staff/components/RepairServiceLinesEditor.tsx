import { useState } from "react";
import type { ServiceItem } from "../../../api/services";
import { randomUuid } from "../../../lib/randomUuid";
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

function filterCatalog(name: string, catalog: ServiceItem[]): ServiceItem[] {
  const activeCatalog = catalog.filter((service) => service.is_active);
  const query = name.trim().toLowerCase();
  if (!query) {
    return activeCatalog.slice(0, 6);
  }
  return activeCatalog
    .filter((service) => service.name.trim().toLowerCase().includes(query))
    .slice(0, 6);
}

/** Accessible name for each row: line index + current service text (matches screen-reader context). */
function serviceLineInputAriaLabel(index: number, rawName: string): string {
  const n = rawName.trim();
  return n ? `Line ${index + 1}: ${n}` : `Line ${index + 1} — service name`;
}

export function repairDraftsFromEntryLines(
  lines: { id: string | null; name: string; catalog_service_id: number | null }[]
): RepairServiceLineDraft[] {
  if (lines.length === 0) {
    return [newRepairServiceLineDraft()];
  }
  return lines.map((l) => ({
    key: l.id ?? randomUuid(),
    persisted_id: l.id,
    name: l.name,
    catalog_service_id: l.catalog_service_id,
    catalog_service_price: "",
  }));
}

export function RepairServiceLinesEditor({
  lines,
  onChange,
  catalog,
  disabled = false,
  idPrefix,
}: RepairServiceLinesEditorProps) {
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);

  function updateLine(index: number, patch: Partial<RepairServiceLineDraft>) {
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function syncLineWithCatalog(index: number) {
    const line = lines[index];
    const m = matchCatalog(line.name, catalog);
    updateLine(index, { catalog_service_id: m?.id ?? null, catalog_service_price: m ? "" : line.catalog_service_price });
  }

  function selectCatalogService(index: number, service: ServiceItem) {
    updateLine(index, {
      name: service.name,
      catalog_service_id: service.id,
      catalog_service_price: "",
    });
    setActiveLineIndex(null);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) {
      return;
    }
    onChange(lines.filter((_, i) => i !== index));
  }

  return (
    <div className="repair-service-lines-editor">
      {lines.map((line, index) => {
        const matched = line.name.trim() ? matchCatalog(line.name, catalog) : null;
        const custom = Boolean(line.name.trim() && !matched);
        const suggestions = filterCatalog(line.name, catalog);
        const showSuggestions = !disabled && activeLineIndex === index && suggestions.length > 0;
        const listboxId = `${idPrefix}-service-suggestions-${index}`;

        return (
          <div key={line.key} className="repair-service-line-row">
            <span className="repair-service-line-index" aria-hidden="true">
              {index + 1}
            </span>
            <div className="repair-service-line-field">
              <input
                type="text"
                className="repair-service-line-input"
                value={line.name}
                disabled={disabled}
                onChange={(e) => updateLine(index, { name: e.target.value, catalog_service_id: null })}
                onFocus={() => setActiveLineIndex(index)}
                onBlur={() => {
                  window.setTimeout(() => {
                    syncLineWithCatalog(index);
                    setActiveLineIndex((current) => (current === index ? null : current));
                  }, 0);
                }}
                placeholder="Type or pick from catalog"
                aria-label={serviceLineInputAriaLabel(index, line.name)}
                aria-expanded={showSuggestions}
                aria-controls={showSuggestions ? listboxId : undefined}
                title={
                  custom
                    ? "Not in catalog — will be saved as a custom service name"
                    : matched
                      ? "Matches catalog (PDF uses catalog price when set)"
                      : undefined
                }
              />
              {showSuggestions ? (
                <div className="repair-service-suggestions" role="listbox" id={listboxId} aria-label={`Service suggestions for line ${index + 1}`}>
                  {suggestions.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      className={`repair-service-suggestion${
                        matched?.id === service.id ? " repair-service-suggestion-selected" : ""
                      }`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectCatalogService(index, service);
                      }}
                    >
                      <span className="repair-service-suggestion-name">{service.name}</span>
                      {service.price ? (
                        <span className="repair-service-suggestion-price">{service.price} PLN</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {custom ? (
                <div className="repair-service-line-custom-fields">
                  <span className="repair-service-line-hint-custom">New catalog service</span>
                  <label className="repair-service-line-price">
                    <span>Price</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      className="repair-service-line-price-input"
                      value={line.catalog_service_price}
                      disabled={disabled}
                      onChange={(e) => updateLine(index, { catalog_service_price: e.target.value })}
                      placeholder="e.g. 250"
                      aria-label={`Price for new service ${line.name || index + 1}`}
                    />
                  </label>
                </div>
              ) : null}
            </div>
            {!disabled && lines.length > 1 ? (
              <button
                type="button"
                className="button button-secondary button-sm repair-service-line-remove"
                onClick={() => removeLine(index)}
                aria-label={`Remove line ${index + 1}`}
              >
                Delete
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
