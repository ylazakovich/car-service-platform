import api from "./client";

export interface SupplierItem {
  id: number;
  name: string;
  nip: string;
  phone: string;
  email: string;
  notes: string;
}

export interface PurchaseItem {
  id: number;
  order_date: string;
  approximate_delivery_date: string | null;
  supplier: SupplierItem;
  part_name: string;
  quantity: number;
  purchase_price: string;
  sale_price: string;
  repair_code: string;
  vehicle: number | null;
  invoice_name: string;
  invoice_url: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseWritePayload {
  order_date: string;
  approximate_delivery_date?: string | null;
  supplier_name: string;
  part_name: string;
  quantity: number;
  purchase_price: number;
  sale_price: number;
  repair_code?: string;
  vehicle_id?: number | null;
  invoice_name?: string;
  invoice_url?: string;
}

export async function fetchPurchases(q?: string): Promise<PurchaseItem[]> {
  const response = await api.get<PurchaseItem[]>("/purchases/", { params: q ? { q } : undefined });
  return response.data;
}

export async function createPurchase(data: PurchaseWritePayload): Promise<PurchaseItem> {
  const response = await api.post<PurchaseItem>("/purchases/", data);
  return response.data;
}

export async function updatePurchase(id: number, data: Partial<PurchaseWritePayload>): Promise<PurchaseItem> {
  const response = await api.patch<PurchaseItem>(`/purchases/${id}/`, data);
  return response.data;
}

export async function deletePurchase(id: number): Promise<void> {
  await api.delete(`/purchases/${id}/`);
}
