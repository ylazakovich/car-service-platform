import api from "./client";

export interface PortalVehicleInfo {
  label: string;
  year: number | null;
  license_plate: string;
}

export interface PortalRepair {
  tracking_code: string;
  service_name: string;
  service_lines?: { name: string; catalog_service_id: number | null }[];
  status: "new" | "in_progress" | "waiting_parts" | "completed";
  status_display: string;
  vehicle_info: PortalVehicleInfo;
  estimated_date: string | null;
  mileage_at_service: number | null;
  completed_at: string | null;
  created_at: string;
}

export async function fetchPortalRepair(token: string): Promise<PortalRepair> {
  const { data } = await api.get<PortalRepair>(`/portal/${encodeURIComponent(token)}/`);
  return data;
}
