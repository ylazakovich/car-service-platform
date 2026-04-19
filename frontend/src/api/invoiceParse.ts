import api from "./client";

export type InvoiceParseTemplateItem = {
  id: number;
  name: string;
  description: string;
  line_pattern: string;
  supplier_pattern: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ParsedInvoiceLine = {
  part_name: string;
  quantity: number;
  purchase_price: string;
};

export async function fetchInvoiceParseTemplates(includeInactive?: boolean): Promise<InvoiceParseTemplateItem[]> {
  const params: Record<string, string> = {};
  if (includeInactive) {
    params.include_inactive = "1";
  }
  const response = await api.get<InvoiceParseTemplateItem[]>("/purchases/invoice-parse-templates/", { params });
  return response.data;
}

export type InvoiceParseTemplateWritePayload = {
  name: string;
  description?: string;
  line_pattern: string;
  supplier_pattern?: string;
  is_active?: boolean;
  sort_order?: number;
};

export async function createInvoiceParseTemplate(
  data: InvoiceParseTemplateWritePayload,
): Promise<InvoiceParseTemplateItem> {
  const response = await api.post<InvoiceParseTemplateItem>("/purchases/invoice-parse-templates/", data);
  return response.data;
}

export async function updateInvoiceParseTemplate(
  id: number,
  data: Partial<InvoiceParseTemplateWritePayload>,
): Promise<InvoiceParseTemplateItem> {
  const response = await api.patch<InvoiceParseTemplateItem>(`/purchases/invoice-parse-templates/${id}`, data);
  return response.data;
}

export async function deleteInvoiceParseTemplate(id: number): Promise<void> {
  await api.delete(`/purchases/invoice-parse-templates/${id}`);
}

export type SuggestInvoiceParseResponse =
  | {
      matched: true;
      suggested_name: string;
      line_pattern: string;
      preview_lines: ParsedInvoiceLine[];
      suggested_supplier_pattern?: string | null;
      preview_supplier_name?: string | null;
    }
  | {
      matched: false;
      detail?: string;
      suggested_supplier_pattern?: string | null;
      preview_supplier_name?: string | null;
    };

export async function suggestInvoicePattern(rawText: string): Promise<SuggestInvoiceParseResponse> {
  const response = await api.post<SuggestInvoiceParseResponse>("/purchases/invoice-parse/suggest/", {
    raw_text: rawText,
  });
  return response.data;
}

export type PreviewInvoiceParseResponse = {
  lines: ParsedInvoiceLine[];
  warnings: string[];
  matched_count: number;
  supplier_name: string | null;
  supplier_pattern_used: string | null;
};

export async function previewInvoiceParseJson(payload: {
  raw_text?: string;
  line_pattern?: string;
  supplier_pattern?: string;
  template_id?: number;
}): Promise<PreviewInvoiceParseResponse> {
  const response = await api.post<PreviewInvoiceParseResponse>("/purchases/invoice-parse/preview/", payload);
  return response.data;
}

export async function previewInvoiceParseMultipart(form: FormData): Promise<PreviewInvoiceParseResponse> {
  const response = await api.post<PreviewInvoiceParseResponse>("/purchases/invoice-parse/preview/", form);
  return response.data;
}
