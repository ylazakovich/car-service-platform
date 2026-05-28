import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDashboardAnalytics, type DashboardAnalyticsResponse } from "./analytics";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("./client", () => ({ default: mockApi }));

function dashboard(overrides: Partial<DashboardAnalyticsResponse> = {}): DashboardAnalyticsResponse {
  return {
    moneyflow_range: { start_date: "2026-01-01", end_date: "2026-01-31" },
    operational_range: { start_date: "2026-01-01", end_date: "2026-01-31" },
    pdf: {
      latest_act_totals: {
        labor_total: 100,
        parts_client_total: 50,
        parts_purchase_total: 30,
        other_expenses_total: 10,
        document_total: 160,
        repairs_with_latest_act: 2,
      },
      coverage: { completed_in_range: 3, completed_without_pdf: 1 },
      exports_in_period: 2,
      completed_repairs_with_multiple_exports: 0,
      completed_to_first_export_lag_days: { average: 1, median: 1, p90: 2, sample_size: 2 },
      series_by_export_day: [],
    },
    operational: {
      funnel_by_status: { new: 1, completed: 2 },
      repairs_created_in_range: 3,
      cycle_time_days: { median: 2, p90: 5, sample_completed_in_range: 2 },
      active_workload_preview: [],
      recently_created_preview: [],
    },
    service_board: {
      range_summary: {
        open_repairs_end_of_range: 4,
        vehicles_in_range: 3,
        customers_in_range: 2,
        returning_customers_in_range: 1,
        non_returning_customers_in_range: 1,
        returning_ratio: 0.5,
        median_cycle_time_days: 2,
        completed_repairs_in_range: 2,
      },
      current_snapshot: { waiting_parts_current: 1, open_repairs_current: 4 },
      all_time_totals: {
        repairs_total: 10,
        vehicles_total: 8,
        customers_total: 6,
        returning_customers_total: 2,
        non_returning_customers_total: 4,
        masters_total: 2,
      },
      masters_current: [],
      masters_range: [],
    },
    moneyflow: {
      supplier_spend_top: [],
      purchases_unlinked: { count: 0, total_spend: 0 },
      exports_by_exporter: [],
      shop_consumables: { line_count: 1, buy_total: 12.5 },
    },
    warehouse: {
      snapshot_as_of: "2026-01-31",
      stock_totals: {
        delivered_quantity_total: 10,
        assigned_quantity_total: 3,
        free_quantity_total: 7,
        in_transit_quantity_total: 2,
      },
      valuations: {
        in_stock: { buy_total: 100, sale_total: 150, margin_total: 50 },
        in_transit: { buy_total: 25, sale_total: 40, margin_total: 15 },
        cumulative: { buy_total: 125, sale_total: 190, margin_total: 65 },
      },
      invoice_split: {
        with_invoice: { line_count: 1, quantity_total: 2, buy_total: 20 },
        without_invoice: { line_count: 0, quantity_total: 0, buy_total: 0 },
      },
      suppliers_top_current: [
        {
          supplier_id: 5,
          supplier_name: "Parts Sp. z o.o.",
          current_buy_total: 100,
          in_stock_buy_total: 90,
          in_transit_buy_total: 10,
          current_quantity_total: 7,
          in_stock_quantity_total: 6,
          in_transit_quantity_total: 1,
          parts: [],
        },
      ],
    },
    ...overrides,
  };
}

describe("fetchDashboardAnalytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds the dashboard query with moneyflow and optional operational ranges", async () => {
    const payload = dashboard();
    mockApi.get.mockResolvedValue({ data: payload });

    const result = await fetchDashboardAnalytics({
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      operational_start_date: "2025-12-01",
      operational_end_date: "2026-01-15",
    });

    expect(mockApi.get).toHaveBeenCalledWith(
      "/analytics/dashboard/?start_date=2026-01-01&end_date=2026-01-31&operational_start_date=2025-12-01&operational_end_date=2026-01-15",
    );
    expect(result).toBe(payload);
  });

  it("omits operational range query params when they are empty", async () => {
    mockApi.get.mockResolvedValue({ data: dashboard() });

    await fetchDashboardAnalytics({
      start_date: "2026-02-01",
      end_date: "2026-02-28",
      operational_start_date: "",
      operational_end_date: undefined,
    });

    expect(mockApi.get).toHaveBeenCalledWith("/analytics/dashboard/?start_date=2026-02-01&end_date=2026-02-28");
  });

  it.each([
    ["null response", null, "Invalid dashboard analytics response"],
    ["missing pdf block", (() => { const d = dashboard() as unknown as Record<string, unknown>; delete d.pdf; return d; })(), "Invalid dashboard analytics response"],
    ["null service_board block", { ...dashboard(), service_board: null }, "Invalid dashboard analytics response"],
    ["non-array supplier_spend_top", { ...dashboard(), moneyflow: { ...dashboard().moneyflow, supplier_spend_top: {} as unknown as [] } }, "Invalid dashboard analytics moneyflow payload"],
    ["missing purchases_unlinked", { ...dashboard(), moneyflow: { ...dashboard().moneyflow, purchases_unlinked: null as unknown as { count: number; total_spend: number } } }, "Invalid dashboard analytics moneyflow payload"],
    ["invalid shop consumables line_count", { ...dashboard(), moneyflow: { ...dashboard().moneyflow, shop_consumables: { line_count: "1" as unknown as number, buy_total: 12 } } }, "Invalid dashboard analytics shop_consumables payload"],
    ["invalid warehouse snapshot", { ...dashboard(), warehouse: { ...dashboard().warehouse, snapshot_as_of: 123 as unknown as string } }, "Invalid dashboard analytics warehouse payload"],
    ["missing warehouse supplier parts", { ...dashboard(), warehouse: { ...dashboard().warehouse, suppliers_top_current: [{ supplier_id: 5, supplier_name: "Parts" } as unknown as DashboardAnalyticsResponse["warehouse"]["suppliers_top_current"][number]] } }, "Invalid dashboard analytics warehouse supplier parts payload"],
  ])('throws a specific error for %s', async (_name, data, message) => {
    mockApi.get.mockResolvedValue({ data });

    await expect(fetchDashboardAnalytics({ start_date: "2026-01-01", end_date: "2026-01-31" })).rejects.toThrow(message);
  });
});
