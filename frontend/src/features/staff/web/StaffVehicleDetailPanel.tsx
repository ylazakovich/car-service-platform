import { useMemo } from "react";
import {
  formatRepairDisplayDate,
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

type StaffVehicleDetailPanelProps = {
  vehicle: Vehicle;
  vehicleDetails: VehicleUiDetails;
  owner: VehicleOwnerDetails | null;
  repairs: RepairEntry[];
  purchases: LinkedPurchase[];
  formatCurrency: (value: number) => string;
  getRepairStatusClass: (status: RepairEntry["status"]) => string;
  repairStatusLabels: Record<RepairEntry["status"], string>;
  onOpenRepair: (repair: RepairEntry) => void;
};

function sortRepairsNewestFirst(repairs: RepairEntry[]): RepairEntry[] {
  return [...repairs].sort((a, b) => {
    const ca = a.created_at || "";
    const cb = b.created_at || "";
    if (cb !== ca) {
      return cb.localeCompare(ca);
    }
    return b.id - a.id;
  });
}

/** Table column "km" — number only; header carries the unit. */
function formatKmTableCell(km: number | null) {
  if (km != null) {
    return km.toLocaleString("en-US");
  }
  return "—";
}

function issueTextForCompactRow(repair: RepairEntry): { line: string; title: string } {
  const issue = repair.issue_notes.trim();
  const services = formatRepairServicesSummary(repair);
  if (issue) {
    const extra = services && services !== "—" ? ` · ${services}` : "";
    return { line: issue, title: issue + extra };
  }
  if (services && services !== "—") {
    return { line: services, title: `No issue notes · ${services}` };
  }
  return { line: "—", title: "No issue notes" };
}

function formatCompletedCell(repair: RepairEntry): string {
  if (repair.status === "completed" && repair.completed_at?.trim()) {
    return formatRepairDisplayDate(repair.completed_at);
  }
  return "—";
}

export function StaffVehicleDetailPanel({
  vehicle,
  vehicleDetails,
  owner,
  repairs,
  purchases,
  formatCurrency,
  getRepairStatusClass,
  repairStatusLabels,
  onOpenRepair,
}: StaffVehicleDetailPanelProps) {
  const sortedRepairs = useMemo(() => sortRepairsNewestFirst(repairs), [repairs]);
  const lastRecordedOdometer = useMemo(
    () => getLastRecordedOdometerFromRepairs(repairs, vehicle.id),
    [repairs, vehicle.id]
  );
  const mileageMetaTitle = lastRecordedOdometer
    ? `Profile mileage: ${vehicleDetails.mileage} km. Last recorded at a visit: ${lastRecordedOdometer.km.toLocaleString("en-US")} km (${lastRecordedOdometer.tracking_code}).`
    : `Vehicle profile mileage: ${vehicleDetails.mileage} km`;

  return (
    <div className="vehicle-web-detail-surface" aria-label="Desktop vehicle details">
      <div className="detail-card vehicle-info-split">
        <div className="vehicle-info-col">
          <strong>Vehicle Info</strong>
          <VehicleHeroTitle icon={<IconCar />}>{formatVehicleTitle(vehicle)}</VehicleHeroTitle>
          <VehicleMetaRow icon={<IconLicensePlate />} text={vehicle.license_plate} title="License plate" />
          {vehicleDetails.mileage ? (
            <VehicleMetaRow icon={<IconOdometer />} text={`${vehicleDetails.mileage} km`} title={mileageMetaTitle} />
          ) : null}
          {vehicle.vin ? <VehicleVinRow vin={vehicle.vin} /> : null}
          {vehicle.color ? <VehicleMetaRow icon={<IconColor />} text={vehicle.color} title="Color" /> : null}
          {vehicle.notes ? <VehicleMetaRow icon={<IconNote />} text={vehicle.notes} title="Vehicle notes" /> : null}
        </div>

        <div className="vehicle-info-divider" />

        <div className="vehicle-info-col">
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
      </div>

      <div className="vehicle-history-section">
        <h3 className="vehicle-history-section-title">Repairs and tracking</h3>
        {sortedRepairs.length === 0 ? (
          <p className="vehicle-history-empty">No repairs linked to this vehicle yet.</p>
        ) : (
          <div className="vehicle-history-table-wrap vehicle-history-table-wrap--repairs-merged" role="region" aria-label="Repairs and act totals">
            <div className="vehicle-history-table-head" role="row">
              <span className="vehicle-history-th vehicle-history-th--issue">Issue</span>
              <span className="vehicle-history-th vehicle-history-th--created">Created</span>
              <span className="vehicle-history-th vehicle-history-th--completed">Completed</span>
              <span className="vehicle-history-th vehicle-history-th--km" title="Odometer when recorded">
                km
              </span>
              <span
                className="vehicle-history-th vehicle-history-th--numeric"
                title="Total from the latest exported completion act (PDF), if any"
              >
                Act total
              </span>
              <span className="vehicle-history-th vehicle-history-th--status">Status</span>
            </div>
            <div className="vehicle-history-table-body" role="rowgroup">
              {sortedRepairs.map((repair) => {
                const issue = issueTextForCompactRow(repair);
                const actTotal = repair.latest_act_document_total;
                return (
                  <button
                    key={repair.id}
                    type="button"
                    className={`vehicle-history-table-row vehicle-history-table-row--${repair.status}`}
                    onClick={() => onOpenRepair(repair)}
                    title={`${repair.tracking_code} — open repair`}
                  >
                    <span className="vehicle-history-td vehicle-history-td--issue">
                      <span className="vehicle-history-issue-clip" title={issue.title}>
                        {issue.line}
                      </span>
                    </span>
                    <span className="vehicle-history-td vehicle-history-td--created" title="Intake / created">
                      {formatRepairDisplayDate(repair.created_at)}
                    </span>
                    <span className="vehicle-history-td vehicle-history-td--completed" title="Completed at">
                      {formatCompletedCell(repair)}
                    </span>
                    <span
                      className={`vehicle-history-td vehicle-history-td--km${
                        repair.mileage_at_service == null ? " vehicle-history-td--km-na" : ""
                      }`}
                      title="Odometer at service (when recorded)"
                    >
                      {formatKmTableCell(repair.mileage_at_service)}
                    </span>
                    <span
                      className={`vehicle-history-td vehicle-history-td--numeric vehicle-history-td--money${
                        actTotal == null ? " vehicle-history-td--money-na" : ""
                      }`}
                      title={
                        actTotal != null
                          ? "Latest completion act total (client)"
                          : "No act yet — export PDF when the repair is completed"
                      }
                    >
                      {actTotal != null ? formatCurrency(actTotal) : "—"}
                    </span>
                    <span className="vehicle-history-td vehicle-history-td--status">
                      <span className={getRepairStatusClass(repair.status)}>{repairStatusLabels[repair.status]}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="vehicle-history-section">
        <h3 className="vehicle-history-section-title">Linked purchases</h3>
        {purchases.length === 0 ? (
          <p className="vehicle-history-empty">No purchases linked to this vehicle yet.</p>
        ) : (
          <div className="vehicle-history-table-wrap vehicle-linked-purchases-table" role="region" aria-label="Purchases for this vehicle">
            <div className="vehicle-history-table-head" role="row">
              <span className="vehicle-history-th vehicle-history-th--issue">Part</span>
              <span className="vehicle-history-th">Supplier</span>
              <span className="vehicle-history-th vehicle-history-th--numeric">Qty</span>
              <span className="vehicle-history-th vehicle-history-th--numeric">Buy</span>
              <span className="vehicle-history-th vehicle-history-th--numeric">Sell</span>
            </div>
            <div className="vehicle-history-table-body" role="rowgroup">
              {purchases.map((entry) => (
                <div key={entry.id} className="vehicle-history-table-row vehicle-purchases-table-row" role="row">
                  <span className="vehicle-history-td vehicle-history-td--issue">
                    <span className="vehicle-history-issue-clip" title={entry.part_name}>
                      {entry.part_name}
                    </span>
                  </span>
                  <span className="vehicle-history-td vehicle-history-td--created">
                    <span className="vehicle-history-issue-clip" title={entry.supplier_name}>
                      {entry.supplier_name}
                    </span>
                  </span>
                  <span className="vehicle-history-td vehicle-history-td--numeric">{entry.quantity}</span>
                  <span className="vehicle-history-td vehicle-history-td--numeric">{formatCurrency(entry.purchase_price)}</span>
                  <span className="vehicle-history-td vehicle-history-td--numeric vehicle-history-td--sell">
                    {formatCurrency(entry.sale_price)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
