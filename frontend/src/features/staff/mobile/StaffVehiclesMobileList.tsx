import {
  formatVehicleDisplayDate,
  formatVehicleTitle,
  type Vehicle,
  type VehicleUiDetails,
} from "../shared/vehicles";

type StaffVehiclesMobileListProps = {
  vehicles: Vehicle[];
  getVehicleDetails: (vehicle: Vehicle) => VehicleUiDetails;
  vehicleNeedsActExport: (vehicleId: number) => boolean;
  onOpenVehicle: (vehicle: Vehicle) => void;
};

export function StaffVehiclesMobileList({
  vehicles,
  getVehicleDetails,
  vehicleNeedsActExport,
  onOpenVehicle,
}: StaffVehiclesMobileListProps) {
  return (
    <div className="vehicles-mobile-surface" aria-label="Mobile vehicles list">
      {vehicles.length === 0 ? (
        <div className="purchases-empty-panel">
          <p className="workspace-note">No vehicles in this view.</p>
          <p className="workspace-note purchases-empty-copy">Adjust the search or add a new vehicle.</p>
        </div>
      ) : (
        <div className="purchases-compact-list vehicles-mobile-compact-list">
          {vehicles.map((vehicle) => {
            const details = getVehicleDetails(vehicle);
            const needsAct = vehicleNeedsActExport(vehicle.id);
            const openLabel = `${vehicle.license_plate}, ${formatVehicleTitle(vehicle)}, ${vehicle.customer.full_name}`;
            return (
              <button
                type="button"
                className={`purchases-compact-row vehicles-compact-row vehicles-mobile-list-row${needsAct ? " vehicles-compact-row--needs-act" : ""}`}
                key={vehicle.id}
                onClick={() => onOpenVehicle(vehicle)}
                aria-label={
                  needsAct
                    ? `Open vehicle ${openLabel}. Attention: completed repair without exported completion act.`
                    : `Open vehicle ${openLabel}`
                }
                title={
                  needsAct
                    ? "Completed repair without exported completion act — open vehicle to export PDF."
                    : undefined
                }
              >
                <div className="vehicles-compact-row-main vehicles-mobile-list-main">
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
