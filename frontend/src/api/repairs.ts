import api from "./client";
import type { RepairStatus } from "../features/staff/shared/repairs";

export interface RepairNoteItem {
  id: number;
  author_name: string;
  author_email: string;
  text: string;
  created_at: string;
}

export interface RepairItem {
  id: number;
  visit_id: number;
  vehicle_id: number;
  vehicle_label: string;
  owner_name: string;
  master_id: number | null;
  master_name: string;
  service_name: string;
  issue_notes: string;
  status: RepairStatus;
  tracking_code: string;
  portal_token: string;
  has_pdf: boolean;
  completed_at: string | null;
  estimated_date: string | null;
  repair_notes: RepairNoteItem[];
  before_photos: string[];
  during_photos: string[];
  after_photos: string[];
  created_at: string;
  updated_at: string;
  position?: number | null;
}

export interface StaffUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface RepairWritePayload {
  vehicle_id: number;
  /** Add task to an existing visit (same vehicle). Omit to start a new visit. */
  visit_id?: number;
  master_id: number | null;
  service_name: string;
  issue_notes: string;
  status: RepairStatus;
  completed_at?: string | null;
  estimated_date?: string | null;
}

export async function fetchRepairs(q?: string, masterId?: number): Promise<RepairItem[]> {
  const params: Record<string, string | number> = {};
  if (q) params.q = q;
  if (masterId !== undefined) params.master_id = masterId;
  const response = await api.get<RepairItem[]>("/repairs/", {
    params: Object.keys(params).length ? params : undefined,
  });
  return response.data;
}

export async function createRepair(data: RepairWritePayload): Promise<RepairItem> {
  const response = await api.post<RepairItem>("/repairs/", data);
  return response.data;
}

export async function updateRepair(id: number, data: Partial<RepairWritePayload>): Promise<RepairItem> {
  const response = await api.patch<RepairItem>(`/repairs/${id}`, data);
  return response.data;
}

export async function deleteRepair(id: number): Promise<void> {
  await api.delete(`/repairs/${id}`);
}

export async function regeneratePortalToken(id: number): Promise<{ portal_token: string }> {
  const response = await api.post<{ portal_token: string }>(`/repairs/${id}/regenerate-portal-token/`);
  return response.data;
}

export async function addRepairNote(repairId: number, text: string): Promise<RepairNoteItem> {
  const response = await api.post<RepairNoteItem>(`/repairs/${repairId}/notes/`, { text });
  return response.data;
}

export async function deleteRepairNote(repairId: number, noteId: number): Promise<void> {
  await api.delete(`/repairs/${repairId}/notes/${noteId}`);
}

export async function fetchStaffUsers(): Promise<StaffUser[]> {
  const response = await api.get<StaffUser[]>("/auth/staff/");
  return response.data;
}

export async function reorderRepairs(items: { id: number; position: number }[]): Promise<void> {
  await api.post("/repairs/reorder/", items);
}

/** Latest exported PDF only; returns null if none yet (404). */
export async function fetchLatestRepairPdf(id: number): Promise<Blob | null> {
  const response = await api.get(`/repairs/${id}/pdf/`, {
    responseType: "blob",
    validateStatus: (status) => status === 200 || status === 404,
  });
  if (response.status === 404) {
    return null;
  }
  return response.data as Blob;
}

/** Creates a new stored PDF version + financial snapshot; returns PDF bytes. */
export async function exportRepairPdf(id: number): Promise<Blob> {
  const response = await api.post(`/repairs/${id}/pdf/export/`, null, {
    responseType: "blob",
  });
  return response.data as Blob;
}

/** Open preview: use last export if present, otherwise export once. */
export async function openRepairPdfForPreview(id: number): Promise<Blob> {
  const latest = await fetchLatestRepairPdf(id);
  if (latest !== null) {
    return latest;
  }
  return exportRepairPdf(id);
}
