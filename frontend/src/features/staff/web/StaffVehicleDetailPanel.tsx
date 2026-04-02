import { useState, useEffect } from "react";
import type { RepairEntry } from "../shared/repairs";
import {
  formatVehicleDisplayDate,
  formatVehicleTitle,
  type Vehicle,
  type VehicleOwnerDetails,
  type VehicleUiDetails,
} from "../shared/vehicles";

type LinkedPurchase = {
  id: number;
  part_name: string;
  supplier_name: string;
  quantity: number;
  purchase_price: number;
  sale_price: number;
};

type VehicleRepairHistoryItem = {
  id: number;
  tracking_code: string;
  service_name: string;
  issue_notes: string;
  status: string;
  mileage_at_service: number | null;
  completed_at: string | null;
  created_at: string;
  master_name: string;
};

type StaffVehicleDetailPanelProps = {
  vehicleId: number;
  vehicle: Vehicle;
  vehicleDetails: VehicleUiDetails;
  owner: VehicleOwnerDetails | null;
  repairs: RepairEntry[];
  purchases: LinkedPurchase[];
  formatCurrency: (value: number) => string;
  getRepairStatusClass: (status: RepairEntry["status"]) => string;
  repairStatusLabels: Record<RepairEntry["status"], string>;
};

export function StaffVehicleDetailPanel({
  vehicleId,
  vehicle,
  vehicleDetails,
  owner,
  repairs,
  purchases,
  formatCurrency,
  getRepairStatusClass,
  repairStatusLabels,
}: StaffVehicleDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"info" | "history">("info");
  const [history, setHistory] = useState<VehicleRepairHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== "history") return;
    setHistoryLoading(true);
    fetch(`/api/vehicles/${vehicleId}/repairs/`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : (data.results ?? [])))
      .finally(() => setHistoryLoading(false));
  }, [activeTab, vehicleId]);

  return (
    <div className="vehicle-web-detail-surface" aria-label="Desktop vehicle details">
      <div className="vehicle-detail-tabs">
        <button
          className={`vehicle-detail-tab${activeTab === "info" ? " active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          Info
        </button>
        <button
          className={`vehicle-detail-tab${activeTab === "history" ? " active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
      </div>

      {activeTab === "info" && (
        <>
          <div className="detail-card vehicle-info-split">
            <div className="vehicle-info-col">
              <strong>Vehicle Info</strong>
              <p>{formatVehicleTitle(vehicle)}</p>
              {vehicleDetails.mileage ? <p>Mileage: {vehicleDetails.mileage} km</p> : null}
              {vehicleDetails.last_service_date ? <p>Last Service Date: {formatVehicleDisplayDate(vehicleDetails.last_service_date)}</p> : null}
              {vehicleDetails.added_date ? <p>Date Added: {formatVehicleDisplayDate(vehicleDetails.added_date)}</p> : null}
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
                    <p className="meta-line">
                      Qty {entry.quantity} • Buy {formatCurrency(entry.purchase_price)} • Sell {formatCurrency(entry.sale_price)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "history" && (
        <div className="vehicle-history-section">
          {historyLoading && <p className="vehicle-history-loading">Загрузка...</p>}
          {!historyLoading && history.length === 0 && (
            <p className="vehicle-history-empty">История ремонтов отсутствует</p>
          )}
          {!historyLoading && history.map((item) => (
            <div key={item.id} className="vehicle-history-card">
              <div className="vehicle-history-card-header">
                <span className="vehicle-history-service">{item.service_name}</span>
                <span className="vehicle-history-date">
                  {item.completed_at
                    ? new Date(item.completed_at).toLocaleDateString("en-GB")
                    : new Date(item.created_at).toLocaleDateString("en-GB")}
                </span>
              </div>
              <div className="vehicle-history-card-meta">
                {item.master_name && (
                  <span className="vehicle-history-master">Master: {item.master_name}</span>
                )}
                {item.mileage_at_service != null && (
                  <span className="vehicle-history-mileage">Mileage: {item.mileage_at_service.toLocaleString("en-US")} km</span>
                )}
              </div>
              {item.issue_notes && (
                <p className="vehicle-history-notes">{item.issue_notes}</p>
              )}
              <span className="vehicle-history-tracking">{item.tracking_code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
