import type { CSSProperties } from "react";
import { randomUuid } from "../../../lib/randomUuid";

export type RepairStatus = "new" | "in_progress" | "waiting_parts" | "completed" | "picked_up";

export type RepairStatusFilter = "all" | RepairStatus;

export type RepairNote = {
  id: string;
  author_name: string;
  author_email: string;
  created_at: string;
  text: string;
};

export type RepairServiceLineEntry = {
  id: string | null;
  name: string;
  catalog_service_id: number | null;
  sort_order: number;
};

/** Local row for forms (React key + draft fields). */
export type RepairServiceLineDraft = {
  key: string;
  persisted_id: string | null;
  name: string;
  catalog_service_id: number | null;
  catalog_service_price: string;
};

export function newRepairServiceLineDraft(): RepairServiceLineDraft {
  return {
    key: randomUuid(),
    persisted_id: null,
    name: "",
    catalog_service_id: null,
    catalog_service_price: "",
  };
}

export type RepairEntry = {
  id: number;
  created_at: string;
  updated_at: string;
  completed_at: string;
  vehicle_id: number;
  vehicle_label: string;
  vehicle_plate: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  mileage: number | null;
  owner_name: string;
  master_id: string | null;
  master_name: string | null;
  started_at: string | null;
  service_name: string;
  service_lines: RepairServiceLineEntry[];
  issue_notes: string;
  repair_notes: RepairNote[];
  status: RepairStatus;
  mileage_at_service: number | null;
  tracking_code: string;
  portal_token: string;
  has_pdf: boolean;
  /** Total from latest exported completion act (PDF), when any. */
  latest_act_document_total: number | null;
  estimated_date: string;
  before_photos: string[];
  during_photos: string[];
  after_photos: string[];
  position: number | null;
};

export type RepairPartsSummary = {
  lineCount: number;
  totalQuantity: number;
  preview: string[];
};

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  waiting_parts: "Waiting for Parts",
  completed: "Completed",
  picked_up: "Picked Up",
};

/**
 * Get the human-readable label for a repair status.
 *
 * @returns The human-readable label for the given repair status.
 */
export function repairStatusLabel(status: RepairStatus): string {
  return REPAIR_STATUS_LABELS[status];
}

export const REPAIR_KANBAN_COLUMNS: { status: RepairStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "in_progress", label: "In Progress" },
  { status: "waiting_parts", label: "Waiting Parts" },
  { status: "completed", label: "Completed" },
];

export function formatRepairDisplayDate(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}))?/);
  if (!match) {
    return value;
  }

  const [, year, month, day, time] = match;
  return time ? `${day}-${month}-${year} ${time}` : `${day}-${month}-${year}`;
}

export function getRepairStatusClass(status: RepairStatus) {
  return `repair-status-chip repair-status-${status}`;
}

/** Short label for Kanban / list: first service, or "+N" when multiple. */
export function formatRepairServicesSummary(repair: RepairEntry): string {
  const lines = repair.service_lines.filter((l) => l.name.trim());
  if (lines.length === 0) {
    return repair.service_name.trim() || "—";
  }
  if (lines.length === 1) {
    return lines[0].name;
  }
  return `${lines[0].name} +${lines.length - 1}`;
}

/**
 * Builds the date rows displayed on a repair card.
 *
 * @param repair - The repair record used to generate the date rows
 * @returns An array with the `"Created {date}"` row and, if the repair's status is `completed` or `picked_up` and `completed_at` is present, a second `"Completed {date}"` row
 */
export function formatRepairCardDateRow(repair: RepairEntry) {
  const createdLabel = `Created ${formatRepairDisplayDate(repair.created_at)}`;
  if ((repair.status !== "completed" && repair.status !== "picked_up") || !repair.completed_at) {
    return [createdLabel];
  }

  return [createdLabel, `Completed ${formatRepairDisplayDate(repair.completed_at)}`];
}

export function masterTint(masterId: string | number | null | undefined): CSSProperties {
  if (!masterId) return {};
  const hue = (Number(masterId) * 47) % 360;
  return { background: `hsl(${hue} 45% 28%)`, color: `hsl(${hue} 60% 80%)` };
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatStartedAt(startedAt: string | null | undefined): string {
  if (!startedAt) return "";
  const d = new Date(startedAt);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

/** Parse digits from vehicle profile mileage field (string from API / form). */
export function parseVehicleProfileMileageKm(raw: string | undefined): number | null {
  const t = (raw ?? "").trim().replace(/\s/g, "").replace(/,/g, "");
  if (!t || !/^\d+$/.test(t)) {
    return null;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Most recent repair on this vehicle that has mileage_at_service (by completed date, else created).
 */
export function getLastRecordedOdometerFromRepairs(
  repairs: RepairEntry[],
  vehicleId: number
): { km: number; tracking_code: string } | null {
  const withKm = repairs.filter((r) => r.vehicle_id === vehicleId && r.mileage_at_service != null);
  if (withKm.length === 0) {
    return null;
  }
  const sorted = [...withKm].sort((a, b) => {
    const da = (a.completed_at || a.created_at || "").trim();
    const db = (b.completed_at || b.created_at || "").trim();
    if (db !== da) {
      return db.localeCompare(da);
    }
    return b.id - a.id;
  });
  const r = sorted[0];
  return { km: r.mileage_at_service as number, tracking_code: r.tracking_code };
}
