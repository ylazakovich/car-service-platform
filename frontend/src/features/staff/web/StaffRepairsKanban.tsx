import { useState, type DragEvent } from "react";
import {
  formatRepairServicesSummary,
  formatStartedAt,
  getRepairStatusClass,
  masterTint,
  repairStatusLabel,
  REPAIR_KANBAN_COLUMNS,
  type RepairEntry,
  type RepairStatus,
} from "../shared/repairs";

type StaffRepairsKanbanProps = {
  repairs: RepairEntry[];
  draggingRepairId: number | null;
  dragOverColumn: RepairStatus | null;
  onCardDragStart: (repairId: number, event: DragEvent<HTMLElement>) => void;
  onCardDragEnd: () => void;
  onColumnDragOver: (status: RepairStatus, event: DragEvent<HTMLDivElement>) => void;
  onColumnDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onColumnDrop: (status: RepairStatus, event: DragEvent<HTMLDivElement>) => void;
  dragOverCardId: number | null;
  onCardDragOver: (repairId: number, event: DragEvent<HTMLElement>) => void;
  onCardDrop: (repairId: number, status: RepairStatus, event: DragEvent<HTMLElement>) => void;
  onOpenRepair: (repair: RepairEntry) => void;
};

export function StaffRepairsKanban({
  repairs,
  draggingRepairId,
  dragOverColumn,
  onCardDragStart,
  onCardDragEnd,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
  dragOverCardId,
  onCardDragOver,
  onCardDrop,
  onOpenRepair,
}: StaffRepairsKanbanProps) {
  const DONE_CAP = 15;
  const [collapsedColumns, setCollapsedColumns] = useState<Set<RepairStatus>>(new Set());
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  function toggleColumn(status: RepairStatus) {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  return (
    <div className="repairs-web-surface" aria-label="Repairs kanban board">
      <div className="kanban-board">
        {REPAIR_KANBAN_COLUMNS.map(({ status, label }) => {
          const columnRepairs = repairs
            .filter((repair) => repair.status === status || (status === "completed" && repair.status === "picked_up"))
            .sort((a, b) => {
              if (a.position != null && b.position != null) return a.position - b.position;
              if (a.position != null) return -1;
              if (b.position != null) return 1;
              return 0;
            });
          const isDropTarget = dragOverColumn === status;
          const isCollapsed = collapsedColumns.has(status);
          const isDone = status === "completed";
          const displayedRepairs = isDone && !showAllCompleted ? columnRepairs.slice(0, DONE_CAP) : columnRepairs;
          const hiddenCount = isDone ? columnRepairs.length - DONE_CAP : 0;

          return (
            <div
              key={status}
              className={`kanban-col ${isDropTarget ? "kanban-col-drop-target" : ""}`}
              onDragOver={(event) => onColumnDragOver(status, event)}
              onDragLeave={onColumnDragLeave}
              onDrop={(event) => onColumnDrop(status, event)}
            >
              <div className="kanban-col-header">
                <span className={getRepairStatusClass(status)}>{label}</span>
                <div className="kanban-col-header-right">
                  <span className="kanban-count">{columnRepairs.length}</span>
                  <button
                    type="button"
                    className="kanban-col-collapse"
                    onClick={() => toggleColumn(status)}
                    title={isCollapsed ? "Expand column" : "Collapse column"}
                  >
                    {isCollapsed ? "▶" : "▼"}
                  </button>
                </div>
              </div>

              {isCollapsed ? null : <div className="kanban-cards">
                {displayedRepairs.map((repair) => (
                  <article
                    key={repair.id}
                    className={`kanban-card${repair.status === "picked_up" ? " kanban-card--picked-up" : ""}${draggingRepairId === repair.id ? " kanban-card-dragging" : ""}${dragOverCardId === repair.id && draggingRepairId !== repair.id ? " kanban-card-drop-target" : ""}`}
                    draggable
                    onDragStart={(event) => onCardDragStart(repair.id, event)}
                    onDragEnd={onCardDragEnd}
                    onDragOver={(event) => onCardDragOver(repair.id, event)}
                    onDrop={(event) => onCardDrop(repair.id, status, event)}
                    onClick={() => onOpenRepair(repair)}
                  >
                    <div className="kanban-card-top">
                      <span className="kanban-card-plate">{repair.vehicle_plate ?? repair.vehicle_label}</span>
                      <span className={`repair-status-chip repair-status-${repair.status}`}>
                        {repairStatusLabel(repair.status)}
                      </span>
                    </div>
                    {(() => {
                      const parts = [
                        repair.vehicle_model,
                        repair.vehicle_year,
                        repair.mileage != null ? `${repair.mileage.toLocaleString("en-US")} km` : null,
                      ].filter(Boolean);
                      return parts.length > 0 ? <p className="kanban-card-model">{parts.join(" · ")}</p> : null;
                    })()}
                    <p className="kanban-card-service">{formatRepairServicesSummary(repair)}</p>
                    {repair.issue_notes ? (
                      <p className="kanban-card-issue" title={repair.issue_notes}>{repair.issue_notes}</p>
                    ) : null}
                    <footer className="kanban-card-meta">
                      <div className="kanban-card-master">
                        <span className="kanban-card-avatar" style={masterTint(repair.master_id)}>
                          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <circle cx="10" cy="7" r="3.5"/>
                            <path d="M3 17c0-3.314 3.134-6 7-6s7 2.686 7 6"/>
                          </svg>
                        </span>
                        <span>{repair.master_name?.trim() || "Unassigned"}</span>
                      </div>
                      {repair.started_at ? <time className="kanban-card-time">{formatStartedAt(repair.started_at)}</time> : null}
                    </footer>
                    <div className="kanban-card-footer">
                      <span className="tracking-chip">#{repair.tracking_code}</span>
                    </div>
                  </article>
                ))}

                {columnRepairs.length === 0 ? (
                  <div className={`kanban-empty ${isDropTarget ? "kanban-empty-active" : ""}`}>
                    <span>{isDropTarget ? "Drop here" : "No repairs"}</span>
                  </div>
                ) : null}

                {isDone && hiddenCount > 0 && !showAllCompleted ? (
                  <button
                    type="button"
                    className="kanban-show-more"
                    onClick={() => setShowAllCompleted(true)}
                  >
                    Show {hiddenCount} more
                  </button>
                ) : null}

                {isDone && showAllCompleted && columnRepairs.length > DONE_CAP ? (
                  <button
                    type="button"
                    className="kanban-show-more"
                    onClick={() => setShowAllCompleted(false)}
                  >
                    Show less
                  </button>
                ) : null}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
