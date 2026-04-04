import {
  formatVehicleDisplayDate,
  formatVehicleTitle,
  type Vehicle,
  type VehicleListGroup,
  type VehicleUiDetails,
} from "../shared/vehicles";

type StaffVehiclesRegistryProps = {
  groups: VehicleListGroup[];
  layout: "cards" | "compact";
  getVehicleDetails: (vehicle: Vehicle) => VehicleUiDetails;
  onOpenVehicle: (vehicle: Vehicle) => void;
};

export function StaffVehiclesRegistry({
  groups,
  layout,
  getVehicleDetails,
  onOpenVehicle,
}: StaffVehiclesRegistryProps) {
  const total = groups.reduce((sum, g) => sum + g.vehicles.length, 0);

  return (
    <div className="vehicle-web-surface" aria-label="Desktop vehicles registry">
      {total === 0 ? (
        <p className="workspace-note">No vehicles in this view.</p>
      ) : (
        groups.map((group) => (
          <div className="purchases-group" key={group.key}>
            {group.label ? <h3 className="purchases-group-heading">{group.label}</h3> : null}
            <div className={layout === "compact" ? "purchases-compact-list" : "purchases-group-cards"}>
              {group.vehicles.map((vehicle) => {
                const details = getVehicleDetails(vehicle);
                if (layout === "compact") {
                  return (
                    <button
                      type="button"
                      className="purchases-compact-row vehicles-compact-row"
                      key={vehicle.id}
                      onClick={() => onOpenVehicle(vehicle)}
                    >
                      <div className="vehicles-compact-row-main">
                        <span className="purchases-compact-cell purchases-compact-part">
                          <span className="purchases-compact-part-text">{vehicle.license_plate}</span>
                        </span>
                        <span className="purchases-compact-cell purchases-compact-part">
                          <span className="purchases-compact-part-text">{formatVehicleTitle(vehicle)}</span>
                        </span>
                        <span className="purchases-compact-cell purchases-compact-supplier">
                          {vehicle.customer.full_name}
                        </span>
                        <span className="purchases-compact-cell purchases-compact-narrow">
                          {details.last_service_date
                            ? formatVehicleDisplayDate(details.last_service_date)
                            : "—"}
                        </span>
                        <span className="purchases-compact-cell purchases-compact-narrow">
                          {details.mileage ? `${details.mileage} km` : "—"}
                        </span>
                      </div>
                    </button>
                  );
                }

                return (
                  <article
                    className="registry-card vehicle-registry-card vehicle-card-clickable"
                    key={vehicle.id}
                    onClick={() => onOpenVehicle(vehicle)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenVehicle(vehicle);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
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
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
