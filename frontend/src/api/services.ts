import api from "./client";

export interface ServiceItem {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
}

export async function fetchServices(): Promise<ServiceItem[]> {
  const response = await api.get<ServiceItem[]>("/services/");
  return response.data;
}

export async function createService(data: { name: string; description?: string }): Promise<ServiceItem> {
  const response = await api.post<ServiceItem>("/services/", data);
  return response.data;
}
