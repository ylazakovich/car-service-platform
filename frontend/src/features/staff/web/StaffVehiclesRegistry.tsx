import {
  formatVehicleDisplayDate,
  formatVehicleTitle,
  type Vehicle,
  type VehicleUiDetails,
} from "../shared/vehicles";

type StaffVehiclesRegistryProps = {
  vehicles: Vehicle[];
  getVehicleDetails: (vehicle: Vehicle) => VehicleUiDetails;
  /** Completed repair exists but completion act (PDF) was not exported yet. */
  vehicleNeedsActExport: (vehicleId: number) => boolean;
  onOpenVehicle: (vehicle: Vehicle) => void;
};

export function StaffVehiclesRegistry({
  vehicles,
  getVehicleDetails,
  vehicleNeedsActExport,
  onOpenVehicle,
}: StaffVehiclesRegistryProps) {
  return (
    <div className="vehicle-web-surface" aria-label="Desktop vehicles registry">
      {vehicles.length === 0 ? (
        <p className="workspace-note">No vehicles in this view.</p>
      ) : (
        <div className="purchases-compact-list">
          {vehicles.map((vehicle) => {
            const details = getVehicleDetails(vehicle);
            const needsAct = vehicleNeedsActExport(vehicle.id);
            const labelBits = [
              vehicle.license_plate,
              formatVehicleTitle(vehicle),
              vehicle.customer.full_name,
            ];
            const ariaOpen = `Open vehicle ${labelBits.join(", ")}`;
            return (
              <button
                type="button"
                className={`purchases-compact-row vehicles-compact-row${needsAct ? " vehicles-compact-row--needs-act" : ""}`}
                key={vehicle.id}
                onClick={() => onOpenVehicle(vehicle)}
                aria-label={
                  needsAct
                    ? `${ariaOpen}. Attention: completed repair without exported completion act.`
                    : ariaOpen
                }
                title={
                  needsAct
                    ? "There is a completed repair without an exported completion act (PDF). Open the vehicle to export."
                    : undefined
                }
              >
                <div className="vehicles-compact-row-main">
                  <span className="vehicle-row-act-cell" aria-hidden={!needsAct}>
                    {needsAct ? <span className="vehicle-row-act-dot" /> : null}
                  </span>
                  <span className="purchases-compact-cell purchases-compact-part vehicle-registry-plate-cell">
                    <span className="purchases-compact-part-text">{vehicle.license_plate}</span>
                  </span>
                  <span className="purchases-compact-cell purchases-compact-part">
                    <span className="purchases-compact-part-text">{formatVehicleTitle(vehicle)}</span>
                  </span>
                  <span className="purchases-compact-cell purchases-compact-supplier">
                    {vehicle.customer.full_name}
                  </span>
                  <span className="purchases-compact-cell purchases-compact-narrow">
                    {details.last_service_date ? formatVehicleDisplayDate(details.last_service_date) : "—"}
                  </span>
                  <span className="purchases-compact-cell purchases-compact-narrow">
                    {details.mileage ? `${details.mileage} km` : "—"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
