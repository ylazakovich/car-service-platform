import {
  formatVehicleDisplayDate,
  formatVehicleMeta,
  formatVehicleTitle,
  type Vehicle,
  type VehicleListGroup,
  type VehicleUiDetails,
} from "../shared/vehicles";

type StaffVehiclesMobileListProps = {
  groups: VehicleListGroup[];
  layout: "cards" | "compact";
  getVehicleDetails: (vehicle: Vehicle) => VehicleUiDetails;
  onOpenVehicle: (vehicle: Vehicle) => void;
};

export function StaffVehiclesMobileList({
  groups,
  layout,
  getVehicleDetails,
  onOpenVehicle,
}: StaffVehiclesMobileListProps) {
  const total = groups.reduce((sum, g) => sum + g.vehicles.length, 0);

  return (
    <div className="vehicles-mobile-surface" aria-label="Mobile vehicles list">
      {total === 0 ? (
        <div className="purchases-empty-panel">
          <p className="workspace-note">No vehicles in this view.</p>
          <p className="workspace-note purchases-empty-copy">Adjust the search or add a new vehicle.</p>
        </div>
      ) : (
        groups.map((group) => (
          <div className="vehicles-mobile-group" key={group.key}>
            {group.label ? <h3 className="purchases-group-heading">{group.label}</h3> : null}
            {layout === "compact" ? (
              <div className="purchases-compact-list vehicles-mobile-compact-list">
                {group.vehicles.map((vehicle) => {
                  const details = getVehicleDetails(vehicle);
                  const serviceLabel = details.last_service_date
                    ? formatVehicleDisplayDate(details.last_service_date)
                    : "—";
                  const mileageLabel = details.mileage ? `${details.mileage} km` : "—";
                  const openLabel = `${vehicle.license_plate}, ${formatVehicleTitle(vehicle)}, ${vehicle.customer.full_name}`;
                  return (
                    <button
                      type="button"
                      className="purchases-compact-row vehicles-compact-row vehicles-mobile-list-row"
                      key={vehicle.id}
                      onClick={() => onOpenVehicle(vehicle)}
                      aria-label={`Open vehicle ${openLabel}`}
                    >
                      <div className="vehicles-compact-row-main vehicles-mobile-list-main">
                        <span className="purchases-compact-cell purchases-compact-part vehicles-mobile-list-plate">
                          <span className="purchases-compact-part-text">{vehicle.license_plate}</span>
                        </span>
                        <div className="vehicles-mobile-list-meta" aria-hidden="true">
                          <span>{serviceLabel}</span>
                          <span>{mileageLabel}</span>
                        </div>
                        <span className="purchases-compact-cell purchases-compact-part vehicles-mobile-list-title">
                          <span className="purchases-compact-part-text">{formatVehicleTitle(vehicle)}</span>
                        </span>
                        <span className="purchases-compact-cell purchases-compact-supplier vehicles-mobile-list-owner">
                          {vehicle.customer.full_name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="vehicle-mobile-list">
                {group.vehicles.map((vehicle) => {
                  const details = getVehicleDetails(vehicle);
                  const metaLines = formatVehicleMeta(vehicle, details).slice(0, 2);

                  return (
                    <article key={vehicle.id} className="vehicle-mobile-card">
                      <button type="button" className="vehicle-mobile-open" onClick={() => onOpenVehicle(vehicle)}>
                        <div className="vehicle-mobile-card-top">
                          <strong>{vehicle.license_plate}</strong>
                          {details.last_service_date ? (
                            <span className="vehicle-mobile-chip">
                              Service {formatVehicleDisplayDate(details.last_service_date)}
                            </span>
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
        ))
      )}
    </div>
  );
}
