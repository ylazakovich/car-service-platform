import type { RepairServiceLineDraft } from "../../features/staff/shared/repairs";

export type RepairFieldErrors = {
  vehicle?: string;
  owner?: string;
  master?: string;
  services?: string;
};

/**
 * Count the top-level error fields present on a repair errors object.
 *
 * @param errors - The RepairFieldErrors object to inspect; its own enumerable keys are counted
 * @returns The number of top-level keys in `errors`
 */
export function countRepairFieldErrors(errors: RepairFieldErrors): number {
  return Object.keys(errors).length;
}

/**
 * Validate required fields for creating a repair.
 *
 * @param input - Object containing values from the create-repair form
 *   - `vehicleId`: the selected vehicle identifier
 *   - `masterId`: the selected master identifier (not validated here)
 *   - `serviceLines`: array of service line drafts; used to ensure at least one has a non-empty `name`
 * @returns A `RepairFieldErrors` object with error messages for missing or invalid fields (`vehicle`, `services`), or an empty object if there are no validation errors
 */
export function validateRepairCreateFields(input: {
  vehicleId: string;
  masterId: string;
  serviceLines: RepairServiceLineDraft[];
}): RepairFieldErrors {
  const errors: RepairFieldErrors = {};
  if (!input.vehicleId) {
    errors.vehicle = "Select a vehicle for this repair.";
  }
  const hasService = input.serviceLines.some((l) => l.name.trim().length > 0);
  if (!hasService) {
    errors.services = "Add at least one service.";
  }
  return errors;
}

/**
 * Validate editable fields for a repair being edited and return any field-specific errors.
 *
 * @param input.masterId - The assigned master's identifier; required when moving the repair to certain statuses
 * @param input.status - Current repair status; if `"in_progress"`, `"completed"`, or `"picked_up"`, a master must be assigned
 * @param input.serviceLines - Array of service line drafts; used to verify at least one service has a non-empty name when services are editable
 * @param input.canEditServices - When `true`, service line presence is enforced
 * @returns A `RepairFieldErrors` object mapping field names to error messages, or an empty object if no errors
 */
export function validateRepairEditFields(input: {
  masterId: string;
  status: string;
  serviceLines: RepairServiceLineDraft[];
  canEditServices: boolean;
}): RepairFieldErrors {
  const errors: RepairFieldErrors = {};
  if ((input.status === "in_progress" || input.status === "completed" || input.status === "picked_up") && !input.masterId) {
    errors.master = "Assign a master before moving to this status.";
  }
  if (input.canEditServices) {
    const hasService = input.serviceLines.some((l) => l.name.trim().length > 0);
    if (!hasService) {
      errors.services = "Add at least one service.";
    }
  }
  return errors;
}

/**
 * Get the DOM field id for the first repair form field that contains an error.
 *
 * Checks fields in priority order: vehicle, master, then services.
 *
 * @param errors - Object mapping repair field names to error messages
 * @returns The id of the first field with an error (`"repair-field-vehicle"`, `"repair-field-master"`, or `"repair-field-services"`), or `null` if no errors exist
 */
export function firstRepairErrorFieldId(errors: RepairFieldErrors): string | null {
  if (errors.vehicle) {
    return "repair-field-vehicle";
  }
  if (errors.master) {
    return "repair-field-master";
  }
  if (errors.services) {
    return "repair-field-services";
  }
  return null;
}
