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
