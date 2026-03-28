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
  vehicle_license_plate?: string;
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

export interface PurchasePage {
  count: number;
  next: string | null;
  previous: string | null;
  results: PurchaseItem[];
}

export interface FetchPurchasesParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchPurchases(params: FetchPurchasesParams = {}): Promise<PurchasePage> {
  const query: Record<string, string | number> = {};
  if (params.q) query.q = params.q;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.page_size = params.pageSize;
  const response = await api.get<PurchasePage>("/purchases/", { params: query });
  return response.data;
}

export async function createPurchase(data: PurchaseWritePayload): Promise<PurchaseItem> {
  const response = await api.post<PurchaseItem>("/purchases/", data);
  return response.data;
}

export async function updatePurchase(id: number, data: Partial<PurchaseWritePayload>): Promise<PurchaseItem> {
  const response = await api.patch<PurchaseItem>(`/purchases/${id}`, data);
  return response.data;
}

export async function deletePurchase(id: number): Promise<void> {
  await api.delete(`/purchases/${id}`);
}

export async function uploadInvoiceFile(file: File): Promise<{ url: string; name: string }> {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<{ url: string; name: string }>("/uploads/invoice/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}
