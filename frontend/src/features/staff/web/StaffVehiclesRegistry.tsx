import {
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
              <article className="registry-card customer-card" key={vehicle.id} onClick={() => onOpenVehicle(vehicle)}>
                <div>
                  <h4>{vehicle.license_plate}</h4>
                  <p>{formatVehicleTitle(vehicle)}</p>
                  <p>{vehicle.customer.full_name}</p>
                  {details.mileage ? <p className="meta-line">Mileage: {details.mileage} km</p> : null}
                  {details.last_service_date ? <p className="meta-line">Last Service: {details.last_service_date}</p> : null}
                  {details.added_date ? <p className="meta-line">Added: {details.added_date}</p> : null}
                  {vehicle.vin ? <p className="meta-line">VIN: {vehicle.vin}</p> : null}
                  {vehicle.color ? <p className="meta-line">Color: {vehicle.color}</p> : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
