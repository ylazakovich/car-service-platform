import {
  formatVehicleDisplayDate,
  formatVehicleTitle,
  type Vehicle,
  type VehicleUiDetails,
} from "../shared/vehicles";

type StaffVehiclesRegistryProps = {
  vehicles: Vehicle[];
  getVehicleDetails: (vehicle: Vehicle) => VehicleUiDetails;
  onOpenVehicle: (vehicle: Vehicle) => void;
};

export function StaffVehiclesRegistry({
  vehicles,
  getVehicleDetails,
  onOpenVehicle,
}: StaffVehiclesRegistryProps) {
  return (
    <div className="vehicles-web-surface" aria-label="Desktop vehicles registry">
      <div className="registry-list">
        {vehicles.length === 0 ? (
          <p className="workspace-note">No vehicles yet.</p>
        ) : (
          vehicles.map((vehicle) => {
            const details = getVehicleDetails(vehicle);

            return (
              <article className="registry-card customer-card vehicle-card-clickable" key={vehicle.id} onClick={() => onOpenVehicle(vehicle)}>
                <div className="vehicle-card-body">
                  <div className="vehicle-card-info">
                    <div className="vehicle-card-chips">
                      <span className="tag">{vehicle.license_plate}</span>
                      {vehicle.vin ? <span className="purchase-chip-muted">VIN: {vehicle.vin}</span> : null}
                      {vehicle.color ? <span className="purchase-chip-muted">{vehicle.color}</span> : null}
                    </div>
                    <h4 className="vehicle-card-title">{formatVehicleTitle(vehicle)}</h4>
                    <p className="vehicle-card-owner">{vehicle.customer.full_name}</p>
                  </div>
                  <div className="vehicle-card-service">
                    {details.mileage || details.last_service_date || details.added_date ? (
                      <div className="vehicle-service-grid">
                        {details.mileage ? (
                          <>
                            <span className="vehicle-service-label">Mileage</span>
                            <span>{details.mileage} km</span>
                          </>
                        ) : null}
                        {details.last_service_date ? (
                          <>
                            <span className="vehicle-service-label">Last service</span>
                            <span>{formatVehicleDisplayDate(details.last_service_date)}</span>
                          </>
                        ) : null}
                        {details.added_date ? (
                          <>
                            <span className="vehicle-service-label">Added</span>
                            <span>{formatVehicleDisplayDate(details.added_date)}</span>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <p className="vehicle-service-empty">No service data</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
