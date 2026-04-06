import { useState, type DragEvent } from "react";
import {
  formatRepairCardDateRow,
  formatRepairServicesSummary,
  getRepairStatusClass,
  REPAIR_KANBAN_COLUMNS,
  type RepairEntry,
  type RepairPartsSummary,
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
  onCopyTrackingCode: (trackingCode: string, event?: { stopPropagation?: () => void }) => void;
  repairPartSummaries: Record<string, RepairPartsSummary>;
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
  onCopyTrackingCode,
  repairPartSummaries,
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
            .filter((repair) => repair.status === status)
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
                  (() => {
                    const partsSummary = repairPartSummaries[repair.tracking_code];
                    return (
                  <article
                    key={repair.id}
                    className={`kanban-card ${draggingRepairId === repair.id ? "kanban-card-dragging" : ""} ${dragOverCardId === repair.id && draggingRepairId !== repair.id ? "kanban-card-drop-target" : ""}`}
                    draggable
                    onDragStart={(event) => onCardDragStart(repair.id, event)}
                    onDragEnd={onCardDragEnd}
                    onDragOver={(event) => onCardDragOver(repair.id, event)}
                    onDrop={(event) => onCardDrop(repair.id, status, event)}
                    onClick={() => onOpenRepair(repair)}
                  >
                    <div className="kanban-card-top">
                      <h4 className="kanban-card-vehicle">{repair.vehicle_label}</h4>
                      <span className="kanban-drag-handle" title="Drag to move">
                        ⠿
                      </span>
                    </div>

                    <p className="kanban-card-owner">
                      <span className="kanban-card-label">Client:</span> {repair.owner_name}
                    </p>
                    <p className="kanban-card-service">{formatRepairServicesSummary(repair)}</p>

                    {repair.issue_notes ? <p className="kanban-card-issue">{repair.issue_notes}</p> : null}

                    {partsSummary ? (
                      <div className="repair-parts-summary">
                        <span className="repair-parts-badge">
                          {partsSummary.lineCount} linked {partsSummary.lineCount === 1 ? "part" : "parts"}
                        </span>
                        <p className="repair-parts-preview">{partsSummary.preview.join(" • ")}</p>
                      </div>
                    ) : null}

                    <div className="kanban-card-footer">
                      <span className="tracking-chip">#{repair.tracking_code}</span>
                      <button
                        type="button"
                        className="copy-chip"
                        aria-label={`Copy tracking code ${repair.tracking_code}`}
                        onClick={(event) => void onCopyTrackingCode(repair.tracking_code, event)}
                      >
                        ⧉
                      </button>
                    </div>

                    {repair.status === "completed" && repair.mileage_at_service == null ? (
                      <p className="kanban-card-mileage-reminder" role="status">
                        Odometer (km) not set — open the card to add it.
                      </p>
                    ) : null}

                    <div className="kanban-card-meta">
                      <span>
                        <span className="kanban-card-label">Master:</span>{" "}
                        {repair.master_name || "Unassigned"}
                      </span>
                      <div className="repair-card-date-stack">
                        {formatRepairCardDateRow(repair).map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                    );
                  })()
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
