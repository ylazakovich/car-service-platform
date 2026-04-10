import api from "./client";

export interface ServiceItem {
  id: number;
  name: string;
  description: string;
  price: string | null;
  is_active: boolean;
}

export async function fetchServices(): Promise<ServiceItem[]> {
  const response = await api.get<ServiceItem[]>("/services/");
  return response.data;
}

export async function createService(data: {
  name: string;
  description?: string;
  price?: string | null;
  is_active?: boolean;
}): Promise<ServiceItem> {
  const response = await api.post<ServiceItem>("/services/", data);
  return response.data;
}

export async function updateService(
  id: number,
  data: Partial<{ name: string; description: string; price: string | null; is_active: boolean }>,
): Promise<ServiceItem> {
  const response = await api.patch<ServiceItem>(`/services/${id}`, data);
  return response.data;
}

export async function deleteService(id: number): Promise<void> {
  await api.delete(`/services/${id}`);
}
