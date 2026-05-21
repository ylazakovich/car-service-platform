import { useEffect, useId, useRef } from "react";
import type { Vehicle } from "../../features/staff/shared/vehicles";
import { formatRepairVehicleOptionLabel } from "../../features/staff/components/RepairVehiclePicker";
import { RepairIcon } from "./repairIcons";

export type VehiclePickerMode = "empty" | "results" | "picked";

type VehiclePickerProps = {
  mode: VehiclePickerMode;
  vehicles: Vehicle[];
  query: string;
  selectedVehicle: Vehicle | null;
  disabled?: boolean;
  onQueryChange: (value: string) => void;
  onSelect: (vehicle: Vehicle) => void;
  onClear: () => void;
  onAddNewVehicle?: () => void;
};

function normalizeVehicleSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function buildVehicleSearchText(vehicle: Vehicle) {
  return [vehicle.license_plate, vehicle.make, vehicle.model, vehicle.customer.full_name, vehicle.vin]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterVehicles(vehicles: Vehicle[], query: string) {
  const normalizedQuery = normalizeVehicleSearchValue(query);
  return vehicles
    .filter((vehicle) => (normalizedQuery ? buildVehicleSearchText(vehicle).includes(normalizedQuery) : true))
    .slice(0, 6);
}

export function VehiclePicker({
  mode,
  vehicles,
  query,
  selectedVehicle,
  disabled,
  onQueryChange,
  onSelect,
  onClear,
  onAddNewVehicle,
}: VehiclePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = filterVehicles(vehicles, query);
  const showResults = mode === "results" && query.trim().length > 0 && !disabled;

  useEffect(() => {
    if (mode === "empty" && !disabled) {
      inputRef.current?.focus();
    }
  }, [mode, disabled]);

  if (mode === "picked" && selectedVehicle) {
    const phone = "phone" in selectedVehicle.customer ? String((selectedVehicle.customer as { phone?: string }).phone ?? "").trim() : "";
    return (
      <div className="picker-card">
        <span className="picker-card__plate">{selectedVehicle.license_plate}</span>
        <div className="picker-card__body">
          <span className="picker-card__title">
            {selectedVehicle.make} {selectedVehicle.model}
            {selectedVehicle.year ? ` · ${selectedVehicle.year}` : ""}
          </span>
          <span className="picker-card__sub">
            {selectedVehicle.customer.full_name}
            {phone ? ` · ${phone}` : ""}
          </span>
        </div>
        {!disabled ? (
          <button type="button" className="picker-card__swap" onClick={onClear}>
            Change
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        className="field"
        value={query}
        disabled={disabled}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Type plate, owner, make, model or VIN"
        aria-label="Search vehicle for repair"
        aria-autocomplete="list"
        aria-controls={showResults ? `${inputId}-results` : undefined}
        aria-expanded={showResults}
      />
      {showResults ? (
        <div className="search-results" id={`${inputId}-results`} role="listbox" aria-label="Vehicle search results">
          {matches.length > 0 ? (
            matches.map((vehicle) => {
              const selected = selectedVehicle?.id === vehicle.id;
              return (
                <button
                  key={vehicle.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`search-result${selected ? " search-result--selected" : ""}`}
                  onClick={() => onSelect(vehicle)}
                >
                  <div>
                    <div className="search-result__primary">{formatRepairVehicleOptionLabel(vehicle)}</div>
                    <div className="search-result__secondary">{vehicle.customer.full_name}</div>
                  </div>
                  {selected ? (
                    <span className="search-result__check">
                      <RepairIcon name="check" />
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <p className="field-row__hint" style={{ padding: "10px 14px", margin: 0 }}>
              No vehicles match this search.
            </p>
          )}
          {onAddNewVehicle ? (
            <button type="button" className="search-result search-result--cta" onClick={onAddNewVehicle}>
              <div>
                <div className="search-result__primary" style={{ color: "var(--accent)" }}>
                  + Add new vehicle
                </div>
                <div className="search-result__secondary">Register a vehicle that is not in the database yet.</div>
              </div>
            </button>
          ) : null}
        </div>
      ) : null}
      {mode === "empty" && onAddNewVehicle && !disabled ? (
        <button type="button" className="picker-empty-cta" onClick={onAddNewVehicle}>
          <RepairIcon name="plus" size={14} />
          <span>Or add a brand-new vehicle</span>
        </button>
      ) : null}
    </>
  );
}

export function getVehiclePickerMode(
  vehicleId: string,
  query: string
): VehiclePickerMode {
  if (vehicleId) {
    return "picked";
  }
  if (query.trim().length > 0) {
    return "results";
  }
  return "empty";
}
