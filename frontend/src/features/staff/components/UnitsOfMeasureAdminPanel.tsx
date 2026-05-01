import axios from "axios";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from "react";
import {
  createUnitOfMeasure,
  deleteUnitOfMeasure,
  fetchUnitsOfMeasure,
  reorderUnitsOfMeasure,
  updateUnitOfMeasure,
  type UnitOfMeasureItem,
} from "../../../api/purchases";
import { REGISTERS_MOBILE_BREAKPOINT, useMediaQuery } from "../hooks/useMediaQuery";
import { RegistersHelpDisclosure } from "./RegistersHelpDisclosure";

function useUnitRowEditing(
  unit: UnitOfMeasureItem,
  onReload: () => Promise<void>,
  onSaved: () => void | Promise<void>,
) {
  const [name, setName] = useState(unit.name);
  const [isActive, setIsActive] = useState(unit.is_active);
  const [busy, setBusy] = useState(false);
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    setName(unit.name);
    setIsActive(unit.is_active);
  }, [unit.id, unit.name, unit.is_active]);

  const dirty = name.trim() !== unit.name || isActive !== unit.is_active;

  async function handleSave() {
    setBusy(true);
    setRowError("");
    try {
      await updateUnitOfMeasure(unit.id, {
        name: name.trim(),
        is_active: isActive,
      });
      await onReload();
      void onSaved();
    } catch (e) {
      setRowError(axios.isAxiosError(e) ? String(e.response?.data?.detail ?? e.message) : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return {
    name,
    setName,
    isActive,
    setIsActive,
    busy,
    rowError,
    dirty,
    handleSave,
  };
}

type UnitsOfMeasureAdminPanelProps = {
  sectionEyebrow: string;
  sectionTitle: string;
  sectionCopy: string;
  /** After any successful create/update/delete so purchase forms reload the active catalog. */
  onSaved: () => void | Promise<void>;
  /** When true, omit the outer top bar (parent Registers workspace provides title and tabs). */
  embedded?: boolean;
};

const UOM_DRAG_MIME = "unit-of-measure-id";

function UnitRow({
  unit,
  onReload,
  onSaved,
  onDeleteRequest,
  reorderBusy,
  draggingId,
  onDragStartRow,
  onDragEndRow,
  onDragOverRow,
  onDragLeaveRow,
  onDropOnRow,
  isDropTarget,
  reorderLocked,
}: {
  unit: UnitOfMeasureItem;
  onReload: () => Promise<void>;
  onSaved: () => void | Promise<void>;
  onDeleteRequest: (unit: UnitOfMeasureItem) => void;
  reorderBusy: boolean;
  draggingId: number | null;
  onDragStartRow: (e: DragEvent<HTMLElement>, unitId: number) => void;
  onDragEndRow: () => void;
  onDragOverRow: (e: DragEvent, rowId: number) => void;
  onDragLeaveRow: (e: DragEvent<HTMLElement>, rowId: number) => void;
  onDropOnRow: (e: DragEvent, targetId: number) => void;
  isDropTarget: boolean;
  reorderLocked: boolean;
}) {
  const { name, setName, isActive, setIsActive, busy, rowError, dirty, handleSave } = useUnitRowEditing(
    unit,
    onReload,
    onSaved,
  );

  const rowDisabled = busy || reorderBusy;

  return (
    <tr
      className={`uom-kanban-row${draggingId === unit.id ? " kanban-card-dragging" : ""}${isDropTarget ? " kanban-card-drop-target" : ""}${reorderLocked ? " uom-kanban-row--reorder-locked" : ""}`}
      draggable={!rowDisabled && !reorderLocked}
      onDragStart={(e) => onDragStartRow(e, unit.id)}
      onDragEnd={onDragEndRow}
      onDragOver={(e) => onDragOverRow(e, unit.id)}
      onDragLeave={(e) => onDragLeaveRow(e, unit.id)}
      onDrop={(e) => onDropOnRow(e, unit.id)}
    >
      <td className="uom-admin-order-cell">
        <div className="uom-admin-order-cluster">
          <span
            className="kanban-drag-handle uom-row-drag-handle"
            aria-hidden
            title={reorderLocked ? "Clear search to reorder" : "Drag to move"}
          >
            ⠿
          </span>
        </div>
      </td>
      <td>
        <code>{unit.code}</code>
      </td>
      <td>
        <input
          type="text"
          className="uom-admin-cell-input uom-admin-cell-input--compact"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          disabled={busy}
          aria-label={`Display name for ${unit.code}`}
        />
      </td>
      <td>
        <div className="services-active-toggle" role="group" aria-label={`Status for ${unit.code}`}>
          <button
            type="button"
            className={`services-active-toggle__btn${!isActive ? " services-active-toggle__btn--selected-inactive" : ""}`}
            aria-pressed={!isActive}
            disabled={busy}
            onClick={() => setIsActive(false)}
          >
            Inactive
          </button>
          <button
            type="button"
            className={`services-active-toggle__btn${isActive ? " services-active-toggle__btn--selected-active" : ""}`}
            aria-pressed={isActive}
            disabled={busy}
            onClick={() => setIsActive(true)}
          >
            Active
          </button>
        </div>
      </td>
      <td>
        <div className="uom-admin-row-actions">
          <button type="button" className="button button-secondary" disabled={busy || !dirty} onClick={() => void handleSave()}>
            Save
          </button>
          <button
            type="button"
            className="button button-danger uom-delete-row-btn"
            disabled={busy}
            onClick={() => onDeleteRequest(unit)}
          >
            Delete
          </button>
        </div>
        {rowError ? <p className="workspace-note uom-admin-row-error">{rowError}</p> : null}
      </td>
    </tr>
  );
}

function UnitRowMobile({
  unit,
  expanded,
  onToggleExpanded,
  onReload,
  onSaved,
  onDeleteRequest,
  reorderBusy,
  draggingId,
  onDragStartRow,
  onDragEndRow,
  onDragOverRow,
  onDragLeaveRow,
  onDropOnRow,
  isDropTarget,
  reorderLocked,
}: {
  unit: UnitOfMeasureItem;
  expanded: boolean;
  onToggleExpanded: () => void;
  onReload: () => Promise<void>;
  onSaved: () => void | Promise<void>;
  onDeleteRequest: (unit: UnitOfMeasureItem) => void;
  reorderBusy: boolean;
  draggingId: number | null;
  onDragStartRow: (e: DragEvent<HTMLElement>, unitId: number) => void;
  onDragEndRow: () => void;
  onDragOverRow: (e: DragEvent, rowId: number) => void;
  onDragLeaveRow: (e: DragEvent<HTMLElement>, rowId: number) => void;
  onDropOnRow: (e: DragEvent, targetId: number) => void;
  isDropTarget: boolean;
  reorderLocked: boolean;
}) {
  const summaryId = useId();
  const detailRegionId = useId();
  const { name, setName, isActive, setIsActive, busy, rowError, dirty, handleSave } = useUnitRowEditing(unit, onReload, onSaved);
  const rowDisabled = busy || reorderBusy;
  const displayName = name.trim() || unit.name;

  return (
    <li
      className={`uom-mobile-unit-item${expanded ? " uom-mobile-unit-item--expanded" : ""}${draggingId === unit.id ? " uom-mobile-unit-item--dragging kanban-card-dragging" : ""}${isDropTarget ? " kanban-card-drop-target" : ""}${reorderLocked ? " uom-mobile-unit-item--reorder-locked" : ""}`}
      onDragOver={(e) => onDragOverRow(e, unit.id)}
      onDragLeave={(e) => onDragLeaveRow(e, unit.id)}
      onDrop={(e) => onDropOnRow(e, unit.id)}
    >
      <button
        id={summaryId}
        type="button"
        className={`uom-mobile-unit-summary uom-mobile-unit-summary--${isActive ? "on" : "off"}`}
        aria-expanded={expanded}
        aria-controls={detailRegionId}
        onClick={onToggleExpanded}
      >
        <span className="uom-mobile-unit-summary-accent" aria-hidden />
        <span className="uom-mobile-unit-summary-text">
          <span className="uom-mobile-unit-name">{displayName}</span>
          <code className="uom-mobile-unit-code">{unit.code}</code>
        </span>
        <span className="uom-mobile-unit-status-pill" data-active={isActive ? "true" : "false"}>
          {isActive ? "On" : "Off"}
        </span>
        <span className={`uom-mobile-unit-chevron${expanded ? " uom-mobile-unit-chevron--open" : ""}`} aria-hidden>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {expanded ? (
        <div
          id={detailRegionId}
          role="region"
          aria-labelledby={summaryId}
          className="uom-mobile-unit-detail"
        >
          {reorderLocked ? (
            <p className="workspace-note uom-mobile-unit-reorder-note">Clear search to drag rows and reorder.</p>
          ) : null}
          <div
            className={`uom-mobile-drag-handle${rowDisabled || reorderLocked ? " uom-mobile-drag-handle--disabled" : ""}`}
            draggable={!rowDisabled && !reorderLocked}
            onDragStart={(e) => onDragStartRow(e, unit.id)}
            onDragEnd={onDragEndRow}
          >
            <span aria-hidden>⠿</span>
            <span>{reorderLocked ? "Reorder locked" : "Drag to reorder"}</span>
          </div>

          <label className="uom-mobile-field">
            <span>Code</span>
            <code className="uom-mobile-code-readonly">{unit.code}</code>
          </label>

          <label className="uom-mobile-field">
            <span>Name</span>
            <input
              type="text"
              className="uom-admin-cell-input"
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              disabled={busy}
              aria-label={`Display name for ${unit.code}`}
            />
          </label>

          <div className="uom-mobile-field">
            <span className="uom-mobile-field-label">Status</span>
            <div className="services-active-toggle" role="group" aria-label={`Status for ${unit.code}`}>
              <button
                type="button"
                className={`services-active-toggle__btn${!isActive ? " services-active-toggle__btn--selected-inactive" : ""}`}
                aria-pressed={!isActive}
                disabled={busy}
                onClick={() => setIsActive(false)}
              >
                Inactive
              </button>
              <button
                type="button"
                className={`services-active-toggle__btn${isActive ? " services-active-toggle__btn--selected-active" : ""}`}
                aria-pressed={isActive}
                disabled={busy}
                onClick={() => setIsActive(true)}
              >
                Active
              </button>
            </div>
          </div>

          <div className="uom-mobile-unit-actions">
            <button type="button" className="button button-secondary" disabled={busy || !dirty} onClick={() => void handleSave()}>
              Save
            </button>
            <button
              type="button"
              className="button button-danger uom-delete-row-btn"
              disabled={busy}
              onClick={() => onDeleteRequest(unit)}
            >
              Delete
            </button>
          </div>
          {rowError ? <p className="workspace-note uom-admin-row-error">{rowError}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

export function UnitsOfMeasureAdminPanel({
  sectionEyebrow,
  sectionTitle,
  sectionCopy,
  onSaved,
  embedded = false,
}: UnitsOfMeasureAdminPanelProps) {
  const deleteDialogTitleId = useId();
  const addUnitDialogTitleId = useId();
  const [units, setUnits] = useState<UnitOfMeasureItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UnitOfMeasureItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState("");
  const [reorderBusy, setReorderBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<number | null>(null);
  const draggingIdRef = useRef<number | null>(null);
  const [uomSearch, setUomSearch] = useState("");
  const uomQuery = useDeferredValue(uomSearch.trim().toLowerCase());
  const reorderLocked = uomQuery.length > 0;
  const compactUnitsLayout = useMediaQuery(REGISTERS_MOBILE_BREAKPOINT);
  const [expandedMobileUnitId, setExpandedMobileUnitId] = useState<number | null>(null);
  const filteredUnits = useMemo(() => {
    if (!uomQuery) return units;
    return units.filter(
      (u) => u.code.toLowerCase().includes(uomQuery) || u.name.toLowerCase().includes(uomQuery),
    );
  }, [units, uomQuery]);

  useEffect(() => {
    if (expandedMobileUnitId === null) return;
    if (!filteredUnits.some((u) => u.id === expandedMobileUnitId)) {
      setExpandedMobileUnitId(null);
    }
  }, [filteredUnits, expandedMobileUnitId]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchUnitsOfMeasure({ includeInactive: true });
      setUnits(data);
    } catch {
      setLoadError("Failed to load units of measure.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!deleteTarget) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleteBusy) {
        setDeleteTarget(null);
        setDeleteModalError("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget, deleteBusy]);

  useEffect(() => {
    if (!addUnitOpen) return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !createBusy) {
        setAddUnitOpen(false);
        setCreateError("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addUnitOpen, createBusy]);

  function closeAddModal() {
    if (createBusy) return;
    setAddUnitOpen(false);
    setCreateError("");
  }

  async function applyOrder(ids: number[]) {
    setReorderBusy(true);
    setLoadError("");
    try {
      const data = await reorderUnitsOfMeasure(ids);
      setUnits(data);
      void onSaved();
    } catch {
      setLoadError("Could not save order. Please try again.");
      await load();
    } finally {
      setReorderBusy(false);
    }
  }

  function handleDragStartRow(e: DragEvent<HTMLElement>, unitId: number) {
    if (reorderLocked) {
      e.preventDefault();
      return;
    }
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea, select, label")) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(UOM_DRAG_MIME, String(unitId));
    e.dataTransfer.setData("text/plain", String(unitId));
    e.dataTransfer.effectAllowed = "move";
    draggingIdRef.current = unitId;
    setDragOverRowId(null);
    setDraggingId(unitId);
  }

  function handleDragEndRow() {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverRowId(null);
  }

  function handleDragOverRow(e: DragEvent, rowId: number) {
    if (reorderLocked) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const active = draggingIdRef.current;
    if (active !== null && rowId !== active) {
      setDragOverRowId(rowId);
    }
  }

  function handleDragLeaveRow(e: DragEvent<HTMLElement>, rowId: number) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverRowId((current) => (current === rowId ? null : current));
    }
  }

  function handleDropOnRow(e: DragEvent, targetId: number) {
    if (reorderLocked) return;
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData(UOM_DRAG_MIME) || e.dataTransfer.getData("text/plain");
    const fromId = Number.parseInt(raw, 10);
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverRowId(null);
    if (!Number.isFinite(fromId) || fromId === targetId) return;
    const from = units.findIndex((u) => u.id === fromId);
    if (from < 0) return;
    const next = [...units];
    const [row] = next.splice(from, 1);
    const insertBefore = next.findIndex((u) => u.id === targetId);
    if (insertBefore < 0) return;
    next.splice(insertBefore, 0, row);
    void applyOrder(next.map((u) => u.id));
  }

  function closeDeleteModal() {
    if (deleteBusy) return;
    setDeleteTarget(null);
    setDeleteModalError("");
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteModalError("");
    try {
      await deleteUnitOfMeasure(deleteTarget.id);
      await load();
      void onSaved();
      setDeleteTarget(null);
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const detail = e.response?.data?.detail;
        setDeleteModalError(typeof detail === "string" ? detail : "Cannot remove this unit.");
      } else {
        setDeleteModalError("Remove failed.");
      }
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const code = newCode.trim().toLowerCase().replace(/\s+/g, "-");
    const name = newName.trim();
    if (!code || !name) {
      setCreateError("Code and name are required.");
      return;
    }
    setCreateBusy(true);
    setCreateError("");
    try {
      await createUnitOfMeasure({ code, name, is_active: true });
      setNewCode("");
      setNewName("");
      setAddUnitOpen(false);
      await load();
      void onSaved();
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const body = e.response?.data;
        const detail = typeof body?.detail === "string" ? body.detail : null;
        const codeErr = body?.code;
        setCreateError(detail ?? (Array.isArray(codeErr) ? codeErr.join(" ") : "Could not create unit."));
      } else {
        setCreateError("Could not create unit.");
      }
    } finally {
      setCreateBusy(false);
    }
  }

  function toggleMobileUnitRow(unitId: number) {
    setExpandedMobileUnitId((cur) => (cur === unitId ? null : unitId));
  }

  return (
    <>
      {embedded ? null : (
        <div className="kanban-topbar purchases-section-topbar reference-section-topbar">
          <div>
            <p className="eyebrow">{sectionEyebrow}</p>
            <h2>{sectionTitle}</h2>
            <p className="workspace-copy">{sectionCopy}</p>
          </div>
          <div className="workspace-top-actions purchases-top-actions">
            <button
              type="button"
              className="button"
              onClick={() => {
                setAddUnitOpen(true);
                setCreateError("");
              }}
              disabled={loading}
            >
              + Add unit
            </button>
          </div>
        </div>
      )}

      <section className="uom-admin-page" aria-labelledby="uom-admin-title">
        {embedded ? (
          <div className="registers-embedded-section-head">
            <h3 id="uom-admin-title" className="uom-admin-subtitle">
              Units of measure
            </h3>
            <button
              type="button"
              className="button"
              onClick={() => {
                setAddUnitOpen(true);
                setCreateError("");
              }}
              disabled={loading}
            >
              + Add unit
            </button>
          </div>
        ) : (
          <h3 id="uom-admin-title" className="uom-admin-subtitle">
            Units of measure
          </h3>
        )}
        <RegistersHelpDisclosure summary="How units work">
          <p className="workspace-note uom-admin-lead registers-help-disclosure-inner">
            <strong>Order</strong> = order in purchase dropdowns (top = first). <strong>Code</strong> cannot be changed later.{" "}
            <strong>Active</strong> = shown on new lines; off = hidden for new lines only. Drag a row like <strong>Repairs</strong>{" "}
            kanban cards (not from inputs or buttons). While dragging, the row you move is faded; the{" "}
            <strong className="uom-accent-inline">highlighted row</strong> is where it will land (insert before that row).
          </p>
        </RegistersHelpDisclosure>

        <div className="registers-search-toolbar">
          <label className="registers-search-field">
            <span>Search</span>
            <input
              type="search"
              value={uomSearch}
              onChange={(ev) => setUomSearch(ev.target.value)}
              placeholder="Code or display name…"
              autoComplete="off"
              aria-label="Search units of measure"
            />
          </label>
        </div>
        {reorderLocked ? (
          <p className="workspace-note registers-search-hint">Clear search to drag-and-drop reorder the full list.</p>
        ) : null}

      {loadError ? <p className="workspace-note">{loadError}</p> : null}

      {loading ? <p className="workspace-note">Loading…</p> : null}

      {!loading && !loadError ? (
        <>
          {compactUnitsLayout ? (
            <ul className="uom-mobile-unit-list" aria-label="Units of measure">
              {filteredUnits.length === 0 ? (
                <li className="uom-mobile-unit-empty">
                  <p className="workspace-note">
                    {units.length === 0 ? "No units yet." : "No units match this search."}
                  </p>
                </li>
              ) : (
                filteredUnits.map((u) => (
                  <UnitRowMobile
                    key={u.id}
                    unit={u}
                    expanded={expandedMobileUnitId === u.id}
                    onToggleExpanded={() => toggleMobileUnitRow(u.id)}
                    onReload={load}
                    onSaved={onSaved}
                    reorderBusy={reorderBusy}
                    draggingId={draggingId}
                    onDragStartRow={handleDragStartRow}
                    onDragEndRow={handleDragEndRow}
                    onDragOverRow={handleDragOverRow}
                    onDragLeaveRow={handleDragLeaveRow}
                    onDropOnRow={handleDropOnRow}
                    isDropTarget={
                      !reorderLocked && dragOverRowId === u.id && draggingId !== null && draggingId !== u.id
                    }
                    reorderLocked={reorderLocked}
                    onDeleteRequest={(row) => {
                      setDeleteTarget(row);
                      setDeleteModalError("");
                    }}
                  />
                ))
              )}
            </ul>
          ) : (
            <div className="uom-admin-table-wrap registers-table-wrap registers-units-table-wrap">
              <table className="uom-admin-table uom-admin-table--compact uom-admin-table--kanban registers-editor-table registers-units-table">
                <thead>
                  <tr>
                    <th scope="col" className="uom-admin-order-th" aria-label="Drag handle">
                      <span aria-hidden>⠿</span>
                    </th>
                    <th scope="col">Code</th>
                    <th scope="col">Name</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <p className="workspace-note">
                          {units.length === 0 ? "No units yet." : "No units match this search."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUnits.map((u) => (
                      <UnitRow
                        key={u.id}
                        unit={u}
                        onReload={load}
                        onSaved={onSaved}
                        reorderBusy={reorderBusy}
                        draggingId={draggingId}
                        onDragStartRow={handleDragStartRow}
                        onDragEndRow={handleDragEndRow}
                        onDragOverRow={handleDragOverRow}
                        onDragLeaveRow={handleDragLeaveRow}
                        onDropOnRow={handleDropOnRow}
                        isDropTarget={
                          !reorderLocked && dragOverRowId === u.id && draggingId !== null && draggingId !== u.id
                        }
                        reorderLocked={reorderLocked}
                        onDeleteRequest={(row) => {
                          setDeleteTarget(row);
                          setDeleteModalError("");
                        }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
      </section>

      {addUnitOpen ? (
        <div className="modal-overlay uom-add-overlay" role="presentation" onClick={closeAddModal}>
          <section
            className="modal-card modal-card-large uom-add-unit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={addUnitDialogTitleId}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="panel-header">
              <div>
                <p className="eyebrow">Units of measure</p>
                <h3 id={addUnitDialogTitleId}>Add unit</h3>
              </div>
            </div>
            <form className="stack-form" onSubmit={(e) => void handleCreate(e)}>
              <div className="form-grid uom-admin-create-grid uom-admin-create-grid--two">
                <label>
                  <span>Code (slug)</span>
                  <input
                    value={newCode}
                    onChange={(ev) => setNewCode(ev.target.value)}
                    placeholder="e.g. bottle"
                    autoComplete="off"
                    disabled={createBusy}
                  />
                </label>
                <label>
                  <span>Display name</span>
                  <input
                    value={newName}
                    onChange={(ev) => setNewName(ev.target.value)}
                    placeholder="e.g. Bottle"
                    disabled={createBusy}
                  />
                </label>
              </div>
              <p className="field-hint uom-add-order-hint">
                New units are added at the end of the list. Drag rows on the table to reorder (same idea as the Repairs
                board).
              </p>
              {createError ? <p className="form-error">{createError}</p> : null}
              <div className="form-actions uom-add-unit-actions">
                <button type="submit" className="button" disabled={createBusy}>
                  {createBusy ? "Adding…" : "Add unit"}
                </button>
                <button type="button" className="button button-secondary" disabled={createBusy} onClick={closeAddModal}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-overlay uom-delete-overlay" role="presentation" onClick={closeDeleteModal}>
          <section
            className="modal-card uom-delete-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={deleteDialogTitleId}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="panel-header uom-delete-confirm-header">
              <div>
                <p className="eyebrow">Units of measure</p>
                <h3 id={deleteDialogTitleId}>Remove from catalog?</h3>
              </div>
            </div>
            <div className="uom-delete-confirm-body">
              <p className="workspace-note uom-delete-confirm-lead">
                This will remove <code className="uom-delete-code">{deleteTarget.code}</code>
                <span className="uom-delete-name"> ({deleteTarget.name})</span> from the catalog.
              </p>
              <p className="workspace-note">
                If this unit is still referenced on purchase lines, the server will refuse removal — use <strong>Active</strong>{" "}
                off instead to hide it from new lines while keeping history.
              </p>
              {deleteModalError ? <p className="form-error uom-delete-modal-error">{deleteModalError}</p> : null}
            </div>
            <div className="form-actions uom-delete-confirm-actions">
              <button type="button" className="button button-danger" disabled={deleteBusy} onClick={() => void executeDelete()}>
                {deleteBusy ? "Removing…" : "Remove unit"}
              </button>
              <button type="button" className="button button-secondary" disabled={deleteBusy} onClick={closeDeleteModal}>
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
