import { useState } from "react";
import type { ServiceItem } from "../../api/services";
import type { RepairServiceLineDraft } from "../../features/staff/shared/repairs";
import { RepairIcon } from "./repairIcons";

type ServiceRowProps = {
  index: number;
  line: RepairServiceLineDraft;
  catalog: ServiceItem[];
  disabled?: boolean;
  removable: boolean;
  idPrefix: string;
  onChange: (patch: Partial<RepairServiceLineDraft>) => void;
  onRemove: () => void;
};

/**
 * Finds a catalog service whose name exactly matches the provided name, ignoring surrounding whitespace and case.
 *
 * @param name - The service name to match against the catalog
 * @param catalog - The list of catalog services to search
 * @returns The matching `ServiceItem` if an exact match is found after trimming and case-insensitive comparison, `null` otherwise
 */
function matchCatalog(name: string, catalog: ServiceItem[]): ServiceItem | null {
  const t = name.trim().toLowerCase();
  if (!t) {
    return null;
  }
  return catalog.find((s) => s.name.trim().toLowerCase() === t) ?? null;
}

/**
 * Produce up to six active catalog entries matching the provided service name query.
 *
 * @param name - The input text used to match service names (trimmed and matched case-insensitively).
 * @param catalog - The list of ServiceItem objects to search; only items with `is_active` truthy are considered.
 * @returns An array of up to six `ServiceItem` objects whose `name` contains the trimmed, case-insensitive `name` substring; if `name` is empty, returns the first six active items.
 */
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

/**
 * Renders an editable service line with catalog autocomplete, optional custom pricing, and a remove control.
 *
 * @param index - Zero-based row index used for display and stable element IDs
 * @param line - Current service line draft, including `name` and `catalog_service_price`
 * @param catalog - Catalog of services used for exact matching and autocomplete suggestions
 * @param disabled - When true, disables inputs and suppresses suggestion rendering
 * @param removable - Enables or disables the remove button when true/false
 * @param idPrefix - Prefix used to construct stable DOM IDs for accessibility attributes
 * @param onChange - Called with a partial patch to update the parent draft (e.g., `{ name, catalog_service_id, catalog_service_price }`)
 * @param onRemove - Called when the row's remove button is activated
 * @returns The JSX element for a single editable service row with keyboard/mouse accessible suggestions and controls
 */
export function ServiceRow({
  index,
  line,
  catalog,
  disabled,
  removable,
  idPrefix,
  onChange,
  onRemove,
}: ServiceRowProps) {
  const [active, setActive] = useState(false);
  const matched = line.name.trim() ? matchCatalog(line.name, catalog) : null;
  const custom = Boolean(line.name.trim() && !matched);
  const suggestions = filterCatalog(line.name, catalog);
  const showSuggestions = !disabled && active && suggestions.length > 0;
  const listboxId = `${idPrefix}-service-suggestions-${index}`;
  const inputId = `${idPrefix}-service-${index}`;

  function syncWithCatalog() {
    const m = matchCatalog(line.name, catalog);
    onChange({ catalog_service_id: m?.id ?? null, catalog_service_price: m ? "" : line.catalog_service_price });
  }

  return (
    <div className="service-row">
      <span className="service-row__index" aria-hidden>
        {index + 1}
      </span>
      <div style={{ position: "relative", minWidth: 0 }}>
        <input
          id={inputId}
          type="text"
          className="field"
          value={line.name}
          disabled={disabled}
          onChange={(e) => onChange({ name: e.target.value, catalog_service_id: null })}
          onFocus={() => setActive(true)}
          onBlur={() => {
            window.setTimeout(() => {
              syncWithCatalog();
              setActive(false);
            }, 0);
          }}
          placeholder="Type or pick from catalog"
          aria-label={line.name.trim() ? `Line ${index + 1}: ${line.name}` : `Line ${index + 1} service`}
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? listboxId : undefined}
        />
        {showSuggestions ? (
          <div
            className="search-results"
            role="listbox"
            id={listboxId}
            style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", zIndex: 6 }}
          >
            {suggestions.map((service) => (
              <button
                key={service.id}
                type="button"
                className={`search-result${matched?.id === service.id ? " search-result--selected" : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange({ name: service.name, catalog_service_id: service.id, catalog_service_price: "" });
                  setActive(false);
                }}
              >
                <div>
                  <div className="search-result__primary">{service.name}</div>
                  {service.price ? (
                    <div className="search-result__secondary">{service.price} PLN</div>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        ) : null}
        {custom && !disabled ? (
          <label className="field-row__hint" style={{ display: "grid", gap: 6, marginTop: 6 }}>
            <span>New catalog service — price (PLN)</span>
            <input
              type="number"
              className="field"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={line.catalog_service_price}
              onChange={(e) => onChange({ catalog_service_price: e.target.value })}
              placeholder="e.g. 250"
              aria-label={`Price for new service ${line.name || index + 1}`}
            />
          </label>
        ) : null}
      </div>
      <button
        type="button"
        className="service-row__remove"
        disabled={disabled || !removable}
        title="Remove service"
        aria-label={`Remove service line ${index + 1}`}
        onClick={onRemove}
      >
        <RepairIcon name="trash" size={14} />
      </button>
    </div>
  );
}
