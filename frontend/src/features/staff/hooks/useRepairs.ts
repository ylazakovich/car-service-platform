import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  addRepairNote,
  createRepair,
  deleteRepair as deleteRepairApi,
  deleteRepairNote,
  fetchRepairs,
  updateRepair,
  type RepairItem,
  type RepairWritePayload,
  type StaffUser,
} from "../../../api/repairs";
import {
  REPAIR_STATUS_LABELS,
  type RepairEntry,
  type RepairNote,
  type RepairStatus,
  type RepairStatusFilter,
} from "../shared/repairs";
import type { Vehicle } from "../shared/vehicles";

export type RepairFormState = {
  vehicle_id: string;
  master_id: string;
  service_key: string;
  custom_service: string;
  issue_notes: string;
  status: RepairStatus;
};

export const emptyRepairForm: RepairFormState = {
  vehicle_id: "",
  master_id: "",
  service_key: "",
  custom_service: "",
  issue_notes: "",
  status: "new",
};

export const customRepairServiceOption = "Custom Service";

function mapApiRepairToEntry(item: RepairItem): RepairEntry {
  return {
    id: item.id,
    created_at: item.created_at.slice(0, 10),
    updated_at: item.updated_at.slice(0, 10),
    completed_at: item.completed_at ?? "",
    vehicle_id: item.vehicle_id,
    vehicle_label: item.vehicle_label,
    owner_name: item.owner_name,
    master_id: item.master_id != null ? String(item.master_id) : "",
    master_name: item.master_name,
    service_name: item.service_name,
    issue_notes: item.issue_notes,
    repair_notes: item.repair_notes.map((n) => ({
      id: String(n.id),
      author_name: n.author_name,
      author_email: n.author_email,
      created_at: n.created_at.slice(0, 16).replace("T", " "),
      text: n.text,
    })),
    status: item.status,
    tracking_code: item.tracking_code,
    before_photos: item.before_photos,
    during_photos: item.during_photos,
    after_photos: item.after_photos,
  };
}

function getStaffUserLabel(staff: StaffUser): string {
  return [staff.first_name, staff.last_name].filter(Boolean).join(" ") || staff.email;
}

function getLocalTodayDate() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function createPreviewUrls(files: File[]) {
  return files.map((file) => URL.createObjectURL(file));
}

function revokePreviewUrls(urls: string[]) {
  urls.forEach((url) => {
    if (url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  });
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
  const [repairPhotoPreviews, setRepairPhotoPreviews] = useState<string[]>([]);
  const [selectedRepairId, setSelectedRepairId] = useState<number | null>(null);
  const [repairModalStatus, setRepairModalStatus] = useState<RepairStatus>("new");
  const [repairModalMasterId, setRepairModalMasterId] = useState("");
  const [repairModalCompletedAt, setRepairModalCompletedAt] = useState("");
  const [repairModalNewNote, setRepairModalNewNote] = useState("");
  const [repairBeforePhotos, setRepairBeforePhotos] = useState<string[]>([]);
  const [repairDuringPhotos, setRepairDuringPhotos] = useState<string[]>([]);
  const [repairAfterPhotos, setRepairAfterPhotos] = useState<string[]>([]);
  const [draggingRepairId, setDraggingRepairId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<RepairStatus | null>(null);
  const [copyToast, setCopyToast] = useState("");

  const selectedRepair = repairs.find((repair) => repair.id === selectedRepairId) ?? null;

  useEffect(() => {
    fetchRepairs(undefined, masterId).then((data) => setRepairs(data.map(mapApiRepairToEntry))).catch(() => {});
  }, [masterId]);

  useEffect(() => {
    return () => {
      revokePreviewUrls(repairPhotoPreviews);
      revokePreviewUrls(repairBeforePhotos);
      revokePreviewUrls(repairDuringPhotos);
      revokePreviewUrls(repairAfterPhotos);
    };
  }, [repairAfterPhotos, repairBeforePhotos, repairDuringPhotos, repairPhotoPreviews]);

  function resetRepairForm() {
    setRepairForm(emptyRepairForm);
    setRepairError("");
    setRepairPhotoPreviews([]);
  }

  function closeRepairModal() {
    setSelectedRepairId(null);
    setRepairModalStatus("new");
    setRepairModalMasterId("");
    setRepairModalCompletedAt("");
    setRepairModalNewNote("");
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
    setRepairModalMasterId(repair.master_id);
    setRepairModalCompletedAt(repair.completed_at);
    setRepairModalNewNote("");
    setRepairBeforePhotos(repair.before_photos);
    setRepairDuringPhotos(repair.during_photos);
    setRepairAfterPhotos(repair.after_photos);
  }

  async function handleRepairSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRepairError("");
    setIsSavingRepair(true);

    const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === repairForm.vehicle_id);
    const serviceName =
      repairForm.service_key === customRepairServiceOption ? repairForm.custom_service.trim() : repairForm.service_key;
    const selectedMaster = staffUsers.find((master) => String(master.id) === repairForm.master_id);

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

    if (!serviceName) {
      setRepairError("Choose a service or write your own.");
      setIsSavingRepair(false);
      return;
    }

    const payload: RepairWritePayload = {
      vehicle_id: Number(repairForm.vehicle_id),
      master_id: repairForm.master_id ? Number(repairForm.master_id) : null,
      service_name: serviceName,
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

    if (selectedRepair.status !== repairModalStatus) {
      const shouldChange = window.confirm(
        `Change repair ${selectedRepair.tracking_code} status from ${REPAIR_STATUS_LABELS[selectedRepair.status]} to ${REPAIR_STATUS_LABELS[repairModalStatus]}?`
      );

      if (!shouldChange) {
        return;
      }
    }

    const updated = await updateRepair(selectedRepairId, {
      status: repairModalStatus,
      master_id: repairModalMasterId ? Number(repairModalMasterId) : null,
      completed_at: repairModalStatus === "completed" ? repairModalCompletedAt || null : null,
    });

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

  function handleRepairPhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setRepairPhotoPreviews(createPreviewUrls(files));
  }

  function handleRepairBeforePhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setRepairBeforePhotos(createPreviewUrls(files));
  }

  function handleRepairDuringPhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setRepairDuringPhotos(createPreviewUrls(files));
  }

  function handleRepairAfterPhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setRepairAfterPhotos(createPreviewUrls(files));
  }

  function handleCardDragStart(repairId: number, event: React.DragEvent) {
    event.dataTransfer.setData("repair-id", String(repairId));
    event.dataTransfer.effectAllowed = "move";
    setDraggingRepairId(repairId);
  }

  function handleCardDragEnd() {
    setDraggingRepairId(null);
    setDragOverColumn(null);
  }

  function handleColumnDragOver(status: RepairStatus, event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }

  function handleColumnDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  }

  function handleColumnDrop(status: RepairStatus, event: React.DragEvent) {
    event.preventDefault();
    const repairId = Number(event.dataTransfer.getData("repair-id"));
    if (repairId) {
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
  }

  async function handleCopyTrackingCode(trackingCode: string, event?: { stopPropagation?: () => void }) {
    event?.stopPropagation?.();
    await navigator.clipboard.writeText(trackingCode);
    setCopyToast(`Copied ${trackingCode}`);
    window.setTimeout(() => {
      setCopyToast((current) => (current === `Copied ${trackingCode}` ? "" : current));
    }, 1600);
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
    repairPhotoPreviews,
    selectedRepairId,
    repairModalStatus,
    setRepairModalStatus,
    repairModalMasterId,
    setRepairModalMasterId,
    repairModalCompletedAt,
    setRepairModalCompletedAt,
    repairModalNewNote,
    setRepairModalNewNote,
    repairBeforePhotos,
    repairDuringPhotos,
    repairAfterPhotos,
    draggingRepairId,
    dragOverColumn,
    copyToast,
    resetRepairForm,
    closeRepairModal,
    openRepairCreateModal,
    closeRepairCreateModal,
    openRepairModal,
    handleRepairSubmit,
    handleRepairNoteAdd,
    handleRepairNoteDelete,
    handleRepairModalSave,
    handleRepairDelete,
    handleRepairPhotosChange,
    handleRepairBeforePhotosChange,
    handleRepairDuringPhotosChange,
    handleRepairAfterPhotosChange,
    handleCardDragStart,
    handleCardDragEnd,
    handleColumnDragOver,
    handleColumnDragLeave,
    handleColumnDrop,
    handleCopyTrackingCode,
  };
}
