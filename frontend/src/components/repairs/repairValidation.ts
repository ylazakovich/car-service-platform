import type { RepairServiceLineDraft } from "../../features/staff/shared/repairs";

export type RepairFieldErrors = {
  vehicle?: string;
  owner?: string;
  master?: string;
  services?: string;
};

export function countRepairFieldErrors(errors: RepairFieldErrors): number {
  return Object.keys(errors).length;
}

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
