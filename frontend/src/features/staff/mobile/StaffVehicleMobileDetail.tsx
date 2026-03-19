import type { RepairEntry } from "../shared/repairs";
import {
  formatVehicleTitle,
  type Vehicle,
  type VehicleOwnerDetails,
  type VehicleUiDetails,
} from "../shared/vehicles";

type LinkedPurchase = {
  id: number;
  part_name: string;
  supplier_name: string;
  repair_code: string;
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
  onCopyTrackingCode: (trackingCode: string) => void;
  onOpenRepairs: () => void;
  onClose: () => void;
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
  onCopyTrackingCode,
  onOpenRepairs,
  onClose,
}: StaffVehicleMobileDetailProps) {
  return (
    <div className="vehicle-mobile-detail-surface" aria-label="Mobile vehicle details">
      <div className="detail-card vehicle-mobile-section">
        <strong>Summary</strong>
        <p className="vehicle-mobile-license">{vehicle.license_plate}</p>
        <p>{formatVehicleTitle(vehicle)}</p>
        <div className="vehicle-mobile-summary-meta">
          <span>{repairs.length} repairs</span>
          <span>{purchases.length} purchases</span>
        </div>
        {vehicleDetails.mileage ? <p>Mileage: {vehicleDetails.mileage} km</p> : null}
        {vehicleDetails.last_service_date ? <p>Last Service: {vehicleDetails.last_service_date}</p> : null}
        {vehicleDetails.added_date ? <p>Added: {vehicleDetails.added_date}</p> : null}
        {vehicle.vin ? <p>VIN: {vehicle.vin}</p> : null}
        {vehicle.color ? <p>Color: {vehicle.color}</p> : null}
        {vehicle.notes ? <p className="meta-line">{vehicle.notes}</p> : null}

        <div className="vehicle-mobile-actions">
          <button type="button" className="button" onClick={onOpenRepairs}>
            Open Repairs
          </button>
          <button type="button" className="button button-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className="detail-card vehicle-mobile-section">
        <strong>Owner</strong>
        <p>{owner?.full_name ?? vehicle.customer.full_name}</p>
        {owner?.phone ? <p className="meta-line">{owner.phone}</p> : null}
        {owner?.email ? <p className="meta-line">{owner.email}</p> : null}
        {owner?.notes ? <p className="meta-line">{owner.notes}</p> : null}
        {!owner ? <p className="meta-line">Customer details not loaded</p> : null}
      </div>

      <div className="detail-card vehicle-mobile-section">
        <strong>Repairs</strong>
        {repairs.length === 0 ? (
          <p className="workspace-note">No repairs linked to this vehicle yet.</p>
        ) : (
          <div className="detail-list">
            {repairs.map((repair) => (
              <article className="detail-item" key={repair.id}>
                <h4>{repair.service_name}</h4>
                <p>Master: {repair.master_name}</p>
                <div className="tracking-chip-row">
                  <span className={getRepairStatusClass(repair.status)}>{repairStatusLabels[repair.status]}</span>
                </div>
                <div className="tracking-chip-row">
                  <span className="tracking-chip">Tracking: {repair.tracking_code}</span>
                  <button
                    type="button"
                    className="copy-chip"
                    aria-label={`Copy tracking code ${repair.tracking_code}`}
                    onClick={() => onCopyTrackingCode(repair.tracking_code)}
                  >
                    ⧉
                  </button>
                </div>
              </article>
            ))}
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
                <p className="meta-line">Tracking: {entry.repair_code}</p>
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
