import {
  formatVehicleMeta,
  formatVehicleTitle,
  type Vehicle,
  type VehicleUiDetails,
} from "../shared/vehicles";

type StaffVehiclesMobileListProps = {
  vehicles: Vehicle[];
  getVehicleDetails: (vehicle: Vehicle) => VehicleUiDetails;
  onOpenVehicle: (vehicle: Vehicle) => void;
};

export function StaffVehiclesMobileList({
  vehicles,
  getVehicleDetails,
  onOpenVehicle,
}: StaffVehiclesMobileListProps) {
  return (
    <div className="vehicles-mobile-surface" aria-label="Mobile vehicles list">
      {vehicles.length === 0 ? (
        <div className="vehicle-mobile-empty">
          <strong>No vehicles in this view.</strong>
          <p>Adjust the search or add a new vehicle to start a staff flow.</p>
        </div>
      ) : (
        <div className="vehicle-mobile-list">
          {vehicles.map((vehicle) => {
            const details = getVehicleDetails(vehicle);
            const metaLines = formatVehicleMeta(vehicle, details).slice(0, 2);

            return (
              <article key={vehicle.id} className="vehicle-mobile-card">
                <button type="button" className="vehicle-mobile-open" onClick={() => onOpenVehicle(vehicle)}>
                  <div className="vehicle-mobile-card-top">
                    <strong>{vehicle.license_plate}</strong>
                    {details.last_service_date ? (
                      <span className="vehicle-mobile-chip">Service {details.last_service_date}</span>
                    ) : null}
                  </div>

                  <div className="vehicle-mobile-main">
                    <p>{formatVehicleTitle(vehicle)}</p>
                    <p>{vehicle.customer.full_name}</p>
                  </div>

                  {metaLines.length > 0 ? (
                    <div className="vehicle-mobile-meta">
                      {metaLines.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </div>
                  ) : null}

                  <div className="vehicle-mobile-card-footer">
                    <span className="vehicle-mobile-next-action">Open vehicle card and continue staff flow</span>
                    <span className="vehicle-mobile-open-hint">Open</span>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
