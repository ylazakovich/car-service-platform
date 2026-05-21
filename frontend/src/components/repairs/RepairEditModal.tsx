import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { ServiceItem } from "../../api/services";
import type { StaffUser } from "../../api/repairs";
import {
  formatRepairDisplayDate,
  newRepairServiceLineDraft,
  type RepairEntry,
  type RepairServiceLineDraft,
  type RepairStatus,
} from "../../features/staff/shared/repairs";
import type { Vehicle } from "../../features/staff/shared/vehicles";
import { REGISTERS_MOBILE_BREAKPOINT, useMediaQuery } from "../../features/staff/hooks/useMediaQuery";
import { RepairModalShell, FieldRow, SectionHead, MetaList, ClientLinkRow } from "./RepairModal";
import { VehiclePicker } from "./VehiclePicker";
import { ServiceRow } from "./ServiceRow";
import { StatusSwitcher } from "./StatusSwitcher";
import { LockBanner } from "./LockBanner";
import { KebabMenu, type KebabMenuItem } from "./KebabMenu";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { ConfirmReopenModal } from "./ConfirmReopenModal";
import { RepairIcon } from "./repairIcons";
import {
  firstRepairErrorFieldId,
  validateRepairEditFields,
  type RepairFieldErrors,
} from "./repairValidation";

type RepairEditModalProps = {
  repair: RepairEntry;
  status: RepairStatus;
  masterId: string;
  needsMasterAttention?: boolean;
  serviceLines: RepairServiceLineDraft[];
  issueNotes: string;
  estimatedDate: string;
  staffUsers: StaffUser[];
  catalog: ServiceItem[];
  isStaff: boolean;
  isAdmin: boolean;
  canEditWorkDetails: boolean;
  saving: boolean;
  statusChanging?: boolean;
  portalUrl: string;
  getStaffUserLabel: (staff: StaffUser) => string;
  onClose: () => void;
  onStatusChange: (status: RepairStatus) => void;
  onMasterChange: (masterId: string) => void;
  onServiceLinesChange: (lines: RepairServiceLineDraft[]) => void;
  onIssueNotesChange: (value: string) => void;
  onEstimatedDateChange: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onReopen: () => void;
  onPickUp?: () => void;
  onUndoPickUp?: () => void;
  onHandoffCreate: () => void;
  onDuplicate?: () => void;
  onExportPdf?: () => void;
  onCopyPortalLink: () => void;
  onRegeneratePortalLink?: () => void;
  extension?: ReactNode;
  mileageExtension?: ReactNode;
  vehicles: Vehicle[];
  openedAsCompleted?: boolean;
};

export function RepairEditModal({
  repair,
  status,
  masterId,
  needsMasterAttention = false,
  serviceLines,
  issueNotes,
  estimatedDate,
  staffUsers,
  catalog,
  isStaff,
  isAdmin,
  canEditWorkDetails,
  saving,
  statusChanging,
  portalUrl,
  getStaffUserLabel,
  onClose,
  onStatusChange,
  onMasterChange,
  onServiceLinesChange,
  onIssueNotesChange,
  onEstimatedDateChange,
  onSave,
  onDelete,
  onReopen,
  onPickUp,
  onUndoPickUp,
  onHandoffCreate,
  onDuplicate,
  onExportPdf,
  onCopyPortalLink,
  onRegeneratePortalLink,
  extension,
  mileageExtension,
  vehicles,
  openedAsCompleted = false,
}: RepairEditModalProps) {
  const mobile = useMediaQuery(REGISTERS_MOBILE_BREAKPOINT);
  const locked = openedAsCompleted;
  const readOnly = locked || !canEditWorkDetails;
  const [errors, setErrors] = useState<RepairFieldErrors>({});
  const [kebabOpen, setKebabOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);

  useEffect(() => {
    if (needsMasterAttention && !masterId) {
      setErrors((prev) => ({ ...prev, master: "Assign a master before moving to this status." }));
      window.setTimeout(() => document.getElementById("repair-field-master")?.focus(), 50);
    }
  }, [needsMasterAttention, masterId]);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [reopenBusy, setReopenBusy] = useState(false);

  const pickerVehicle = useMemo<Vehicle | null>(() => {
    const found = vehicles.find((vehicle) => vehicle.id === repair.vehicle_id);
    if (found) {
      return found;
    }
    const labelParts = repair.vehicle_label.split(" • ");
    return {
      id: repair.vehicle_id,
      customer: { id: 0, full_name: repair.owner_name },
      license_plate: repair.vehicle_plate ?? labelParts[0] ?? "—",
      make: repair.vehicle_model?.split(" ")[0] ?? labelParts[1]?.split(" ")[0] ?? repair.vehicle_label,
      model: repair.vehicle_model?.split(" ").slice(1).join(" ") ?? "",
      year: repair.vehicle_year,
      vin: "",
      color: "",
      notes: "",
    };
  }, [repair, vehicles]);

  const kebabItems: KebabMenuItem[] = [];
  if (locked) {
    if (onExportPdf) {
      kebabItems.push({
        id: "pdf",
        label: repair.has_pdf && openedAsCompleted ? "View PDF" : "Export PDF act",
        icon: "info",
        shortcut: "⌘E",
        onClick: onExportPdf,
      });
    }
  } else {
    if (canEditWorkDetails) {
      kebabItems.push({
        id: "handoff",
        label: "New card for another master",
        icon: "plus",
        onClick: onHandoffCreate,
      });
    }
    if (onDuplicate) {
      kebabItems.push({ id: "duplicate", label: "Duplicate repair", icon: "edit", onClick: onDuplicate });
    }
    if (onExportPdf) {
      kebabItems.push({
        id: "pdf",
        label: repair.has_pdf && openedAsCompleted ? "View PDF" : "Export PDF act",
        icon: "info",
        shortcut: "⌘E",
        onClick: onExportPdf,
      });
    }
    if (!isStaff) {
      if (kebabItems.length > 0) {
        kebabItems.push({ type: "divider", id: "kebab-divider" });
      }
      kebabItems.push({
        id: "delete",
        label: "Delete repair",
        icon: "trash",
        danger: true,
        onClick: () => setConfirmDelete(true),
      });
    }
  }

  const meta = (
    <>
      <span>Opened {formatRepairDisplayDate(repair.created_at)}</span>
      <span className="modal-header__meta-dot" aria-hidden />
      <span>{repair.master_name || "Unassigned"}</span>
    </>
  );

  function handleSubmit() {
    if (locked) {
      return;
    }
    const nextErrors = validateRepairEditFields({
      masterId,
      status,
      serviceLines,
      canEditServices: canEditWorkDetails,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const id = firstRepairErrorFieldId(nextErrors);
      if (id) {
        document.getElementById(id)?.focus();
      }
      return;
    }
    onSave();
  }

  function handleStatusChange(next: RepairStatus) {
    if ((next === "in_progress" || next === "completed" || next === "picked_up") && !masterId) {
      setErrors((prev) => ({ ...prev, master: "Assign a master before moving to this status." }));
      document.getElementById("repair-field-master")?.focus();
      return;
    }
    setErrors((prev) => { const { master: _, ...rest } = prev; return rest; });
    onStatusChange(next);
  }

  function handleClose() {
    setErrors({});
    setKebabOpen(false);
    onClose();
  }

  async function handleConfirmDelete() {
    setDeleteBusy(true);
    try {
      await onDelete();
      setConfirmDelete(false);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleConfirmReopen() {
    setReopenBusy(true);
    try {
      await onReopen();
      setConfirmReopen(false);
    } finally {
      setReopenBusy(false);
    }
  }

  return (
    <>
      <RepairModalShell
        mode="edit"
        title={`Repair · ${repair.tracking_code}`}
        meta={meta}
        mobile={mobile}
        locked={locked}
        errors={errors}
        saving={saving}
        footerLayout="split"
        kebab={kebabItems.length > 0 ? <KebabMenu open={kebabOpen} onOpenChange={setKebabOpen} items={kebabItems} /> : null}
        primaryLabel="Save Changes"
        savingLabel="Saving…"
        onClose={handleClose}
        onEscape={kebabOpen ? () => setKebabOpen(false) : undefined}
        onSubmit={handleSubmit}
        onDelete={!isStaff && !locked ? () => setConfirmDelete(true) : undefined}
        onReopen={locked && repair.status === "completed" ? () => setConfirmReopen(true) : undefined}
        onPickUp={locked && repair.status === "completed" ? onPickUp : undefined}
        onUndoPickUp={locked && repair.status === "picked_up" ? onUndoPickUp : undefined}
      >
        {locked ? <LockBanner /> : null}

        {!locked ? (
          <div className="field-section">
            <SectionHead label="Status" />
            <StatusSwitcher
              value={status}
              layout={mobile ? "grid" : "row"}
              disabled={statusChanging}
              onChange={handleStatusChange}
            />
          </div>
        ) : null}

        <div className="field-section">
          <SectionHead label="Vehicle & customer" />
          <FieldRow label="Vehicle" required={!locked}>
            {pickerVehicle ? (
              <VehiclePicker
                mode="picked"
                vehicles={vehicles}
                query=""
                selectedVehicle={pickerVehicle}
                disabled
                onQueryChange={() => {}}
                onSelect={() => {}}
                onClear={() => {}}
              />
            ) : null}
          </FieldRow>
          <FieldRow label="Owner" required={!locked}>
            <input className="field" type="text" value={repair.owner_name} readOnly aria-required />
          </FieldRow>
        </div>

        <div className="field-section">
          <SectionHead label="Assignment" />
          <FieldRow label="Master" error={errors.master} htmlFor="repair-field-master">
            {isStaff ? (
              <input id="repair-field-master" className="field" type="text" readOnly value={repair.master_name || "Unassigned"} />
            ) : (
              <select
                id="repair-field-master"
                className="field"
                value={masterId}
                disabled={readOnly}
                onChange={(event) => onMasterChange(event.target.value)}
                aria-invalid={Boolean(errors.master)}
              >
                <option value="">Unassigned</option>
                {staffUsers.map((master) => (
                  <option key={master.id} value={master.id}>
                    {getStaffUserLabel(master)}
                  </option>
                ))}
              </select>
            )}
          </FieldRow>
          {(status === "completed" || status === "picked_up") && mileageExtension ? mileageExtension : null}
        </div>

        <div className="field-section" id="repair-field-services">
          <SectionHead label="Services" right={<span className="field-section__hint">at least one</span>} />
          {errors.services ? (
            <span className="field-row__error" role="alert">
              <RepairIcon name="info" size={12} />
              {errors.services}
            </span>
          ) : null}
          <div className="service-list">
            {serviceLines.map((line, index) => (
              <ServiceRow
                key={line.key}
                index={index}
                line={line}
                catalog={catalog}
                idPrefix="repair-edit"
                disabled={readOnly}
                removable={!readOnly && serviceLines.length > 1}
                onChange={(patch) =>
                  onServiceLinesChange(serviceLines.map((l, i) => (i === index ? { ...l, ...patch } : l)))
                }
                onRemove={() => onServiceLinesChange(serviceLines.filter((_, i) => i !== index))}
              />
            ))}
          </div>
          {!readOnly ? (
            <button
              type="button"
              className="service-add"
              onClick={() =>
                onServiceLinesChange([...serviceLines, newRepairServiceLineDraft()])
              }
            >
              <RepairIcon name="plus" size={14} />
              Add service
            </button>
          ) : null}
        </div>

        <div className="field-section">
          <SectionHead label="Notes" />
          <FieldRow>
            <textarea
              className="field"
              rows={3}
              value={issueNotes}
              disabled={readOnly}
              placeholder="Describe the issue, customer expectations, additional context…"
              onChange={(event) => onIssueNotesChange(event.target.value)}
            />
          </FieldRow>
        </div>

        <div className="field-section">
          <SectionHead label="Repair info" />
          <MetaList
            items={[
              ["Created", formatRepairDisplayDate(repair.created_at)],
              ["ID", repair.tracking_code],
              ["Author", repair.master_name || "—"],
            ]}
          />
          <FieldRow label="Est. completion">
            <input
              className="field"
              type="date"
              value={estimatedDate}
              disabled={readOnly}
              onChange={(event) => onEstimatedDateChange(event.target.value)}
              aria-label="Estimated completion date"
            />
          </FieldRow>
          <FieldRow label="Client link" hint="Public URL the customer can use to view repair progress.">
            <ClientLinkRow
              portalUrl={portalUrl}
              disabled={locked}
              showRegenerate={isAdmin}
              onCopy={onCopyPortalLink}
              onRegenerate={onRegeneratePortalLink}
            />
          </FieldRow>
        </div>

        {extension}
      </RepairModalShell>

      {confirmDelete ? (
        <ConfirmDeleteModal
          trackingCode={repair.tracking_code}
          vehicleLabel={repair.vehicle_label}
          ownerName={repair.owner_name}
          busy={deleteBusy}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void handleConfirmDelete()}
        />
      ) : null}

      {confirmReopen ? (
        <ConfirmReopenModal
          trackingCode={repair.tracking_code}
          vehicleLabel={repair.vehicle_label}
          completedAt={repair.completed_at}
          busy={reopenBusy}
          onCancel={() => setConfirmReopen(false)}
          onConfirm={() => void handleConfirmReopen()}
        />
      ) : null}
    </>
  );
}
