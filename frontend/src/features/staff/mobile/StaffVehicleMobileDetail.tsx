import { useMemo } from "react";
import {
  formatRepairServicesSummary,
  getLastRecordedOdometerFromRepairs,
  type RepairEntry,
} from "../shared/repairs";
import {
  formatVehicleDisplayDate,
  formatVehicleTitle,
  type Vehicle,
  type VehicleOwnerDetails,
  type VehicleUiDetails,
} from "../shared/vehicles";
import { formatPolishPhoneDisplay } from "../../../lib/formatPolishPhone";
import {
  IconCalendarAdded,
  IconCalendarService,
  IconCar,
  IconColor,
  IconEmail,
  IconLicensePlate,
  IconNote,
  IconOdometer,
  IconPhone,
  IconUser,
  VehicleHeroTitle,
  VehicleMetaRow,
  VehicleVinRow,
} from "../components/VehicleDetailMeta";

type LinkedPurchase = {
  id: number;
  part_name: string;
  supplier_name: string;
  quantity: number;
  purchase_price: number;
  sale_price: number;
};

type StaffVehicleMobileDetailProps = {
  vehicle: Vehicle;
  vehicleDetails: VehicleUiDetails;
  owner: VehicleOwnerDetails | null;
  repairs: RepairEntry[];
  purchases: LinkedPurchase[];
  formatCurrency: (value: number) => string;
  getRepairStatusClass: (status: RepairEntry["status"]) => string;
  repairStatusLabels: Record<RepairEntry["status"], string>;
  onOpenRepairs: () => void;
  onOpenRepair: (repair: RepairEntry) => void;
};

export function StaffVehicleMobileDetail({
  vehicle,
  vehicleDetails,
  owner,
  repairs,
  purchases,
  formatCurrency,
  getRepairStatusClass,
  repairStatusLabels,
  onOpenRepairs,
  onOpenRepair,
}: StaffVehicleMobileDetailProps) {
  const lastRecordedOdometer = useMemo(
    () => getLastRecordedOdometerFromRepairs(repairs, vehicle.id),
    [repairs, vehicle.id]
  );
  const mileageMetaTitle = lastRecordedOdometer
    ? `Profile mileage: ${vehicleDetails.mileage} km. Last recorded at a visit: ${lastRecordedOdometer.km.toLocaleString("en-US")} km (${lastRecordedOdometer.tracking_code}).`
    : `Vehicle profile mileage: ${vehicleDetails.mileage} km`;

  return (
    <div className="vehicle-mobile-detail-surface" aria-label="Mobile vehicle details">
      <div className="detail-card vehicle-mobile-section">
        <strong>Summary</strong>
        <div className="vehicle-mobile-plate-row">
          <span className="vehicle-detail-meta-icon" aria-hidden>
            <IconLicensePlate />
          </span>
          <p className="vehicle-mobile-license">{vehicle.license_plate}</p>
        </div>
        <VehicleHeroTitle icon={<IconCar />}>{formatVehicleTitle(vehicle)}</VehicleHeroTitle>
        <div className="vehicle-mobile-summary-meta">
          <span>{repairs.length} repairs</span>
          <span>{purchases.length} purchases</span>
        </div>
        {vehicleDetails.mileage ? (
          <VehicleMetaRow icon={<IconOdometer />} text={`${vehicleDetails.mileage} km`} title={mileageMetaTitle} />
        ) : null}
        {vehicle.vin ? <VehicleVinRow vin={vehicle.vin} /> : null}
        {vehicle.color ? <VehicleMetaRow icon={<IconColor />} text={vehicle.color} title="Color" /> : null}
        {vehicle.notes ? <VehicleMetaRow icon={<IconNote />} text={vehicle.notes} title="Vehicle notes" /> : null}

        <div className="vehicle-mobile-actions">
          <button type="button" className="button" onClick={onOpenRepairs}>
            Open Repairs
          </button>
        </div>
      </div>

      <div className="detail-card vehicle-mobile-section">
        <strong>Owner</strong>
        <VehicleHeroTitle icon={<IconUser />}>{owner?.full_name ?? vehicle.customer.full_name}</VehicleHeroTitle>
        {owner?.phone ? (
          <VehicleMetaRow
            icon={<IconPhone />}
            text={formatPolishPhoneDisplay(owner.phone)}
            title="Phone"
            textClassName="phone-display"
          />
        ) : null}
        {owner?.email ? <VehicleMetaRow icon={<IconEmail />} text={owner.email} title="Email" /> : null}
        {owner?.notes ? <VehicleMetaRow icon={<IconNote />} text={owner.notes} title="Owner notes" /> : null}
        {!owner ? <p className="meta-line">Customer details not loaded</p> : null}
        {vehicleDetails.last_service_date ? (
          <VehicleMetaRow
            icon={<IconCalendarService />}
            text={`Last service: ${formatVehicleDisplayDate(vehicleDetails.last_service_date)}`}
            title="Last workshop visit on record"
          />
        ) : null}
        {vehicleDetails.added_date ? (
          <VehicleMetaRow
            icon={<IconCalendarAdded />}
            text={`Date Added: ${formatVehicleDisplayDate(vehicleDetails.added_date)}`}
            title="Date this vehicle was added to the system"
          />
        ) : null}
      </div>

      <div className="detail-card vehicle-mobile-section">
        <strong>Repairs</strong>
        {repairs.length === 0 ? (
          <p className="workspace-note">No repairs linked to this vehicle yet.</p>
        ) : (
          <div className="vehicle-history-compact-list">
            {repairs.map((repair) => {
              const actTotal = repair.latest_act_document_total;
              return (
                <button
                  key={repair.id}
                  type="button"
                  className={`vehicle-history-compact-card vehicle-history-compact-card--${repair.status}`}
                  onClick={() => onOpenRepair(repair)}
                >
                  <div className="vehicle-history-compact-card__top">
                    <span className="vehicle-history-compact-card__title">{formatRepairServicesSummary(repair)}</span>
                    <span className={getRepairStatusClass(repair.status)}>{repairStatusLabels[repair.status]}</span>
                  </div>
                  <p className="vehicle-history-compact-card__code">{repair.tracking_code}</p>
                  <div className="vehicle-history-compact-card__meta vehicle-history-compact-card__meta--wrap">
                    <span>Master: {repair.master_name || "—"}</span>
                    <span
                      className={`vehicle-history-compact-card__km${
                        repair.mileage_at_service == null ? " vehicle-history-compact-card__km--na" : ""
                      }`}
                    >
                      {repair.mileage_at_service != null
                        ? `${repair.mileage_at_service.toLocaleString("en-US")} km`
                        : "Mileage not recorded"}
                    </span>
                    <span
                      className={
                        actTotal == null
                          ? "vehicle-history-compact-card__act vehicle-history-compact-card__act--na"
                          : "vehicle-history-compact-card__act"
                      }
                      title={
                        actTotal != null
                          ? "Act total (latest PDF)"
                          : "No act exported yet"
                      }
                    >
                      Act: {actTotal != null ? formatCurrency(actTotal) : "—"}
                    </span>
                  </div>
                  <span className="vehicle-history-compact-card__hint">View details</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="detail-card vehicle-mobile-section">
        <strong>Linked Purchases</strong>
        {purchases.length === 0 ? (
          <p className="workspace-note">No purchases linked to this vehicle yet.</p>
        ) : (
          <div className="detail-list">
            {purchases.map((entry) => (
              <article className="detail-item" key={entry.id}>
                <h4>{entry.part_name}</h4>
                <p>{entry.supplier_name}</p>
                <p className="meta-line">
                  Qty {entry.quantity} • Buy {formatCurrency(entry.purchase_price)} • Sell {formatCurrency(entry.sale_price)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
