import { useMemo, useState } from "react";
import type { ServiceItem } from "../../api/services";
import type { StaffUser } from "../../api/repairs";
import type { RepairFormState } from "../../features/staff/hooks/useRepairs";
import { newRepairServiceLineDraft } from "../../features/staff/shared/repairs";
import type { Vehicle } from "../../features/staff/shared/vehicles";
import { REGISTERS_MOBILE_BREAKPOINT, useMediaQuery } from "../../features/staff/hooks/useMediaQuery";
import { RepairModalShell, FieldRow, SectionHead } from "./RepairModal";
import { VehiclePicker, getVehiclePickerMode } from "./VehiclePicker";
import { ServiceRow } from "./ServiceRow";
import { RepairIcon } from "./repairIcons";
import {
  firstRepairErrorFieldId,
  validateRepairCreateFields,
  type RepairFieldErrors,
} from "./repairValidation";

type RepairCreateModalProps = {
  open: boolean;
  form: RepairFormState;
  vehicles: Vehicle[];
  staffUsers: StaffUser[];
  catalog: ServiceItem[];
  isAdmin: boolean;
  currentUserId?: number;
  currentUserEmail?: string;
  currentUserFirstName?: string;
  currentUserLastName?: string;
  saving: boolean;
  formError?: string;
  getStaffUserLabel: (staff: StaffUser) => string;
  onClose: () => void;
  onFormChange: (updater: (current: RepairFormState) => RepairFormState) => void;
  onSubmit: () => void;
  onAddNewVehicle?: () => void;
};

/**
 * Builds a display label from a staff user's first and last name, or uses their email if neither name is present.
 *
 * @param staff - Staff user object to derive the label from
 * @returns The concatenated `first_name` and `last_name` separated by a space, or `staff.email` if both are empty
 */
function getStaffUserLabelFallback(staff: StaffUser): string {
  return [staff.first_name, staff.last_name].filter(Boolean).join(" ") || staff.email;
}

/**
 * Modal component that provides a form for creating a new repair.
 *
 * Renders sections for vehicle & customer selection, assignment (master), service lines, and notes.
 * Validates fields on submit and focuses the first invalid field when validation fails.
 * Clears local field errors when the modal is closed. Returns nothing (renders null) when `open` is false.
 *
 * @param getStaffUserLabel - Optional function to format a staff user's display label; defaults to `getStaffUserLabelFallback`.
 * @param onFormChange - Callback invoked with an updater function to apply partial updates to the repair form state.
 * @param onSubmit - Callback invoked when the form passes validation and the user confirms creation.
 * @param onClose - Callback invoked when the modal is closed; local validation errors are cleared before calling.
 * @param onAddNewVehicle - Optional callback invoked when the user requests adding a new vehicle from the picker.
 *
 * @returns The modal's rendered JSX when `open` is true, otherwise `null`.
 */
export function RepairCreateModal({
  open,
  form,
  vehicles,
  staffUsers,
  catalog,
  isAdmin,
  currentUserId,
  currentUserEmail,
  currentUserFirstName,
  currentUserLastName,
  saving,
  formError,
  getStaffUserLabel = getStaffUserLabelFallback,
  onClose,
  onFormChange,
  onSubmit,
  onAddNewVehicle,
}: RepairCreateModalProps) {
  const mobile = useMediaQuery(REGISTERS_MOBILE_BREAKPOINT);
  const [errors, setErrors] = useState<RepairFieldErrors>({});

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => String(vehicle.id) === form.vehicle_id) ?? null,
    [vehicles, form.vehicle_id]
  );

  const pickerMode = getVehiclePickerMode(form.vehicle_id, form.vehicle_query);
  const ownerName = selectedVehicle?.customer.full_name ?? "";

  if (!open) {
    return null;
  }

  function handleSubmit() {
    const nextErrors = validateRepairCreateFields({
      vehicleId: form.vehicle_id,
      masterId: form.master_id,
      serviceLines: form.service_lines,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const id = firstRepairErrorFieldId(nextErrors);
      if (id) {
        document.getElementById(id)?.focus();
      }
      return;
    }
    onSubmit();
  }

  function handleClose() {
    setErrors({});
    onClose();
  }

  return (
    <RepairModalShell
      mode="create"
      title="New Repair"
      mobile={mobile}
      footerLayout="right"
      showStatusAutotag
      saving={saving}
      errors={errors}
      primaryLabel="Create Repair"
      savingLabel="Creating…"
      onClose={handleClose}
      onSubmit={handleSubmit}
    >
      <div className="field-section">
        <SectionHead label="Vehicle & customer" />
        <FieldRow label="Vehicle" required error={errors.vehicle}>
          <div id="repair-field-vehicle">
            <VehiclePicker
              mode={pickerMode}
              vehicles={vehicles}
              query={form.vehicle_query}
              selectedVehicle={selectedVehicle}
              onQueryChange={(value) =>
                onFormChange((current) => ({ ...current, vehicle_query: value, vehicle_id: "" }))
              }
              onSelect={(vehicle) =>
                onFormChange((current) => ({
                  ...current,
                  vehicle_id: String(vehicle.id),
                  vehicle_query: `${vehicle.license_plate} • ${vehicle.make} ${vehicle.model}`,
                }))
              }
              onClear={() =>
                onFormChange((current) => ({
                  ...current,
                  vehicle_id: "",
                  vehicle_query: current.vehicle_query,
                }))
              }
              onAddNewVehicle={onAddNewVehicle}
            />
          </div>
        </FieldRow>
        <FieldRow
          label="Owner"
          required
          hint={!errors.owner ? "Auto-filled from vehicle. Edit to override." : undefined}
        >
          <input
            className="field"
            type="text"
            value={ownerName}
            readOnly
            aria-required
            aria-invalid={Boolean(errors.owner)}
          />
        </FieldRow>
      </div>

      <div className="field-section">
        <SectionHead label="Assignment" />
        <FieldRow label="Master" required error={errors.master} htmlFor="repair-field-master">
          {isAdmin ? (
            <select
              id="repair-field-master"
              className="field"
              value={form.master_id}
              onChange={(event) => onFormChange((current) => ({ ...current, master_id: event.target.value }))}
              aria-required
              aria-invalid={Boolean(errors.master)}
            >
              <option value="">Unassigned</option>
              {staffUsers.map((master) => (
                <option key={master.id} value={master.id}>
                  {getStaffUserLabel(master)}
                </option>
              ))}
            </select>
          ) : form.master_id ? (
            <input
              id="repair-field-master"
              className="field"
              type="text"
              readOnly
              value={getStaffUserLabel(
                staffUsers.find((m) => String(m.id) === form.master_id) ?? {
                  id: currentUserId ?? 0,
                  email: currentUserEmail ?? "",
                  first_name: currentUserFirstName ?? "",
                  last_name: currentUserLastName ?? "",
                  role: "staff",
                }
              )}
            />
          ) : (
            <select
              id="repair-field-master"
              className="field"
              value={form.master_id}
              onChange={(event) => onFormChange((current) => ({ ...current, master_id: event.target.value }))}
              aria-required
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
          {form.service_lines.map((line, index) => (
            <ServiceRow
              key={line.key}
              index={index}
              line={line}
              catalog={catalog}
              idPrefix="repair-create"
              removable={form.service_lines.length > 1}
              onChange={(patch) =>
                onFormChange((current) => ({
                  ...current,
                  service_lines: current.service_lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
                }))
              }
              onRemove={() =>
                onFormChange((current) => ({
                  ...current,
                  service_lines: current.service_lines.filter((_, i) => i !== index),
                }))
              }
            />
          ))}
        </div>
        <button
          type="button"
          className="service-add"
          onClick={() =>
            onFormChange((current) => ({
              ...current,
              service_lines: [...current.service_lines, newRepairServiceLineDraft()],
            }))
          }
        >
          <RepairIcon name="plus" size={14} />
          Add service
        </button>
      </div>

      <div className="field-section">
        <SectionHead label="Notes" />
        <FieldRow>
          <textarea
            className="field"
            rows={3}
            value={form.issue_notes}
            placeholder="Describe the issue, customer expectations, additional context…"
            onChange={(event) => onFormChange((current) => ({ ...current, issue_notes: event.target.value }))}
          />
        </FieldRow>
      </div>

      {formError ? <p className="form-error">{formError}</p> : null}
    </RepairModalShell>
  );
}
