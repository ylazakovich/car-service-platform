import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  addRepairNote,
  createRepair,
  deleteRepair as deleteRepairApi,
  deleteRepairNote,
  fetchRepair,
  fetchRepairs,
  regeneratePortalToken,
  reorderRepairs,
  updateRepair,
  type RepairItem,
  type RepairWritePayload,
  type StaffUser,
} from "../../../api/repairs";
import { repairDraftsFromEntryLines } from "../components/RepairServiceLinesEditor";
import {
  REPAIR_STATUS_LABELS,
  newRepairServiceLineDraft,
  type RepairEntry,
  type RepairNote,
  type RepairServiceLineDraft,
  type RepairStatus,
  type RepairStatusFilter,
} from "../shared/repairs";
import type { Vehicle } from "../shared/vehicles";
import { randomUuid } from "../../../lib/randomUuid";

export type RepairFormState = {
  vehicle_id: string;
  vehicle_query: string;
  master_id: string;
  service_lines: RepairServiceLineDraft[];
  issue_notes: string;
  status: RepairStatus;
};

export const emptyRepairForm: RepairFormState = {
  vehicle_id: "",
  vehicle_query: "",
  master_id: "",
  service_lines: [newRepairServiceLineDraft()],
  issue_notes: "",
  status: "new",
};

const COMPLETION_ODOMETER_REQUIRED_MESSAGE =
  "Fill in Odometer when returned (km) before moving this repair to Completed.";

/** @deprecated Intake form uses multi-line services; kept for any legacy imports. */
export const customRepairServiceOption = "Custom Service";

function mapApiRepairToEntry(item: RepairItem): RepairEntry {
  const sl =
    item.service_lines && item.service_lines.length > 0
      ? item.service_lines.map((l) => ({
          id: l.id != null ? String(l.id) : null,
          name: l.name,
          catalog_service_id: l.catalog_service_id,
          sort_order: l.sort_order ?? 0,
        }))
      : [{ id: `legacy:${item.id}`, name: item.service_name, catalog_service_id: null, sort_order: 0 }];

  return {
    id: item.id,
    created_at: item.created_at,
    updated_at: item.updated_at,
    completed_at: item.completed_at ?? "",
    vehicle_id: item.vehicle_id,
    vehicle_label: item.vehicle_label,
    vehicle_plate: null,
    vehicle_model: null,
    vehicle_year: null,
    mileage: null,
    started_at: null,
    owner_name: item.owner_name,
    master_id: item.master_id != null ? String(item.master_id) : "",
    master_name: item.master_name,
    service_name: item.service_name,
    service_lines: sl,
    issue_notes: item.issue_notes,
    repair_notes: item.repair_notes.map((n) => ({
      id: String(n.id),
      author_name: n.author_name,
      author_email: n.author_email,
      created_at: n.created_at.slice(0, 16).replace("T", " "),
      text: n.text,
    })),
    status: item.status,
    mileage_at_service: item.mileage_at_service ?? null,
    tracking_code: item.tracking_code,
    portal_token: item.portal_token,
    has_pdf: item.has_pdf ?? false,
    latest_act_document_total:
      item.latest_act_document_total != null && Number.isFinite(item.latest_act_document_total)
        ? item.latest_act_document_total
        : null,
    estimated_date: item.estimated_date ?? "",
    before_photos: item.before_photos,
    during_photos: item.during_photos,
    after_photos: item.after_photos,
    position: item.position ?? null,
  };
}

function getStaffUserLabel(staff: StaffUser): string {
  return [staff.first_name, staff.last_name].filter(Boolean).join(" ") || staff.email;
}

function getLocalTodayDate() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function parseMileageAtServiceInput(
  raw: string
): { ok: true; value: number | null } | { ok: false; message: string } {
  const t = raw.trim().replace(/,/g, "").replace(/\s/g, "");
  if (!t) {
    return { ok: true, value: null };
  }
  if (!/^\d+$/.test(t)) {
    return { ok: false, message: "Odometer must be a whole number (km), or leave empty." };
  }
  const n = Number(t);
  if (n > 2_147_483_647) {
    return { ok: false, message: "Odometer value is too large." };
  }
  return { ok: true, value: n };
}

function parseCatalogServicePrice(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".").replace(/\s/g, "");
  if (!normalized) {
    return null;
  }
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

function hasReturnedOdometer(repair: Pick<RepairEntry, "mileage_at_service">): boolean {
  return repair.mileage_at_service != null;
}

export function sanitizeImageUrl(url: string): string {
  // Allow blob: URLs created via URL.createObjectURL
  if (url.startsWith("blob:")) {
    return url;
  }

  // Allow well-formed absolute http(s) URLs
  if (url.startsWith("https://") || url.startsWith("http://")) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return url;
      }
    } catch {
      // fall through to return ""
    }
  }

  // Allow simple root-relative paths without whitespace
  if (url.startsWith("/") && !/\s/.test(url)) {
    return url;
  }

  return "";
}

export function useRepairs(vehicles: Vehicle[], staffUsers: StaffUser[], masterId?: number) {
  const { user } = useAuth();
  const [repairs, setRepairs] = useState<RepairEntry[]>([]);
  const [repairSearch, setRepairSearch] = useState("");
  const [mobileRepairStatusFilter, setMobileRepairStatusFilter] = useState<RepairStatusFilter>("all");
  const [repairForm, setRepairForm] = useState<RepairFormState>(emptyRepairForm);
  const [repairError, setRepairError] = useState("");
  const [isSavingRepair, setIsSavingRepair] = useState(false);
  const [isRepairFormOpen, setIsRepairFormOpen] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [repairModalStatus, setRepairModalStatus] = useState<RepairStatus>("new");
  const [repairModalMasterId, setRepairModalMasterId] = useState("");
  const [repairModalCompletedAt, setRepairModalCompletedAt] = useState("");
  const [repairModalMileageAtService, setRepairModalMileageAtService] = useState("");
  const [repairModalNeedsMileageAttention, setRepairModalNeedsMileageAttention] = useState(false);
  const [repairModalEstimatedDate, setRepairModalEstimatedDate] = useState("");
  const [repairModalNewNote, setRepairModalNewNote] = useState("");
  const [repairModalServiceLines, setRepairModalServiceLines] = useState<RepairServiceLineDraft[]>([
    newRepairServiceLineDraft(),
  ]);
  const [repairModalIssueNotes, setRepairModalIssueNotes] = useState("");
  const [repairBeforePhotos, setRepairBeforePhotos] = useState<string[]>([]);
  const [repairDuringPhotos, setRepairDuringPhotos] = useState<string[]>([]);
  const [repairAfterPhotos, setRepairAfterPhotos] = useState<string[]>([]);
  const [draggingRepairId, setDraggingRepairId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<RepairStatus | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<number | null>(null);
  const [copyToast, setCopyToast] = useState("");

  const selectedRepair = repairs.find((repair) => repair.id === selectedRepairId) ?? null;

  useEffect(() => {
    fetchRepairs(undefined, masterId).then((data) => setRepairs(data.map(mapApiRepairToEntry))).catch(() => {});
  }, [masterId]);

  function resetRepairForm() {
    setRepairForm(emptyRepairForm);
    setRepairError("");
  }

  function closeRepairModal() {
    setSelectedRepairId(null);
    setRepairModalStatus("new");
    setRepairModalMasterId("");
    setRepairModalCompletedAt("");
    setRepairModalMileageAtService("");
    setRepairModalNeedsMileageAttention(false);
    setRepairModalEstimatedDate("");
    setRepairModalNewNote("");
    setRepairModalServiceLines([newRepairServiceLineDraft()]);
    setRepairModalIssueNotes("");
    setRepairBeforePhotos([]);
    setRepairDuringPhotos([]);
    setRepairAfterPhotos([]);
  }

  function openRepairCreateModal() {
    resetRepairForm();
    setIsRepairFormOpen(true);
  }

  function closeRepairCreateModal() {
    resetRepairForm();
    setIsRepairFormOpen(false);
  }

  function openRepairModal(repair: RepairEntry) {
    setSelectedRepairId(repair.id);
    setRepairModalStatus(repair.status);
    setRepairModalMasterId(repair.master_id ?? "");
    setRepairModalCompletedAt(repair.completed_at);
    setRepairModalMileageAtService(
      repair.mileage_at_service != null ? String(repair.mileage_at_service) : ""
    );
    setRepairModalNeedsMileageAttention(false);
    setRepairModalEstimatedDate(repair.estimated_date);
    setRepairModalNewNote("");
    setRepairModalServiceLines(repairDraftsFromEntryLines(repair.service_lines));
    setRepairModalIssueNotes(repair.issue_notes);
    setRepairBeforePhotos(repair.before_photos);
    setRepairDuringPhotos(repair.during_photos);
    setRepairAfterPhotos(repair.after_photos);
  }

  function prefillHandoffRepairCreate(source: RepairEntry) {
    const copied = source.service_lines
      .filter((l) => l.name.trim())
      .map((l) => ({
        key: randomUuid(),
        persisted_id: null,
        name: l.name,
        catalog_service_id: l.catalog_service_id,
        catalog_service_price: "",
      }));
    setRepairForm({
      vehicle_id: String(source.vehicle_id),
      vehicle_query: source.vehicle_label,
      master_id: "",
      service_lines: copied.length > 0 ? copied : [newRepairServiceLineDraft()],
      issue_notes: source.issue_notes,
      status: "new",
    });
    setRepairError("");
    closeRepairModal();
    setIsRepairFormOpen(true);
  }

  function handleRepairModalMileageAtServiceChange(value: string) {
    setRepairModalMileageAtService(value);
    if (value.trim()) {
      setRepairModalNeedsMileageAttention(false);
    }
  }

  function requestRepairMileageAttention() {
    setRepairModalNeedsMileageAttention(true);
  }

  function promptRepairForCompletedOdometer(repair: RepairEntry) {
    openRepairModal(repair);
    setRepairModalStatus("completed");
    setRepairModalCompletedAt(repair.completed_at || getLocalTodayDate());
    setRepairModalNeedsMileageAttention(true);
  }

  async function handleRepairSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRepairError("");
    setIsSavingRepair(true);

    const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === repairForm.vehicle_id);
    const selectedMaster = staffUsers.find((master) => String(master.id) === repairForm.master_id);

    const trimmedLines = repairForm.service_lines
      .map((l) => ({ ...l, name: l.name.trim() }))
      .filter((l) => l.name.length > 0);

    if (!selectedVehicle) {
      setRepairError("Select a vehicle for this repair.");
      setIsSavingRepair(false);
      return;
    }

    if (!selectedMaster) {
      setRepairError("Select a master for this repair.");
      setIsSavingRepair(false);
      return;
    }

    if (trimmedLines.length === 0) {
      setRepairError("Add at least one service.");
      setIsSavingRepair(false);
      return;
    }

    const missingPriceLine = trimmedLines.find(
      (line) =>
        line.catalog_service_id == null &&
        line.persisted_id == null &&
        parseCatalogServicePrice(line.catalog_service_price) == null
    );
    if (missingPriceLine) {
      setRepairError(`Add a price for the new service "${missingPriceLine.name}".`);
      setIsSavingRepair(false);
      return;
    }

    const service_lines = trimmedLines.map((l, i) => ({
      name: l.name,
      catalog_service_id: l.catalog_service_id,
      catalog_service_price: l.catalog_service_id ? null : parseCatalogServicePrice(l.catalog_service_price),
      sort_order: i,
    }));

    const payload: RepairWritePayload = {
      vehicle_id: Number(repairForm.vehicle_id),
      master_id: repairForm.master_id ? Number(repairForm.master_id) : null,
      service_name: trimmedLines[0].name,
      service_lines,
      issue_notes: repairForm.issue_notes.trim() || "No issue notes provided yet.",
      status: repairForm.status,
    };

    try {
      const created = await createRepair(payload);
      setRepairs((prev) => [mapApiRepairToEntry(created), ...prev]);
      resetRepairForm();
      setIsRepairFormOpen(false);
    } catch {
      setRepairError("Failed to create repair. Please try again.");
    } finally {
      setIsSavingRepair(false);
    }
  }

  async function handleRepairNoteAdd() {
    if (!selectedRepairId || !repairModalNewNote.trim()) {
      return;
    }

    const note = await addRepairNote(selectedRepairId, repairModalNewNote.trim());
    const mappedNote: RepairNote = {
      id: String(note.id),
      author_name: note.author_name,
      author_email: note.author_email,
      created_at: note.created_at.slice(0, 16).replace("T", " "),
      text: note.text,
    };

    setRepairs((current) =>
      current.map((repair) =>
        repair.id === selectedRepairId ? { ...repair, repair_notes: [...repair.repair_notes, mappedNote] } : repair
      )
    );
    setRepairModalNewNote("");
  }

  async function handleRepairNoteDelete(noteId: string) {
    if (!selectedRepairId || !selectedRepair || !user?.email) {
      return;
    }

    const note = selectedRepair.repair_notes.find((entry) => entry.id === noteId);
    if (!note || note.author_email !== user.email) {
      return;
    }

    const shouldDelete = window.confirm("Delete this repair note?");
    if (!shouldDelete) {
      return;
    }

    await deleteRepairNote(selectedRepairId, Number(noteId));
    setRepairs((current) =>
      current.map((repair) =>
        repair.id === selectedRepairId
          ? { ...repair, repair_notes: repair.repair_notes.filter((entry) => entry.id !== noteId) }
          : repair
      )
    );
  }

  async function handleRepairModalSave() {
    if (!selectedRepairId || !selectedRepair) {
      return;
    }

    const canEditServicesAndNotes =
      user?.role === "admin" ||
      (Boolean(selectedRepair.master_id) && String(selectedRepair.master_id) === String(user?.id));

    let mileageForPayload: number | null = null;
    if (repairModalStatus === "completed") {
      const parsed = parseMileageAtServiceInput(repairModalMileageAtService);
      if (!parsed.ok) {
        window.alert(parsed.message);
        return;
      }
      if (parsed.value == null) {
        window.alert(COMPLETION_ODOMETER_REQUIRED_MESSAGE);
        return;
      }
      mileageForPayload = parsed.value;
    }

    if (selectedRepair.status !== repairModalStatus) {
      const shouldChange = window.confirm(
        `Change repair ${selectedRepair.tracking_code} status from ${REPAIR_STATUS_LABELS[selectedRepair.status]} to ${REPAIR_STATUS_LABELS[repairModalStatus]}?`
      );

      if (!shouldChange) {
        return;
      }
    }

    const payload: Partial<RepairWritePayload> = {
      status: repairModalStatus,
      master_id: repairModalMasterId ? Number(repairModalMasterId) : null,
      completed_at: repairModalStatus === "completed" ? repairModalCompletedAt || null : null,
      estimated_date: repairModalEstimatedDate || null,
      mileage_at_service: repairModalStatus === "completed" ? mileageForPayload : null,
    };

    if (canEditServicesAndNotes) {
      const trimmedLines = repairModalServiceLines
        .map((l) => ({ ...l, name: l.name.trim() }))
        .filter((l) => l.name.length > 0);
      if (trimmedLines.length === 0) {
        window.alert("Add at least one service.");
        return;
      }
      const missingPriceLine = trimmedLines.find(
        (line) =>
          line.catalog_service_id == null &&
          line.persisted_id == null &&
          parseCatalogServicePrice(line.catalog_service_price) == null
      );
      if (missingPriceLine) {
        window.alert(`Add a price for the new service "${missingPriceLine.name}".`);
        return;
      }
      payload.service_lines = trimmedLines.map((l, i) => ({
        name: l.name,
        catalog_service_id: l.catalog_service_id,
        catalog_service_price: l.catalog_service_id ? null : parseCatalogServicePrice(l.catalog_service_price),
        sort_order: i,
      }));
      payload.service_name = trimmedLines[0].name;
      payload.issue_notes = repairModalIssueNotes.trim() || selectedRepair.issue_notes;
    }

    const updated = await updateRepair(selectedRepairId, payload);

    setRepairs((current) =>
      current.map((repair) =>
        repair.id === selectedRepairId
          ? {
              ...mapApiRepairToEntry(updated),
              before_photos: repairBeforePhotos,
              during_photos: repairDuringPhotos,
              after_photos: repairAfterPhotos,
            }
          : repair
      )
    );

    closeRepairModal();
  }

  async function handleRepairDelete(repair: RepairEntry, event?: { stopPropagation?: () => void }) {
    event?.stopPropagation?.();

    const shouldDelete = window.confirm(`Delete repair ${repair.tracking_code}?`);
    if (!shouldDelete) {
      return;
    }

    await deleteRepairApi(repair.id);
    setRepairs((current) => current.filter((entry) => entry.id !== repair.id));
    if (selectedRepairId === repair.id) {
      closeRepairModal();
    }
  }

  function handleCardDragStart(repairId: number, event: React.DragEvent) {
    event.dataTransfer.setData("repair-id", String(repairId));
    event.dataTransfer.effectAllowed = "move";
    setDraggingRepairId(repairId);
  }

  function handleCardDragEnd() {
    setDraggingRepairId(null);
    setDragOverColumn(null);
    setDragOverCardId(null);
  }

  function handleColumnDragOver(status: RepairStatus, event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
    setDragOverCardId(null);
  }

  function handleColumnDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  }

  function handleCardDragOver(repairId: number, event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDragOverCardId(repairId);
  }

  function handleCardDrop(targetRepairId: number, targetStatus: RepairStatus, event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    const draggedId = Number(event.dataTransfer.getData("repair-id"));
    if (!draggedId || draggedId === targetRepairId) {
      setDraggingRepairId(null);
      setDragOverColumn(null);
      setDragOverCardId(null);
      return;
    }

    const dragged = repairs.find((r) => r.id === draggedId);
    if (!dragged) return;

    if (targetStatus === "completed" && !hasReturnedOdometer(dragged)) {
      window.alert(COMPLETION_ODOMETER_REQUIRED_MESSAGE);
      promptRepairForCompletedOdometer(dragged);
      setDraggingRepairId(null);
      setDragOverColumn(null);
      setDragOverCardId(null);
      return;
    }

    if (dragged.status === targetStatus) {
      setRepairs((current) => {
        const col = current.filter((r) => r.status === targetStatus);
        const rest = current.filter((r) => r.status !== targetStatus);
        const without = col.filter((r) => r.id !== draggedId);
        const targetIdx = without.findIndex((r) => r.id === targetRepairId);
        const insertIdx = targetIdx === -1 ? without.length : targetIdx;
        const reordered = [...without.slice(0, insertIdx), col.find((r) => r.id === draggedId)!, ...without.slice(insertIdx)];
        const withPositions = reordered.map((r, i) => ({ ...r, position: i }));
        reorderRepairs(withPositions.map((r) => ({ id: r.id, position: r.position! }))).catch(() => {});
        return [...rest, ...withPositions];
      });
    } else {
      const fallbackCompletedAt = targetStatus === "completed" ? getLocalTodayDate() : "";
      setRepairs((current) =>
        current.map((r) =>
          r.id === draggedId
            ? { ...r, status: targetStatus, completed_at: targetStatus === "completed" ? r.completed_at || fallbackCompletedAt : "" }
            : r
        )
      );
      updateRepair(draggedId, { status: targetStatus, completed_at: targetStatus === "completed" ? fallbackCompletedAt : null })
        .then((updated) => {
          setRepairs((current) => current.map((r) => (r.id === draggedId ? mapApiRepairToEntry(updated) : r)));
        })
        .catch(() => {
          fetchRepairs().then((data) => setRepairs(data.map(mapApiRepairToEntry)));
        });
    }

    setDraggingRepairId(null);
    setDragOverColumn(null);
    setDragOverCardId(null);
  }

  function handleColumnDrop(status: RepairStatus, event: React.DragEvent) {
    event.preventDefault();
    const repairId = Number(event.dataTransfer.getData("repair-id"));
    if (repairId) {
      const dragged = repairs.find((r) => r.id === repairId);
      if (status === "completed" && dragged && !hasReturnedOdometer(dragged)) {
        window.alert(COMPLETION_ODOMETER_REQUIRED_MESSAGE);
        promptRepairForCompletedOdometer(dragged);
        setDraggingRepairId(null);
        setDragOverColumn(null);
        setDragOverCardId(null);
        return;
      }
      const fallbackCompletedAt = status === "completed" ? getLocalTodayDate() : "";
      setRepairs((current) =>
        current.map((r) =>
          r.id === repairId ? { ...r, status, completed_at: status === "completed" ? r.completed_at || fallbackCompletedAt : "" } : r
        )
      );
      updateRepair(repairId, { status, completed_at: status === "completed" ? fallbackCompletedAt : null })
        .then((updated) => {
          setRepairs((current) => current.map((r) => (r.id === repairId ? mapApiRepairToEntry(updated) : r)));
        })
        .catch(() => {
          fetchRepairs().then((data) => setRepairs(data.map(mapApiRepairToEntry)));
        });
    }
    setDraggingRepairId(null);
    setDragOverColumn(null);
    setDragOverCardId(null);
  }

  async function handleCopyTrackingCode(trackingCode: string, event?: { stopPropagation?: () => void }) {
    event?.stopPropagation?.();
    await navigator.clipboard.writeText(trackingCode);
    setCopyToast(`Copied ${trackingCode}`);
    window.setTimeout(() => {
      setCopyToast((current) => (current === `Copied ${trackingCode}` ? "" : current));
    }, 1600);
  }

  async function handleCopyPortalLink(portalToken: string, event?: { stopPropagation?: () => void }) {
    event?.stopPropagation?.();
    const url = `${window.location.origin}/portal/${portalToken}`;
    await navigator.clipboard.writeText(url);
    setCopyToast("Portal link copied");
    window.setTimeout(() => {
      setCopyToast((current) => (current === "Portal link copied" ? "" : current));
    }, 1600);
  }

  async function handleRegeneratePortalLink(repairId: number) {
    const { portal_token } = await regeneratePortalToken(repairId);
    setRepairs((current) =>
      current.map((r) => (r.id === repairId ? { ...r, portal_token } : r))
    );
    const url = `${window.location.origin}/portal/${portal_token}`;
    await navigator.clipboard.writeText(url);
    setCopyToast("New portal link generated & copied");
    window.setTimeout(() => {
      setCopyToast((current) => (current === "New portal link generated & copied" ? "" : current));
    }, 2400);
  }

  function markRepairPdfAvailable(repairId: number) {
    void (async () => {
      try {
        const item = await fetchRepair(repairId);
        setRepairs((current) =>
          current.map((repair) =>
            repair.id === repairId
              ? {
                  ...mapApiRepairToEntry(item),
                  before_photos: repair.before_photos,
                  during_photos: repair.during_photos,
                  after_photos: repair.after_photos,
                }
              : repair
          )
        );
      } catch {
        setRepairs((current) =>
          current.map((repair) => (repair.id === repairId ? { ...repair, has_pdf: true } : repair))
        );
      }
    })();
  }

  return {
    repairs,
    repairSearch,
    setRepairSearch,
    mobileRepairStatusFilter,
    setMobileRepairStatusFilter,
    repairForm,
    setRepairForm,
    repairError,
    isSavingRepair,
    isRepairFormOpen,
    selectedRepairId,
    repairModalStatus,
    setRepairModalStatus,
    repairModalMasterId,
    setRepairModalMasterId,
    repairModalCompletedAt,
    setRepairModalCompletedAt,
    repairModalMileageAtService,
    setRepairModalMileageAtService: handleRepairModalMileageAtServiceChange,
    repairModalNeedsMileageAttention,
    repairModalEstimatedDate,
    setRepairModalEstimatedDate,
    repairModalNewNote,
    setRepairModalNewNote,
    repairModalServiceLines,
    setRepairModalServiceLines,
    repairModalIssueNotes,
    setRepairModalIssueNotes,
    prefillHandoffRepairCreate,
    repairBeforePhotos,
    repairDuringPhotos,
    repairAfterPhotos,
    draggingRepairId,
    dragOverColumn,
    dragOverCardId,
    copyToast,
    resetRepairForm,
    closeRepairModal,
    openRepairCreateModal,
    closeRepairCreateModal,
    openRepairModal,
    requestRepairMileageAttention,
    handleRepairSubmit,
    handleRepairNoteAdd,
    handleRepairNoteDelete,
    handleRepairModalSave,
    handleRepairDelete,
    handleCardDragStart,
    handleCardDragEnd,
    handleCardDragOver,
    handleCardDrop,
    handleColumnDragOver,
    handleColumnDragLeave,
    handleColumnDrop,
    handleCopyTrackingCode,
    handleCopyPortalLink,
    handleRegeneratePortalLink,
    markRepairPdfAvailable,
    promptRepairForCompletedOdometer,
  };
}
