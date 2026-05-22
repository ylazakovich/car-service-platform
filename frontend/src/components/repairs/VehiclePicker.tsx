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

/**
 * Normalize a vehicle search string by trimming surrounding whitespace and converting to lowercase.
 *
 * @param value - The raw search input
 * @returns The trimmed and lowercased form of `value`
 */
function normalizeVehicleSearchValue(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Builds a lowercase searchable string for a vehicle.
 *
 * @param vehicle - Vehicle object; uses `license_plate`, `make`, `model`, `customer.full_name`, and `vin`
 * @returns A single lowercase string containing the present values of the listed fields joined by spaces
 */
function buildVehicleSearchText(vehicle: Vehicle) {
  return [vehicle.license_plate, vehicle.make, vehicle.model, vehicle.customer.full_name, vehicle.vin]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Filter a list of vehicles by a search query and return up to six matches.
 *
 * @param vehicles - The array of vehicles to search.
 * @param query - The search string; leading/trailing whitespace and case are ignored.
 * @returns An array of vehicles whose searchable fields contain the normalized query, limited to at most six items.
 */
function filterVehicles(vehicles: Vehicle[], query: string) {
  const normalizedQuery = normalizeVehicleSearchValue(query);
  return vehicles
    .filter((vehicle) => (normalizedQuery ? buildVehicleSearchText(vehicle).includes(normalizedQuery) : true))
    .slice(0, 6);
}

/**
 * Render a vehicle search-and-select picker used in repair flows.
 *
 * Displays either a compact selected-vehicle card with a "Change" action, or a searchable input
 * with a list of matching vehicles and an optional "Add new vehicle" CTA.
 *
 * @param mode - Current UI mode: `"empty"`, `"results"`, or `"picked"`
 * @param vehicles - Array of vehicles available for matching and selection
 * @param query - Current search query value shown in the input
 * @param selectedVehicle - Currently selected vehicle, if any
 * @param disabled - When true, disables input and actions
 * @param onQueryChange - Called with the new query string when the input changes
 * @param onSelect - Called with a vehicle when a search result is chosen
 * @param onClear - Called to clear the current selection (used by the "Change" action)
 * @param onAddNewVehicle - Optional callback for the "Add new vehicle" CTA
 * @returns The vehicle picker UI as a React element
 */
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

/**
 * Determine the picker mode based on the selected vehicle and search query.
 *
 * @param vehicleId - The id of the currently selected vehicle (empty string if none)
 * @param query - The current search input
 * @returns `"picked"` if `vehicleId` is non-empty, `"results"` if `query` trimmed has length greater than zero, `"empty"` otherwise
 */
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
