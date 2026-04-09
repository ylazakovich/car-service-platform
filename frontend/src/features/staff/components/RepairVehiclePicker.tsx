import type { Vehicle } from "../shared/vehicles";

type RepairVehiclePickerProps = {
  vehicles: Vehicle[];
  query: string;
  selectedVehicleId: string;
  onQueryChange: (value: string) => void;
  onSelect: (vehicle: Vehicle) => void;
};

function normalizeVehicleSearchValue(value: string) {
  return value.trim().toLowerCase();
}

function buildVehicleSearchText(vehicle: Vehicle) {
  return [
    vehicle.license_plate,
    vehicle.make,
    vehicle.model,
    vehicle.customer.full_name,
    vehicle.vin,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function formatRepairVehicleOptionLabel(vehicle: Vehicle) {
  return `${vehicle.license_plate} • ${vehicle.make} ${vehicle.model}`;
}

export function RepairVehiclePicker({
  vehicles,
  query,
  selectedVehicleId,
  onQueryChange,
  onSelect,
}: RepairVehiclePickerProps) {
  const normalizedQuery = normalizeVehicleSearchValue(query);
  const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === selectedVehicleId) ?? null;
  const matches = vehicles
    .filter((vehicle) => (normalizedQuery ? buildVehicleSearchText(vehicle).includes(normalizedQuery) : true))
    .slice(0, 6);

  return (
    <div className="repair-vehicle-picker">
      <input
        type="search"
        className="repair-vehicle-picker-input"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Type plate, owner, make, model or VIN"
        aria-label="Search vehicle for repair"
      />
      {selectedVehicle ? (
        <p className="repair-vehicle-picker-selected">
          Selected: <strong>{formatRepairVehicleOptionLabel(selectedVehicle)}</strong>
        </p>
      ) : null}
      <div className="repair-vehicle-picker-results" role="listbox" aria-label="Vehicle search results">
        {matches.length > 0 ? (
          matches.map((vehicle) => (
            <button
              key={vehicle.id}
              type="button"
              className={`repair-vehicle-picker-option${
                String(vehicle.id) === selectedVehicleId ? " repair-vehicle-picker-option-selected" : ""
              }`}
              onClick={() => onSelect(vehicle)}
            >
              <span className="repair-vehicle-picker-option-main">{formatRepairVehicleOptionLabel(vehicle)}</span>
              <span className="repair-vehicle-picker-option-meta">{vehicle.customer.full_name}</span>
            </button>
          ))
        ) : (
          <p className="repair-vehicle-picker-empty">No vehicles match this search.</p>
        )}
      </div>
    </div>
  );
}
