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

type StaffVehicleDetailPanelProps = {
  vehicle: Vehicle;
  vehicleDetails: VehicleUiDetails;
  owner: VehicleOwnerDetails | null;
  repairs: RepairEntry[];
  purchases: LinkedPurchase[];
  formatCurrency: (value: number) => string;
  getRepairStatusClass: (status: RepairEntry["status"]) => string;
  repairStatusLabels: Record<RepairEntry["status"], string>;
  onCopyTrackingCode: (trackingCode: string) => void;
};

export function StaffVehicleDetailPanel({
  vehicle,
  vehicleDetails,
  owner,
  repairs,
  purchases,
  formatCurrency,
  getRepairStatusClass,
  repairStatusLabels,
  onCopyTrackingCode,
}: StaffVehicleDetailPanelProps) {
  return (
    <div className="vehicle-web-detail-surface" aria-label="Desktop vehicle details">
      <div className="detail-card vehicle-info-split">
        <div className="vehicle-info-col">
          <strong>Vehicle Info</strong>
          <p>{formatVehicleTitle(vehicle)}</p>
          {vehicleDetails.mileage ? <p>Mileage: {vehicleDetails.mileage} km</p> : null}
          {vehicleDetails.last_service_date ? <p>Last Service Date: {vehicleDetails.last_service_date}</p> : null}
          {vehicleDetails.added_date ? <p>Date Added: {vehicleDetails.added_date}</p> : null}
          {vehicle.vin ? <p>VIN: {vehicle.vin}</p> : null}
          {vehicle.color ? <p>Color: {vehicle.color}</p> : null}
          {vehicle.notes ? <p className="meta-line">{vehicle.notes}</p> : null}
        </div>

        <div className="vehicle-info-divider" />

        <div className="vehicle-info-col">
          <strong>Owner</strong>
          <p>{owner?.full_name ?? vehicle.customer.full_name}</p>
          {owner?.phone ? <p className="meta-line">{owner.phone}</p> : null}
          {owner?.email ? <p className="meta-line">{owner.email}</p> : null}
          {owner?.notes ? <p className="meta-line">{owner.notes}</p> : null}
          {!owner ? <p className="meta-line">Customer details not loaded</p> : null}
        </div>
      </div>

      <div className="detail-card">
        <strong>Repairs And Tracking</strong>
        {repairs.length === 0 ? (
          <p className="workspace-note">No repairs linked to this vehicle yet.</p>
        ) : (
          <div className="detail-list">
            {repairs.map((repair) => (
              <article className="detail-item" key={repair.id}>
                <h4>{repair.service_name}</h4>
                <p>Owner: {repair.owner_name}</p>
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

      <div className="detail-card">
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
