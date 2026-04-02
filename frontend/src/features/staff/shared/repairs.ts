export type RepairStatus = "new" | "in_progress" | "waiting_parts" | "completed";

export type RepairStatusFilter = "all" | RepairStatus;

export type RepairNote = {
  id: string;
  author_name: string;
  author_email: string;
  created_at: string;
  text: string;
};

export type RepairEntry = {
  id: number;
  created_at: string;
  updated_at: string;
  completed_at: string;
  vehicle_id: number;
  vehicle_label: string;
  owner_name: string;
  master_id: string;
  master_name: string;
  service_name: string;
  issue_notes: string;
  repair_notes: RepairNote[];
  status: RepairStatus;
  tracking_code: string;
  portal_token: string;
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
};

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

export function formatRepairCardDateRow(repair: RepairEntry) {
  const createdLabel = `Created ${formatRepairDisplayDate(repair.created_at)}`;
  if (repair.status !== "completed" || !repair.completed_at) {
    return [createdLabel];
  }

  return [createdLabel, `Completed ${formatRepairDisplayDate(repair.completed_at)}`];
}
