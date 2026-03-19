import {
  getRepairStatusClass,
  REPAIR_KANBAN_COLUMNS,
  REPAIR_STATUS_LABELS,
  type RepairEntry,
  type RepairStatus,
  type RepairStatusFilter,
} from "../shared/repairs";

type StaffRepairsMobileListProps = {
  repairs: RepairEntry[];
  activeFilter: RepairStatusFilter;
  onFilterChange: (filter: RepairStatusFilter) => void;
  onOpenRepair: (repair: RepairEntry) => void;
  onCopyTrackingCode: (trackingCode: string, event?: { stopPropagation?: () => void }) => void;
};

function getRepairPhotoCount(repair: RepairEntry) {
  return repair.before_photos.length + repair.during_photos.length + repair.after_photos.length;
}

function getRepairNextAction(status: RepairStatus) {
  switch (status) {
    case "new":
      return "Open intake and set the first working step";
    case "in_progress":
      return "Continue the active repair update";
    case "waiting_parts":
      return "Check notes, parts status, and next update";
    case "completed":
      return "Review the summary and share tracking when needed";
    default:
      return "Open the repair card";
  }
}

export function StaffRepairsMobileList({
  repairs,
  activeFilter,
  onFilterChange,
  onOpenRepair,
  onCopyTrackingCode,
}: StaffRepairsMobileListProps) {
  const filteredRepairs =
    activeFilter === "all" ? repairs : repairs.filter((repair) => repair.status === activeFilter);

  return (
    <div className="repairs-mobile-surface" aria-label="Mobile repairs list">
      <div className="repair-mobile-filter-strip" role="tablist" aria-label="Repair status filters">
        <button
          type="button"
          className={`repair-mobile-filter ${activeFilter === "all" ? "repair-mobile-filter-active" : ""}`}
          onClick={() => onFilterChange("all")}
        >
          <span>All</span>
          <strong>{repairs.length}</strong>
        </button>

        {REPAIR_KANBAN_COLUMNS.map(({ status }) => {
          const count = repairs.filter((repair) => repair.status === status).length;
          return (
            <button
              key={status}
              type="button"
              className={`repair-mobile-filter ${
                activeFilter === status ? "repair-mobile-filter-active" : ""
              }`}
              onClick={() => onFilterChange(status)}
            >
              <span>{REPAIR_STATUS_LABELS[status]}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>

      {filteredRepairs.length === 0 ? (
        <div className="repair-mobile-empty">
          <strong>No repairs in this view.</strong>
          <p>Use another status tab or clear the search to reveal more jobs.</p>
        </div>
      ) : (
        <div className="repair-mobile-list">
          {filteredRepairs.map((repair) => (
            <article key={repair.id} className="repair-mobile-card">
              <button type="button" className="repair-mobile-open" onClick={() => onOpenRepair(repair)}>
                <div className="repair-mobile-card-top">
                  <span className={getRepairStatusClass(repair.status)}>{REPAIR_STATUS_LABELS[repair.status]}</span>
                  <span className="repair-mobile-date">{repair.created_at}</span>
                </div>

                <div className="repair-mobile-main">
                  <strong>{repair.vehicle_label}</strong>
                  <p>{repair.owner_name}</p>
                  <p>{repair.service_name}</p>
                  {repair.issue_notes ? <p className="repair-mobile-issue">{repair.issue_notes}</p> : null}
                </div>

                <div className="repair-mobile-meta">
                  <span>{repair.master_name}</span>
                  <span>{repair.repair_notes.length} notes</span>
                  <span>{getRepairPhotoCount(repair)} photos</span>
                </div>
              </button>

              <div className="repair-mobile-card-footer">
                <div className="repair-mobile-next-copy">
                  <span className="repair-mobile-next-action">{getRepairNextAction(repair.status)}</span>
                  <span className="tracking-chip">{repair.tracking_code}</span>
                </div>
                <div className="repair-mobile-card-actions">
                  <span className="repair-mobile-open-hint">Continue</span>
                  <button
                    type="button"
                    className="copy-chip"
                    aria-label={`Copy tracking code ${repair.tracking_code}`}
                    onClick={(event) => onCopyTrackingCode(repair.tracking_code, event)}
                  >
                    ⧉
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
