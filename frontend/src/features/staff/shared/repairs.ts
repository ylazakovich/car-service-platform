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
  before_photos: string[];
  during_photos: string[];
  after_photos: string[];
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

export function getRepairStatusClass(status: RepairStatus) {
  return `repair-status-chip repair-status-${status}`;
}
