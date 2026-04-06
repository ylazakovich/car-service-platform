import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  countRepairTasksPerVisit,
  formatRepairCardDateRow,
  getRepairStatusClass,
  REPAIR_KANBAN_COLUMNS,
  type RepairEntry,
  type RepairPartsSummary,
  type RepairStatus,
} from "../shared/repairs";

type VisitGroup = {
  visitId: number;
  tracking_code: string;
  portal_token: string;
  vehicle_id: number;
  repairs: RepairEntry[];
};

function groupRepairsByVisitInColumn(sorted: RepairEntry[]): VisitGroup[] {
  const order: number[] = [];
  const seen = new Set<number>();
  for (const r of sorted) {
    if (!seen.has(r.visit_id)) {
      seen.add(r.visit_id);
      order.push(r.visit_id);
    }
  }
  return order.map((visitId) => {
    const repairs = sorted
      .filter((r) => r.visit_id === visitId)
      .sort((a, b) => {
        if (a.position != null && b.position != null) return a.position - b.position;
        if (a.position != null) return -1;
        if (b.position != null) return 1;
        return a.id - b.id;
      });
    const head = repairs[0]!;
    return {
      visitId,
      tracking_code: head.tracking_code,
      portal_token: head.portal_token,
      vehicle_id: head.vehicle_id,
      repairs,
    };
  });
}

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
  onCopyPortalLink?: (portalToken: string, event?: { stopPropagation?: () => void }) => void | Promise<void>;
  onAddTaskToVisit: (visitId: number, vehicleId: number) => void;
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
  onCopyPortalLink,
  onAddTaskToVisit,
  repairPartSummaries,
}: StaffRepairsKanbanProps) {
  const DONE_CAP = 15;
  const [collapsedColumns, setCollapsedColumns] = useState<Set<RepairStatus>>(new Set());
  const [showAllCompleted, setShowAllCompleted] = useState(false);
  const [linkedVisitId, setLinkedVisitId] = useState<number | null>(null);
  /** Repair row under pointer; null = hover is on visit chrome only (e.g. group header). */
  const [focusedRepairId, setFocusedRepairId] = useState<number | null>(null);
  const linkClearTimerRef = useRef<number | null>(null);

  const visitTaskCounts = useMemo(() => countRepairTasksPerVisit(repairs), [repairs]);

  useEffect(() => {
    if (draggingRepairId != null) {
      setLinkedVisitId(null);
      setFocusedRepairId(null);
    }
  }, [draggingRepairId]);

  useEffect(
    () => () => {
      if (linkClearTimerRef.current != null) {
        window.clearTimeout(linkClearTimerRef.current);
      }
    },
    []
  );

  function isMultiTaskVisit(visitId: number) {
    return (visitTaskCounts.get(visitId) ?? 0) > 1;
  }

  function beginVisitLink(visitId: number, repairId: number | null) {
    if (!isMultiTaskVisit(visitId)) {
      return;
    }
    if (linkClearTimerRef.current != null) {
      window.clearTimeout(linkClearTimerRef.current);
      linkClearTimerRef.current = null;
    }
    setLinkedVisitId(visitId);
    setFocusedRepairId(repairId);
  }

  function scheduleEndVisitLink(visitId: number) {
    if (!isMultiTaskVisit(visitId)) {
      return;
    }
    if (linkClearTimerRef.current != null) {
      window.clearTimeout(linkClearTimerRef.current);
    }
    linkClearTimerRef.current = window.setTimeout(() => {
      setLinkedVisitId(null);
      setFocusedRepairId(null);
      linkClearTimerRef.current = null;
    }, 100);
  }

  function handleCardMouseLeave(repair: RepairEntry, event: ReactMouseEvent<HTMLElement>) {
    if (!isMultiTaskVisit(repair.visit_id)) {
      return;
    }
    const next = event.relatedTarget;
    const group = event.currentTarget.closest(".kanban-visit-group");
    if (group && next instanceof Node && group.contains(next)) {
      return;
    }
    scheduleEndVisitLink(repair.visit_id);
  }

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

  function visitLinkCardClass(repair: RepairEntry, insideVisitGroup: boolean) {
    // Dim every non-linked card while highlighting a multi-task visit — not only other
    // multi-task rows (single-task repairs were staying full-brightness / yellow chips).
    if (linkedVisitId == null || !isMultiTaskVisit(linkedVisitId)) {
      return "";
    }
    if (repair.visit_id !== linkedVisitId) {
      return insideVisitGroup ? "" : "kanban-card-visit-dimmed";
    }
    if (focusedRepairId === repair.id) {
      return "kanban-card-visit-linked";
    }
    return "kanban-card-visit-sibling";
  }

  function visitLinkGroupClass(visitId: number, repairsInGroup: RepairEntry[]) {
    if (linkedVisitId == null || !isMultiTaskVisit(linkedVisitId)) {
      return "";
    }
    if (visitId !== linkedVisitId) {
      return "kanban-visit-group-dimmed";
    }
    const focusInside =
      focusedRepairId != null && repairsInGroup.some((task) => task.id === focusedRepairId);
    if (focusInside) {
      return "";
    }
    return "kanban-visit-group-linked";
  }

  function renderRepairCard(repair: RepairEntry, status: RepairStatus, insideVisitGroup = false) {
    const partsSummary = repairPartSummaries[repair.tracking_code];
    const visitTotal = visitTaskCounts.get(repair.visit_id) ?? 1;
    return (
      <article
        key={repair.id}
        className={`kanban-card ${draggingRepairId === repair.id ? "kanban-card-dragging" : ""} ${dragOverCardId === repair.id && draggingRepairId !== repair.id ? "kanban-card-drop-target" : ""} ${visitLinkCardClass(repair, insideVisitGroup)}`}
        draggable
        onDragStart={(event) => onCardDragStart(repair.id, event)}
        onDragEnd={onCardDragEnd}
        onDragOver={(event) => onCardDragOver(repair.id, event)}
        onDrop={(event) => onCardDrop(repair.id, status, event)}
        onClick={() => onOpenRepair(repair)}
        onMouseEnter={() => beginVisitLink(repair.visit_id, repair.id)}
        onMouseLeave={(event) => handleCardMouseLeave(repair, event)}
      >
        <div className="kanban-card-top">
          <h4 className="kanban-card-vehicle">{repair.vehicle_label}</h4>
          <span className="kanban-drag-handle" title="Drag to move">
            ⠿
          </span>
        </div>

        {visitTotal > 1 ? (
          <p className="kanban-visit-task-badge" title="Several jobs share this visit, client link, and completion act.">
            Visit · {visitTotal} tasks
          </p>
        ) : null}

        <p className="kanban-card-owner">
          <span className="kanban-card-label">Client:</span> {repair.owner_name}
        </p>
        <p className="kanban-card-service">{repair.service_name}</p>

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

        <div className="kanban-card-meta">
          <span>
            <span className="kanban-card-label">Master:</span> {repair.master_name || "Unassigned"}
          </span>
          <div className="repair-card-date-stack">
            {formatRepairCardDateRow(repair).map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </article>
    );
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
          const visitGroups = groupRepairsByVisitInColumn(displayedRepairs);

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

              {isCollapsed ? null : (
                <div className="kanban-cards">
                  {visitGroups.map((group) =>
                    group.repairs.length === 1 ? (
                      renderRepairCard(group.repairs[0]!, status)
                    ) : (
                      <div
                        className={`kanban-visit-group ${visitLinkGroupClass(group.visitId, group.repairs)}`}
                        key={`visit-${group.visitId}-${status}`}
                        onMouseEnter={() => beginVisitLink(group.visitId, null)}
                        onMouseLeave={(event) => {
                          const next = event.relatedTarget;
                          if (next instanceof Node && event.currentTarget.contains(next)) {
                            return;
                          }
                          scheduleEndVisitLink(group.visitId);
                        }}
                      >
                        <div className="kanban-visit-group-header">
                          <span className="kanban-visit-group-title">Visit</span>
                          <span className="tracking-chip kanban-visit-group-code">#{group.tracking_code}</span>
                          <span className="kanban-visit-group-count">{group.repairs.length} tasks</span>
                          {onCopyPortalLink ? (
                            <button
                              type="button"
                              className="copy-chip kanban-visit-group-portal"
                              aria-label="Copy client portal link for this visit"
                              onClick={(event) => void onCopyPortalLink(group.portal_token, event)}
                            >
                              Portal ⧉
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="button button-sm kanban-visit-add-task"
                            onClick={(event) => {
                              event.stopPropagation();
                              onAddTaskToVisit(group.visitId, group.vehicle_id);
                            }}
                          >
                            + Task
                          </button>
                        </div>
                        <div className="kanban-visit-group-cards">
                          {group.repairs.map((r) => renderRepairCard(r, status, true))}
                        </div>
                      </div>
                    )
                  )}

                  {columnRepairs.length === 0 ? (
                    <div className={`kanban-empty ${isDropTarget ? "kanban-empty-active" : ""}`}>
                      <span>{isDropTarget ? "Drop here" : "No repairs"}</span>
                    </div>
                  ) : null}

                  {isDone && hiddenCount > 0 && !showAllCompleted ? (
                    <button type="button" className="kanban-show-more" onClick={() => setShowAllCompleted(true)}>
                      Show {hiddenCount} more
                    </button>
                  ) : null}

                  {isDone && showAllCompleted && columnRepairs.length > DONE_CAP ? (
                    <button type="button" className="kanban-show-more" onClick={() => setShowAllCompleted(false)}>
                      Show less
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
