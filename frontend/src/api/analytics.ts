import api from "./client";

export type DashboardPdfTotals = {
  labor_total: number;
  parts_client_total: number;
  parts_purchase_total: number;
  other_expenses_total: number;
  document_total: number;
  repairs_with_latest_act: number;
};

export type DashboardPdfSeriesRow = {
  date: string;
  labor_total: number;
  parts_client_total: number;
  parts_purchase_total: number;
  other_expenses_total: number;
  document_total: number;
  export_events: number;
};

export type DashboardMoneyflowSupplierRow = {
  supplier_id: number;
  supplier_name: string;
  total_spend: number;
  line_count: number;
};

export type DashboardMoneyflowUnlinked = {
  count: number;
  total_spend: number;
};

export type DashboardMoneyflowExporterRow = {
  user_id: number | null;
  email: string;
  display_name: string;
  export_count: number;
};

export type DashboardMoneyflowPayload = {
  supplier_spend_top: DashboardMoneyflowSupplierRow[];
  purchases_unlinked: DashboardMoneyflowUnlinked;
  exports_by_exporter: DashboardMoneyflowExporterRow[];
};

export type DashboardWarehouseValueTriplet = {
  buy_total: number;
  sale_total: number;
  margin_total: number;
};

export type DashboardWarehouseInvoiceSplit = {
  line_count: number;
  quantity_total: number;
  buy_total: number;
};

export type DashboardWarehouseSupplierRow = {
  supplier_id: number;
  supplier_name: string;
  current_buy_total: number;
  in_stock_buy_total: number;
  in_transit_buy_total: number;
  quantity_total: number;
};

export type DashboardWarehousePayload = {
  snapshot_as_of: string;
  stock_totals: {
    delivered_quantity_total: number;
    assigned_quantity_total: number;
    free_quantity_total: number;
    in_transit_quantity_total: number;
  };
  valuations: {
    in_stock: DashboardWarehouseValueTriplet;
    in_transit: DashboardWarehouseValueTriplet;
    cumulative: DashboardWarehouseValueTriplet;
  };
  invoice_split: {
    with_invoice: DashboardWarehouseInvoiceSplit;
    without_invoice: DashboardWarehouseInvoiceSplit;
  };
  suppliers_top_current: DashboardWarehouseSupplierRow[];
};

export type DashboardAnalyticsResponse = {
  moneyflow_range: { start_date: string; end_date: string };
  operational_range: { start_date: string; end_date: string };
  pdf: {
    latest_act_totals: DashboardPdfTotals;
    coverage: { completed_in_range: number; completed_without_pdf: number };
    exports_in_period: number;
    completed_repairs_with_multiple_exports: number;
    completed_to_first_export_lag_days: {
      average: number | null;
      median: number | null;
      p90: number | null;
      sample_size: number;
    };
    series_by_export_day: DashboardPdfSeriesRow[];
  };
  operational: {
    funnel_by_status: Record<string, number>;
    repairs_created_in_range: number;
    cycle_time_days: {
      median: number | null;
      p90: number | null;
      sample_completed_in_range: number;
    };
    active_workload_preview: Array<{
      id: number;
      tracking_code: string;
      service_name: string;
      status: string;
      vehicle_label: string;
      updated_at: string;
    }>;
    recently_created_preview: Array<{
      id: number;
      tracking_code: string;
      service_name: string;
      status: string;
      vehicle_label: string;
      created_at: string;
    }>;
  };
  service_board: {
    range_summary: {
      open_repairs_end_of_range: number;
      vehicles_in_range: number;
      customers_in_range: number;
      returning_customers_in_range: number;
      non_returning_customers_in_range: number;
      returning_ratio: number | null;
      average_cycle_time_days: number | null;
      completed_repairs_in_range: number;
    };
    current_snapshot: {
      waiting_parts_current: number;
      waiting_parts_oldest_days: number | null;
      overdue_repairs_current: number;
      open_repairs_current: number;
    };
    all_time_totals: {
      repairs_total: number;
      vehicles_total: number;
      customers_total: number;
      returning_customers_total: number;
      non_returning_customers_total: number;
      masters_total: number;
    };
    masters_current: Array<{
      master_id: number;
      display_name: string;
      assigned_open_current: number;
      new_current: number;
      in_progress_current: number;
      waiting_parts_current: number;
    }>;
    masters_range: Array<{
      master_id: number;
      display_name: string;
      completed_in_range: number;
      actual_service_value_completed: number;
    }>;
  };
  moneyflow: DashboardMoneyflowPayload;
  warehouse: DashboardWarehousePayload;
};

export async function fetchDashboardAnalytics(params: {
  start_date: string;
  end_date: string;
  operational_start_date?: string;
  operational_end_date?: string;
}): Promise<DashboardAnalyticsResponse> {
  const search = new URLSearchParams();
  search.set("start_date", params.start_date);
  search.set("end_date", params.end_date);
  if (params.operational_start_date) {
    search.set("operational_start_date", params.operational_start_date);
  }
  if (params.operational_end_date) {
    search.set("operational_end_date", params.operational_end_date);
  }
  const response = await api.get<unknown>(`/analytics/dashboard/?${search.toString()}`);
  const data = response.data;
  if (
    !data ||
    typeof data !== "object" ||
    !("pdf" in data) ||
    !("operational" in data) ||
    !("service_board" in data) ||
    !("moneyflow" in data) ||
    !("warehouse" in data) ||
    data.pdf == null ||
    typeof data.pdf !== "object" ||
    data.service_board == null ||
    typeof data.service_board !== "object" ||
    data.moneyflow == null ||
    typeof data.moneyflow !== "object" ||
    data.warehouse == null ||
    typeof data.warehouse !== "object"
  ) {
    throw new Error("Invalid dashboard analytics response");
  }
  const mf = data.moneyflow as Record<string, unknown>;
  const warehouse = data.warehouse as Record<string, unknown>;
  if (
    !Array.isArray(mf.supplier_spend_top) ||
    mf.purchases_unlinked == null ||
    typeof mf.purchases_unlinked !== "object" ||
    !Array.isArray(mf.exports_by_exporter)
  ) {
    throw new Error("Invalid dashboard analytics moneyflow payload");
  }
  if (
    typeof warehouse.snapshot_as_of !== "string" ||
    warehouse.stock_totals == null ||
    typeof warehouse.stock_totals !== "object" ||
    warehouse.valuations == null ||
    typeof warehouse.valuations !== "object" ||
    warehouse.invoice_split == null ||
    typeof warehouse.invoice_split !== "object" ||
    !Array.isArray(warehouse.suppliers_top_current)
  ) {
    throw new Error("Invalid dashboard analytics warehouse payload");
  }
  return data as DashboardAnalyticsResponse;
}
