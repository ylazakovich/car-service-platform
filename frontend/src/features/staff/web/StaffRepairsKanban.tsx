import type { DragEvent } from "react";
import {
  getRepairStatusClass,
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
  onOpenRepair: (repair: RepairEntry) => void;
  onCopyTrackingCode: (trackingCode: string, event?: { stopPropagation?: () => void }) => void;
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
  onOpenRepair,
  onCopyTrackingCode,
}: StaffRepairsKanbanProps) {
  return (
    <div className="repairs-web-surface" aria-label="Desktop repairs board">
      <div className="kanban-board">
        {REPAIR_KANBAN_COLUMNS.map(({ status, label }) => {
          const columnRepairs = repairs.filter((repair) => repair.status === status);
          const isDropTarget = dragOverColumn === status;

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
                <span className="kanban-count">{columnRepairs.length}</span>
              </div>

              <div className="kanban-cards">
                {columnRepairs.map((repair) => (
                  <article
                    key={repair.id}
                    className={`kanban-card ${draggingRepairId === repair.id ? "kanban-card-dragging" : ""}`}
                    draggable
                    onDragStart={(event) => onCardDragStart(repair.id, event)}
                    onDragEnd={onCardDragEnd}
                    onClick={() => onOpenRepair(repair)}
                  >
                    <div className="kanban-card-top">
                      <h4 className="kanban-card-vehicle">{repair.vehicle_label}</h4>
                      <span className="kanban-drag-handle" title="Drag to move">
                        ⠿
                      </span>
                    </div>

                    <p className="kanban-card-owner">{repair.owner_name}</p>
                    <p className="kanban-card-service">{repair.service_name}</p>

                    {repair.issue_notes ? <p className="kanban-card-issue">{repair.issue_notes}</p> : null}

                    <div className="kanban-card-footer">
                      <span className="tracking-chip">#{repair.tracking_code}</span>
                      <button
                        type="button"
                        className="copy-chip"
                        aria-label={`Copy tracking code ${repair.tracking_code}`}
                        onClick={(event) => onCopyTrackingCode(repair.tracking_code, event)}
                      >
                        ⧉
                      </button>
                    </div>

                    <div className="kanban-card-meta">
                      <span>{repair.master_name}</span>
                      <span>{repair.created_at}</span>
                    </div>
                  </article>
                ))}

                {columnRepairs.length === 0 ? (
                  <div className={`kanban-empty ${isDropTarget ? "kanban-empty-active" : ""}`}>
                    <span>{isDropTarget ? "Drop here" : "No repairs"}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
