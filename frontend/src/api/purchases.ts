import api from "./client";

export interface SupplierItem {
  id: number;
  name: string;
  nip: string;
  phone: string;
  email: string;
  notes: string;
}

export interface UnitOfMeasureItem {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
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
  unit_of_measure: UnitOfMeasureItem;
  invoice_name: string;
  invoice_url: string;
  delivered: boolean;
  is_shop_consumable: boolean;
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
  unit_of_measure_id?: number;
  invoice_name?: string;
  invoice_url?: string;
  delivered?: boolean;
  is_shop_consumable?: boolean;
}

/** One line under a shared invoice header (POST /purchases/bulk/). */
export interface PurchaseBulkLinePayload {
  part_name: string;
  quantity: number;
  purchase_price: number;
  sale_price?: number;
  repair_code?: string;
  vehicle_id?: number | null;
  unit_of_measure_id?: number;
}

export interface PurchaseBulkWritePayload {
  order_date: string;
  approximate_delivery_date?: string | null;
  supplier_name: string;
  invoice_name?: string;
  invoice_url?: string;
  delivered?: boolean;
  is_shop_consumable?: boolean;
  lines: PurchaseBulkLinePayload[];
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
  /** When set, filter by shop consumable flag (true / false). */
  shopConsumable?: boolean;
  orderDateFrom?: string;
  orderDateTo?: string;
}

export async function fetchPurchases(params: FetchPurchasesParams = {}): Promise<PurchasePage> {
  const query: Record<string, string | number> = {};
  if (params.q) query.q = params.q;
  if (params.page) query.page = params.page;
  if (params.pageSize) query.page_size = params.pageSize;
  if (params.shopConsumable === true) query.shop_consumable = "true";
  if (params.shopConsumable === false) query.shop_consumable = "false";
  if (params.orderDateFrom) query.order_date_from = params.orderDateFrom;
  if (params.orderDateTo) query.order_date_to = params.orderDateTo;
  const response = await api.get<PurchasePage>("/purchases/", { params: query });
  return response.data;
}

export async function createPurchase(data: PurchaseWritePayload): Promise<PurchaseItem> {
  const response = await api.post<PurchaseItem>("/purchases/", data);
  return response.data;
}

export async function createPurchasesBulk(data: PurchaseBulkWritePayload): Promise<PurchaseItem[]> {
  const response = await api.post<PurchaseItem[]>("/purchases/bulk/", data);
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
  const response = await api.post<{ url: string; name: string }>("/uploads/invoice/", form);
  return response.data;
}

export async function fetchSuppliers(q?: string): Promise<SupplierItem[]> {
  const params: Record<string, string> = {};
  if (q) params.q = q;
  const response = await api.get<SupplierItem[]>("/purchases/suppliers/", { params });
  return response.data;
}

export type SupplierWritePayload = {
  name: string;
  nip?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export async function createSupplier(data: SupplierWritePayload): Promise<SupplierItem> {
  const response = await api.post<SupplierItem>("/purchases/suppliers/", data);
  return response.data;
}

export async function fetchUnitsOfMeasure(params?: { includeInactive?: boolean }): Promise<UnitOfMeasureItem[]> {
  const query: Record<string, string> = {};
  if (params?.includeInactive) {
    query.include_inactive = "true";
  }
  const response = await api.get<UnitOfMeasureItem[]>("/purchases/units/", { params: query });
  return response.data;
}

export async function createUnitOfMeasure(data: {
  code: string;
  name: string;
  is_active?: boolean;
}): Promise<UnitOfMeasureItem> {
  const response = await api.post<UnitOfMeasureItem>("/purchases/units/", data);
  return response.data;
}

export async function reorderUnitsOfMeasure(order: number[]): Promise<UnitOfMeasureItem[]> {
  const response = await api.post<UnitOfMeasureItem[]>("/purchases/units/reorder/", { order });
  return response.data;
}

export async function updateUnitOfMeasure(
  id: number,
  data: Partial<{ code: string; name: string; is_active: boolean; sort_order: number }>
): Promise<UnitOfMeasureItem> {
  const response = await api.patch<UnitOfMeasureItem>(`/purchases/units/${id}`, data);
  return response.data;
}

export async function deleteUnitOfMeasure(id: number): Promise<void> {
  await api.delete(`/purchases/units/${id}`);
}
