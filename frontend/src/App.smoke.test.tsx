import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import type { DashboardAnalyticsResponse } from "./api/analytics";
import { AuthProvider } from "./context/AuthContext";

const localStorageStore = new Map<string, string>();
const mockOpen = vi.fn();
const mockConfirm = vi.fn();
const mockAlert = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    response: { use: vi.fn() },
    request: { use: vi.fn() },
  },
}));

vi.mock("./api/client", () => ({ default: mockApi }));

afterEach(() => {
  cleanup();
});

function renderApp(route = "/app") {
  window.history.pushState({}, "Test page", route);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

function formatExpectedDateInput(value: Date) {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = String(value.getFullYear());
  return `${day}-${month}-${year}`;
}

function getCalendarMonthIndex(label: string) {
  const [monthToken, yearToken] = label.trim().split(/\s+/);
  const normalizedMonthToken = monthToken === "Sept" ? "Sep" : monthToken;
  const monthIndex = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(
    normalizedMonthToken
  );
  return Number(yearToken) * 12 + monthIndex;
}

function getIsoMonthIndex(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  return year * 12 + (month - 1);
}

async function chooseDateInDashboardCalendar(
  user: ReturnType<typeof userEvent.setup>,
  calendar: HTMLElement,
  iso: string
) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const targetButton = within(calendar).queryByRole("button", { name: `Choose ${iso}` });
    if (targetButton) {
      await user.click(targetButton);
      return;
    }

    const visibleLabel = calendar.querySelector(".friendly-date-header strong")?.textContent ?? "";
    const targetMonthIndex = getIsoMonthIndex(iso);
    const visibleMonthIndex = getCalendarMonthIndex(visibleLabel);
    await user.click(
      within(calendar).getByRole("button", {
        name: targetMonthIndex < visibleMonthIndex ? "Previous month" : "Next month",
      })
    );
  }

  throw new Error(`Unable to navigate calendar to ${iso}`);
}

async function pickDashboardDateRange(user: ReturnType<typeof userEvent.setup>, startIso: string, endIso: string) {
  await user.click(await screen.findByLabelText("Date range"));
  const calendar = await screen.findByRole("dialog", { name: "Date range calendar" });
  await chooseDateInDashboardCalendar(user, calendar, startIso);
  await chooseDateInDashboardCalendar(user, calendar, endIso);
  await waitFor(() => {
    expect(screen.queryByRole("dialog", { name: "Date range calendar" })).not.toBeInTheDocument();
  });
}

/** Matches `PurchaseItem.unit_of_measure` for smoke mocks (`mapApiPurchaseToPurchaseEntry`). */
const SMOKE_UOM_PCS = { id: 1, code: "pcs", name: "Pieces", is_active: true, sort_order: 10 };

const SMOKE_UNITS_OF_MEASURE_LIST = [
  SMOKE_UOM_PCS,
  { id: 2, code: "L", name: "Liters", is_active: true, sort_order: 20 },
];

function isPurchasesIndexGet(url: string) {
  return url.split("?")[0] === "/purchases/";
}

function isPurchasesUnitsGet(url: string) {
  return url.split("?")[0] === "/purchases/units/";
}

/** Default `/repairs/` mock uses this plate + model in `vehicle_label` (modal `aria-labelledby`). */
const SMOKE_DEFAULT_REPAIR_DIALOG_NAME = /WB 1234K\s*•\s*Toyota Corolla/;

async function openRepairKanbanCardByTrackingCode(
  user: ReturnType<typeof userEvent.setup>,
  trackingCode: string
): Promise<void> {
  const board = await screen.findByLabelText("Repairs kanban board");
  const chip = within(board).getByText(`#${trackingCode}`);
  const card = chip.closest("article");
  if (!card || !(card instanceof HTMLElement)) {
    throw new Error(`Kanban card for ${trackingCode} not found`);
  }
  await user.click(card);
}

/** Minimal valid `/api/analytics/dashboard/` payload for tests that override `mockApi.get`. */
function createStubDashboardAnalyticsResponse(): DashboardAnalyticsResponse {
  return {
    moneyflow_range: { start_date: "2025-01-01", end_date: "2025-12-31" },
    operational_range: { start_date: "2025-01-01", end_date: "2025-12-31" },
    pdf: {
      latest_act_totals: {
        labor_total: 0,
        parts_client_total: 0,
        parts_purchase_total: 0,
        other_expenses_total: 0,
        document_total: 0,
        repairs_with_latest_act: 0,
      },
      coverage: { completed_in_range: 0, completed_without_pdf: 0 },
      exports_in_period: 0,
      completed_repairs_with_multiple_exports: 0,
      completed_to_first_export_lag_days: {
        average: null,
        median: null,
        p90: null,
        sample_size: 0,
      },
      series_by_export_day: [],
    },
    operational: {
      funnel_by_status: { new: 0, in_progress: 0, waiting_parts: 0, completed: 0 },
      repairs_created_in_range: 0,
      cycle_time_days: { median: null, p90: null, sample_completed_in_range: 0 },
      active_workload_preview: [],
      recently_created_preview: [],
    },
    service_board: {
      range_summary: {
        open_repairs_end_of_range: 0,
        vehicles_in_range: 0,
        customers_in_range: 0,
        returning_customers_in_range: 0,
        non_returning_customers_in_range: 0,
        returning_ratio: null,
        median_cycle_time_days: null,
        completed_repairs_in_range: 0,
      },
      current_snapshot: {
        waiting_parts_current: 0,
        open_repairs_current: 0,
      },
      all_time_totals: {
        repairs_total: 0,
        vehicles_total: 0,
        customers_total: 0,
        returning_customers_total: 0,
        non_returning_customers_total: 0,
        masters_total: 0,
      },
      masters_current: [],
      masters_range: [],
    },
    moneyflow: {
      supplier_spend_top: [],
      purchases_unlinked: { count: 0, total_spend: 0 },
      exports_by_exporter: [],
      shop_consumables: { line_count: 0, buy_total: 0 },
    },
    warehouse: {
      snapshot_as_of: "2025-03-31T12:30:00Z",
      stock_totals: {
        delivered_quantity_total: 0,
        assigned_quantity_total: 0,
        free_quantity_total: 0,
        in_transit_quantity_total: 0,
      },
      valuations: {
        in_stock: { buy_total: 0, sale_total: 0, margin_total: 0 },
        in_transit: { buy_total: 0, sale_total: 0, margin_total: 0 },
        cumulative: { buy_total: 0, sale_total: 0, margin_total: 0 },
      },
      invoice_split: {
        with_invoice: { line_count: 0, quantity_total: 0, buy_total: 0 },
        without_invoice: { line_count: 0, quantity_total: 0, buy_total: 0 },
      },
      suppliers_top_current: [],
    },
  };
}

describe("bootstrap application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => localStorageStore.get(key) ?? null,
        setItem: (key: string, value: string) => {
          localStorageStore.set(key, value);
        },
        removeItem: (key: string) => {
          localStorageStore.delete(key);
        },
      },
    });
    Object.defineProperty(window, "open", {
      configurable: true,
      value: mockOpen,
    });
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: mockConfirm,
    });
    Object.defineProperty(window, "alert", {
      configurable: true,
      value: mockAlert,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: mockCreateObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: mockRevokeObjectURL,
    });
    mockOpen.mockReset();
    mockConfirm.mockReset();
    mockAlert.mockReset();
    mockCreateObjectURL.mockReset();
    mockRevokeObjectURL.mockReset();
    mockConfirm.mockReturnValue(true);
    mockCreateObjectURL.mockReturnValue("blob:test-invoice");
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({
          data: [{ id: 1, full_name: "Alex Johnson", phone: "+48 555 100 200", email: "", notes: "", vehicle_count: 1 }],
        });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              customer: { id: 1, full_name: "Alex Johnson" },
              license_plate: "WB 1234K",
              make: "Toyota",
              model: "Corolla",
              year: 2018,
              vin: "",
              color: "White",
              notes: "",
              added_date: "2024-11-04",
            },
          ],
        });
      }
      if (url === "/repairs/") {
        return Promise.resolve({
          data: [
            {
              id: 11,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "Brake Inspection",
              issue_notes: "Customer reported vibration while braking.",
              status: "in_progress",
              tracking_code: "TOR-1011",
              portal_token: "test-portal-token-1011",
              has_pdf: false,
              estimated_date: null,
              completed_at: null,
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-04-05T10:00:00Z",
              updated_at: "2025-04-05T10:00:00Z",
            },
          ],
        });
      }
      if (url === "/services/") {
        return Promise.resolve({
          data: [
            { id: 1, name: "Brake Inspection", description: "", price: "299.00", is_active: true },
          ],
        });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({
          data: {
            moneyflow_range: { start_date: "2025-04-01", end_date: "2025-04-30" },
            operational_range: { start_date: "2025-04-01", end_date: "2025-04-30" },
            pdf: {
              latest_act_totals: {
                labor_total: 0,
                parts_client_total: 0,
                parts_purchase_total: 0,
                other_expenses_total: 0,
                document_total: 0,
                repairs_with_latest_act: 0,
              },
              coverage: { completed_in_range: 0, completed_without_pdf: 0 },
              exports_in_period: 0,
              completed_repairs_with_multiple_exports: 0,
              completed_to_first_export_lag_days: {
                average: null,
                median: null,
                p90: null,
                sample_size: 0,
              },
              series_by_export_day: [],
            },
            operational: {
              funnel_by_status: { new: 0, in_progress: 1, waiting_parts: 0, completed: 0 },
              repairs_created_in_range: 1,
              cycle_time_days: { median: null, p90: null, sample_completed_in_range: 0 },
              active_workload_preview: [],
              recently_created_preview: [],
            },
            service_board: {
              range_summary: {
                open_repairs_end_of_range: 1,
                vehicles_in_range: 1,
                customers_in_range: 1,
                returning_customers_in_range: 0,
                non_returning_customers_in_range: 1,
                returning_ratio: 0,
                median_cycle_time_days: null,
                completed_repairs_in_range: 0,
              },
              current_snapshot: {
                waiting_parts_current: 0,
                open_repairs_current: 1,
              },
              all_time_totals: {
                repairs_total: 1,
                vehicles_total: 1,
                customers_total: 1,
                returning_customers_total: 0,
                non_returning_customers_total: 1,
                masters_total: 0,
              },
              masters_current: [],
              masters_range: [],
            },
            moneyflow: {
              supplier_spend_top: [],
              purchases_unlinked: { count: 0, total_spend: 0 },
              exports_by_exporter: [],
              shop_consumables: { line_count: 0, buy_total: 0 },
            },
            warehouse: {
              snapshot_as_of: "2025-04-30T12:00:00Z",
              stock_totals: {
                delivered_quantity_total: 0,
                assigned_quantity_total: 0,
                free_quantity_total: 0,
                in_transit_quantity_total: 0,
              },
              valuations: {
                in_stock: { buy_total: 0, sale_total: 0, margin_total: 0 },
                in_transit: { buy_total: 0, sale_total: 0, margin_total: 0 },
                cumulative: { buy_total: 0, sale_total: 0, margin_total: 0 },
              },
              invoice_split: {
                with_invoice: { line_count: 0, quantity_total: 0, buy_total: 0 },
                without_invoice: { line_count: 0, quantity_total: 0, buy_total: 0 },
              },
              suppliers_top_current: [],
            },
          },
        });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({
          data: {
            results: [
              {
                id: 2,
                order_date: "2025-04-05",
                approximate_delivery_date: null,
                supplier: { id: 1, name: "AutoParts Pro", nip: "", phone: "", email: "", notes: "" },
                vehicle_license_plate: "",
                part_name: "Brake Pad Set",
                quantity: 2,
                purchase_price: "85.00",
                sale_price: "120.00",
                repair_code: "TOR-1011",
                vehicle: null,
                unit_of_measure: SMOKE_UOM_PCS,
                is_shop_consumable: false,
                invoice_name: "",
                invoice_url: "",
                delivered: false,
                created_at: "2025-04-05T10:00:00Z",
                updated_at: "2025-04-05T10:00:00Z",
              },
            ],
            count: 1,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    mockApi.post.mockImplementation((url: string) => {
      if (url === "/uploads/invoice/") {
        return Promise.resolve({ data: { url: "blob:test-invoice", name: "invoice.pdf" } });
      }
      return Promise.resolve({
        data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
      });
    });
    mockApi.patch.mockResolvedValue({ data: {} });
    mockApi.delete.mockResolvedValue({ data: {} });
  });

  it("renders the staff workspace for an authenticated user", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    expect(screen.getByText("Run the entire workshop from one board.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add New Repair" })).toBeInTheDocument();
    expect(screen.getByText("manager@test.local")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vehicles" }));
    expect((await screen.findAllByText("WB 1234K"))[0]).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Repairs" }));
    expect(await screen.findByRole("heading", { name: "Kanban Board", level: 2 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Purchases" }));
    expect(await screen.findByRole("heading", { name: "Purchases", level: 2 })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Users" })).toBeInTheDocument();
  });

  it("opens the repair form from the quick focus action", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Add New Repair" }));

    expect(await screen.findByRole("heading", { name: "Create Repair", level: 3 })).toBeInTheDocument();
  });

  it("restores the last active staff section after reload", async () => {
    window.localStorage.setItem("staff-active-section", "purchases");
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    expect(await screen.findByRole("heading", { name: "Purchases", level: 2 })).toBeInTheDocument();
  });

  it("recalculates dashboard moneyflow totals for the selected date range", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({
          data: [{ id: 1, full_name: "Alex Johnson", phone: "+48 555 100 200", email: "", notes: "", vehicle_count: 1 }],
        });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              customer: { id: 1, full_name: "Alex Johnson" },
              license_plate: "WB 1234K",
              make: "Toyota",
              model: "Corolla",
              year: 2018,
              vin: "",
              color: "White",
              notes: "",
              added_date: "2024-11-04",
            },
          ],
        });
      }
      if (url === "/services/") {
        return Promise.resolve({
          data: [
            { id: 1, name: "Oil Change", description: "", price: "190.00", is_active: true },
            { id: 2, name: "Brake Service", description: "", price: "420.00", is_active: true },
            { id: 3, name: "Diagnostics", description: "", price: "260.00", is_active: true },
          ],
        });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        const analytics = createStubDashboardAnalyticsResponse();
        analytics.moneyflow_range = { start_date: "2025-03-01", end_date: "2025-03-31" };
        analytics.operational_range = { start_date: "2025-03-01", end_date: "2025-03-31" };
        analytics.pdf = {
          latest_act_totals: {
            labor_total: 640,
            parts_client_total: 210,
            parts_purchase_total: 150,
            other_expenses_total: 0,
            document_total: 850,
            repairs_with_latest_act: 2,
          },
          coverage: { completed_in_range: 2, completed_without_pdf: 0 },
          exports_in_period: 0,
          completed_repairs_with_multiple_exports: 0,
          completed_to_first_export_lag_days: {
            average: 2,
            median: 2,
            p90: 2,
            sample_size: 2,
          },
          series_by_export_day: [],
        };
        analytics.operational = {
          funnel_by_status: { new: 0, in_progress: 0, waiting_parts: 0, completed: 0 },
          repairs_created_in_range: 0,
          cycle_time_days: { median: 4, p90: 10, sample_completed_in_range: 2 },
          active_workload_preview: [],
          recently_created_preview: [],
        };
        analytics.moneyflow = {
          supplier_spend_top: [
            {
              supplier_id: 1,
              supplier_name: "AutoParts Pro",
              total_spend: 120,
              line_count: 2,
            },
          ],
          purchases_unlinked: {
            count: 1,
            total_spend: 70,
          },
          exports_by_exporter: [
            {
              user_id: 7,
              email: "manager@test.local",
              display_name: "Test Manager",
              export_count: 2,
            },
          ],
          shop_consumables: { line_count: 0, buy_total: 0 },
        };
        analytics.warehouse = {
          snapshot_as_of: "2025-03-31T09:15:00Z",
          stock_totals: {
            delivered_quantity_total: 9,
            assigned_quantity_total: 4,
            free_quantity_total: 5,
            in_transit_quantity_total: 3,
          },
          valuations: {
            in_stock: { buy_total: 120, sale_total: 230, margin_total: 110 },
            in_transit: { buy_total: 80, sale_total: 120, margin_total: 40 },
            cumulative: { buy_total: 200, sale_total: 350, margin_total: 150 },
          },
          invoice_split: {
            with_invoice: { line_count: 2, quantity_total: 6, buy_total: 120 },
            without_invoice: { line_count: 1, quantity_total: 3, buy_total: 80 },
          },
          suppliers_top_current: [
            {
              supplier_id: 1,
              supplier_name: "AutoParts Pro",
              parts: [
                {
                  part_name: "Brake discs",
                  current_buy_total: 120,
                  in_stock_buy_total: 120,
                  in_transit_buy_total: 0,
                  current_quantity_total: 6,
                  in_stock_quantity_total: 6,
                  in_transit_quantity_total: 0,
                },
                {
                  part_name: "Wheel bolts",
                  current_buy_total: 80,
                  in_stock_buy_total: 0,
                  in_transit_buy_total: 80,
                  current_quantity_total: 3,
                  in_stock_quantity_total: 0,
                  in_transit_quantity_total: 3,
                },
              ],
              current_buy_total: 200,
              in_stock_buy_total: 120,
              in_transit_buy_total: 80,
              current_quantity_total: 9,
              in_stock_quantity_total: 6,
              in_transit_quantity_total: 3,
            },
          ],
        };
        return Promise.resolve({
          data: analytics,
        });
      }
      if (url === "/repairs/") {
        return Promise.resolve({
          data: [
            {
              id: 11,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "Oil Change",
              issue_notes: "Scheduled maintenance.",
              status: "completed",
              tracking_code: "TOR-1011",
              portal_token: "test-portal-token-1011",
              has_pdf: false,
              estimated_date: null,
              completed_at: "2025-02-05",
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-02-05T10:00:00Z",
              updated_at: "2025-02-05T10:00:00Z",
            },
            {
              id: 12,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "Oil Change",
              issue_notes: "March service one.",
              status: "completed",
              tracking_code: "TOR-1012",
              portal_token: "test-portal-token-1012",
              has_pdf: true,
              estimated_date: null,
              completed_at: "2025-03-05",
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-03-05T10:00:00Z",
              updated_at: "2025-03-05T10:00:00Z",
            },
            {
              id: 13,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "Brake Service",
              issue_notes: "March service two.",
              status: "completed",
              tracking_code: "TOR-1013",
              portal_token: "test-portal-token-1013",
              has_pdf: true,
              estimated_date: null,
              completed_at: "2025-03-20",
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-03-20T10:00:00Z",
              updated_at: "2025-03-20T10:00:00Z",
            },
            {
              id: 14,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "Diagnostics",
              issue_notes: "April service.",
              status: "in_progress",
              tracking_code: "TOR-1014",
              portal_token: "test-portal-token-1014",
              has_pdf: false,
              estimated_date: null,
              completed_at: null,
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-04-08T10:00:00Z",
              updated_at: "2025-04-08T10:00:00Z",
            },
            {
              id: 15,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: 7,
              master_name: "Chris Mason",
              service_name: "Brake Diagnostics",
              issue_notes: "March waiting for parts.",
              status: "waiting_parts",
              tracking_code: "TOR-1015",
              portal_token: "test-portal-token-1015",
              has_pdf: false,
              estimated_date: "2025-03-29",
              completed_at: null,
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-03-18T10:00:00Z",
              updated_at: "2025-03-22T10:00:00Z",
            },
          ],
        });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({
          data: {
            results: [
              {
                id: 21,
                order_date: "2025-02-10",
                approximate_delivery_date: null,
                supplier: { id: 1, name: "AutoParts Pro", nip: "", phone: "", email: "", notes: "" },
                vehicle_license_plate: "",
                part_name: "Oil Filter",
                quantity: 1,
                purchase_price: "90.00",
                sale_price: "120.00",
                repair_code: "TOR-1011",
                vehicle: null,
                unit_of_measure: SMOKE_UOM_PCS,
                is_shop_consumable: false,
                invoice_name: "",
                invoice_url: "",
                delivered: false,
                created_at: "2025-02-10T10:00:00Z",
                updated_at: "2025-02-10T10:00:00Z",
              },
              {
                id: 22,
                order_date: "2025-02-27",
                approximate_delivery_date: null,
                supplier: { id: 1, name: "AutoParts Pro", nip: "", phone: "", email: "", notes: "" },
                vehicle_license_plate: "",
                part_name: "Brake Fluid",
                quantity: 1,
                purchase_price: "100.00",
                sale_price: "150.00",
                repair_code: "TOR-1012",
                vehicle: null,
                unit_of_measure: SMOKE_UOM_PCS,
                is_shop_consumable: false,
                invoice_name: "",
                invoice_url: "",
                delivered: false,
                created_at: "2025-03-10T10:00:00Z",
                updated_at: "2025-03-10T10:00:00Z",
              },
              {
                id: 23,
                order_date: "2025-03-28",
                approximate_delivery_date: null,
                supplier: { id: 1, name: "AutoParts Pro", nip: "", phone: "", email: "", notes: "" },
                vehicle_license_plate: "",
                part_name: "Pads",
                quantity: 1,
                purchase_price: "50.00",
                sale_price: "80.00",
                repair_code: "TOR-1013",
                vehicle: null,
                unit_of_measure: SMOKE_UOM_PCS,
                is_shop_consumable: false,
                invoice_name: "",
                invoice_url: "",
                delivered: false,
                created_at: "2025-03-28T10:00:00Z",
                updated_at: "2025-03-28T10:00:00Z",
              },
              {
                id: 24,
                order_date: "2025-03-29",
                approximate_delivery_date: null,
                supplier: { id: 1, name: "AutoParts Pro", nip: "", phone: "", email: "", notes: "" },
                vehicle_license_plate: "",
                part_name: "Sensor",
                quantity: 1,
                purchase_price: "70.00",
                sale_price: "110.00",
                repair_code: "TOR-1014",
                vehicle: null,
                unit_of_measure: SMOKE_UOM_PCS,
                is_shop_consumable: false,
                invoice_name: "",
                invoice_url: "",
                delivered: false,
                created_at: "2025-03-29T10:00:00Z",
                updated_at: "2025-03-29T10:00:00Z",
              },
              {
                id: 25,
                order_date: "2025-04-15",
                approximate_delivery_date: null,
                supplier: { id: 1, name: "AutoParts Pro", nip: "", phone: "", email: "", notes: "" },
                vehicle_license_plate: "",
                part_name: "Sensor",
                quantity: 1,
                purchase_price: "200.00",
                sale_price: "260.00",
                repair_code: "TOR-1014",
                vehicle: null,
                unit_of_measure: SMOKE_UOM_PCS,
                is_shop_consumable: false,
                invoice_name: "",
                invoice_url: "",
                delivered: false,
                created_at: "2025-04-15T10:00:00Z",
                updated_at: "2025-04-15T10:00:00Z",
              },
            ],
            count: 5,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Operations Dashboard")).toBeInTheDocument());
    await pickDashboardDateRange(user, "2025-03-01", "2025-03-31");

    const salesPlan = screen.getByRole("region", { name: "Sales Plan" });
    const actsFact = screen.getByRole("region", { name: "Acts Coverage" });

    expect(screen.queryByRole("heading", { name: "Parts Results", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Live estimate vs latest act", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Exports by staff", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Flow Timeline", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Repair Calendar", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Money Summary", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Live vs Act Delta", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Money Risks / Alerts", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Financial Trend", level: 3 })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(within(salesPlan).getAllByText(/610,00\s*zł/).length).toBeGreaterThan(0);
      expect(within(salesPlan).getAllByText(/230,00\s*zł/).length).toBeGreaterThan(0);
      expect(within(salesPlan).getAllByText(/840,00\s*zł/).length).toBeGreaterThan(0);
      expect(within(salesPlan).getByText("Δ +30,00 zł")).toBeInTheDocument();
      expect(within(salesPlan).getByText("Δ -20,00 zł")).toBeInTheDocument();
      expect(within(salesPlan).getByText("Δ +10,00 zł")).toBeInTheDocument();
      expect(within(actsFact).getByText("Coverage status")).toBeInTheDocument();
      expect(within(actsFact).getByText("Fully covered")).toBeInTheDocument();
      expect(within(actsFact).getByText("100%")).toBeInTheDocument();
      expect(within(actsFact).getByText("2 of 2 completed repairs have an act.")).toBeInTheDocument();
      expect(within(actsFact).getByText("2 d")).toBeInTheDocument();
      expect(within(actsFact).queryByText("Labor (acts)")).not.toBeInTheDocument();
      expect(within(actsFact).queryByText("Parts to client (acts)")).not.toBeInTheDocument();
      expect(within(actsFact).queryByText("Document total (acts)")).not.toBeInTheDocument();
      expect(within(actsFact).getByText("Missing acts")).toBeInTheDocument();
      expect(within(actsFact).getByText("Median time to first act")).toBeInTheDocument();
      expect(within(actsFact).getByText("Re-exported repairs")).toBeInTheDocument();
      expect(within(actsFact).getByText("Act exports in period")).toBeInTheDocument();
      expect(within(actsFact).queryByText("Act exports in period:")).not.toBeInTheDocument();
    });

    await user.click(within(salesPlan).getByRole("button", { name: "More info about Service sales (live)" }));
    expect(await screen.findByRole("dialog", { name: "Service sales (live) details" })).toBeInTheDocument();
    expect(screen.getByText("This card estimates service revenue from the current service catalog for repairs completed in the selected period.")).toBeInTheDocument();
    expect(screen.getByText("Sum current catalog prices for services attached to repairs completed inside the selected date range.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close info about Service sales (live)" }));

    await user.click(screen.getByRole("tab", { name: "Warehouse" }));

    const warehouseParts = await screen.findByRole("heading", { name: "Current Stock Position", level: 3 });
    const warehouseSection = warehouseParts.closest("section");
    const supplierBreakdownCopy = screen.getByText(
      "Full current supplier portfolio with supplier totals and part-level stock/transit breakdown."
    );
    const supplierBreakdownSection = supplierBreakdownCopy.closest("section");

    expect(warehouseSection).not.toBeNull();
    expect(supplierBreakdownSection).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Invoice Coverage", level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Exports by staff", level: 3 })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(within(warehouseSection as HTMLElement).getByText("9")).toBeInTheDocument();
      expect(within(warehouseSection as HTMLElement).getByText("4")).toBeInTheDocument();
      expect(within(warehouseSection as HTMLElement).getByText("5")).toBeInTheDocument();
      expect(within(warehouseSection as HTMLElement).getByText("3")).toBeInTheDocument();
      expect(within(warehouseSection as HTMLElement).getAllByText(/120,00\s*zł/).length).toBeGreaterThan(0);
      expect(within(warehouseSection as HTMLElement).getByText(/230,00\s*zł/)).toBeInTheDocument();
      expect(within(warehouseSection as HTMLElement).getByText(/110,00\s*zł/)).toBeInTheDocument();
      expect(within(warehouseSection as HTMLElement).getByText(/200,00\s*zł/)).toBeInTheDocument();
      expect(within(warehouseSection as HTMLElement).getByText(/350,00\s*zł/)).toBeInTheDocument();
      expect(within(warehouseSection as HTMLElement).getByText(/150,00\s*zł/)).toBeInTheDocument();
      expect(within(supplierBreakdownSection as HTMLElement).getByText("Brake discs")).toBeInTheDocument();
      expect(within(supplierBreakdownSection as HTMLElement).getByText("Wheel bolts")).toBeInTheDocument();
      expect(within(supplierBreakdownSection as HTMLElement).getAllByText("6 pcs").length).toBeGreaterThan(0);
      expect(within(supplierBreakdownSection as HTMLElement).getAllByText("3 pcs").length).toBeGreaterThan(0);
      expect(within(supplierBreakdownSection as HTMLElement).getAllByText("9 pcs").length).toBeGreaterThan(0);
    });

    await user.click(within(warehouseSection as HTMLElement).getByRole("button", { name: "More info about In stock value" }));
    expect(await screen.findByRole("dialog", { name: "In stock value details" })).toBeInTheDocument();
    expect(screen.getByText("This card values the currently delivered portfolio using purchase cost, resale value, and implied margin.")).toBeInTheDocument();
    expect(screen.getByText("Buy = sum purchase totals on delivered lines; Sale = sum resale totals on delivered lines; Margin = Sale - Buy.")).toBeInTheDocument();
  });

  it("resets moneyflow to the last 30 days on every dashboard visit", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Operations Dashboard")).toBeInTheDocument());

    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);

    const rangeInput = await screen.findByLabelText("Date range");

    expect(rangeInput).toHaveValue(`${formatExpectedDateInput(startDate)} - ${formatExpectedDateInput(endDate)}`);

    await pickDashboardDateRange(user, "2025-01-01", "2025-01-31");

    expect(rangeInput).toHaveValue("01-01-2025 - 31-01-2025");

    await user.click(screen.getByRole("button", { name: "Purchases" }));
    expect(await screen.findByRole("heading", { name: "Purchases", level: 2 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Date range")).toHaveValue(
        `${formatExpectedDateInput(startDate)} - ${formatExpectedDateInput(endDate)}`
      );
    });
  });

  it("renders service board sections and shows masters in the moneyflow tab", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        const analytics = createStubDashboardAnalyticsResponse();
        analytics.service_board = {
          range_summary: {
            open_repairs_end_of_range: 5,
            vehicles_in_range: 4,
            customers_in_range: 3,
            returning_customers_in_range: 2,
            non_returning_customers_in_range: 1,
            returning_ratio: 2 / 3,
            median_cycle_time_days: 6,
            completed_repairs_in_range: 7,
          },
          current_snapshot: {
            waiting_parts_current: 2,
            open_repairs_current: 4,
          },
          all_time_totals: {
            repairs_total: 18,
            vehicles_total: 11,
            customers_total: 9,
            returning_customers_total: 4,
            non_returning_customers_total: 5,
            masters_total: 3,
          },
          masters_current: [
            {
              master_id: 10,
              display_name: "Chris North",
              assigned_open_current: 3,
              current_status_counts: {
                new: 1,
                in_progress: 1,
                waiting_parts: 1,
              },
              waiting_parts_current: 1,
              estimated_assigned_value_current: 950,
            },
          ],
          masters_range: [
            {
              master_id: 10,
              display_name: "Chris North",
              completed_in_range: 4,
              median_cycle_time_days: 5,
              actual_service_value_completed: 1800,
            },
          ],
        };
        return Promise.resolve({ data: analytics });
      }
      if (url === "/repairs/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/vehicles/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/customers/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/services/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/auth/users/") {
        return Promise.resolve({ data: [] });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Operations Dashboard")).toBeInTheDocument());
    const moneyflowTab = screen.getByRole("tab", { name: "MoneyFlow" });
    const mastersSection = await screen.findByRole("region", { name: "Masters" });

    expect(screen.getByRole("heading", { name: "Current load and performance", level: 3 })).toBeInTheDocument();
    await waitFor(() => {
      expect(within(mastersSection).getByText("3 masters in the workshop roster.")).toBeInTheDocument();
      expect(within(mastersSection).getByText("New")).toBeInTheDocument();
      expect(within(mastersSection).getByText("In progress")).toBeInTheDocument();
      expect(within(mastersSection).getAllByText("Waiting parts").length).toBeGreaterThan(0);
      expect(within(mastersSection).getByText(/1800,00\s*zł/)).toBeInTheDocument();
      expect(within(mastersSection).getAllByText("Chris North")).toHaveLength(2);
      expect(within(mastersSection).queryByText(/950,00\s*zł/)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "ServiceBoard" }));
    const selectedRange = await screen.findByRole("region", { name: "Selected range" });
    const allTimeSection = screen.getByRole("region", { name: "All-time totals" });

    expect(screen.getByRole("heading", { name: "Service Board KPIs", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Registry baseline", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Repair flow", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vehicles and clients", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Workshop objects", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Loyalty split", level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Live operations", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Active workload", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recently created", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Master Workload", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByText("Cycle p90")).not.toBeInTheDocument();
    expect(screen.queryByText("Created in range")).not.toBeInTheDocument();
    expect(screen.queryByText("Returning / non-returning")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Current load and performance", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Masters" })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(within(selectedRange).getByText("5")).toBeInTheDocument();
      expect(within(selectedRange).getByText("2")).toBeInTheDocument();
      expect(within(selectedRange).getByText("4")).toBeInTheDocument();
      expect(within(selectedRange).getByText("3")).toBeInTheDocument();
      expect(within(selectedRange).getAllByText("6 d").length).toBeGreaterThan(0);
      expect(within(selectedRange).getByText("7")).toBeInTheDocument();
      expect(within(allTimeSection).getByText("18")).toBeInTheDocument();
      expect(within(allTimeSection).getByText("11")).toBeInTheDocument();
      expect(within(allTimeSection).getByText("9")).toBeInTheDocument();
      expect(within(allTimeSection).getByText("4")).toBeInTheDocument();
      expect(within(allTimeSection).getByText("5")).toBeInTheDocument();
    });

    await user.click(within(selectedRange).getByRole("button", { name: "More info about Open repairs" }));
    expect(await screen.findByRole("dialog", { name: "Open repairs details" })).toBeInTheDocument();
    expect(screen.getByText("This card shows backlog at the end of the selected Service Board range.")).toBeInTheDocument();
    expect(screen.getByText("Count repairs that were still not completed on the selected range end date.")).toBeInTheDocument();

    await user.click(moneyflowTab);
    expect(await screen.findByRole("region", { name: "Masters" })).toBeInTheDocument();
  });

  it("shows a partial act coverage state when completed repairs still miss acts", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        const analytics = createStubDashboardAnalyticsResponse();
        analytics.pdf.latest_act_totals.repairs_with_latest_act = 1;
        analytics.pdf.coverage.completed_in_range = 4;
        analytics.pdf.coverage.completed_without_pdf = 3;
        analytics.pdf.exports_in_period = 5;
        analytics.pdf.completed_repairs_with_multiple_exports = 1;
        return Promise.resolve({ data: analytics });
      }
      if (url === "/repairs/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/vehicles/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/customers/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/services/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/suppliers/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/users/") {
        return Promise.resolve({ data: [] });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      return Promise.resolve({ data: [] });
    });

    renderApp("/app");

    const section = await screen.findByRole("region", { name: "Acts Coverage" });

    await waitFor(() => {
      expect(within(section).getByText("Partial coverage")).toBeInTheDocument();
      expect(within(section).getByText("25%")).toBeInTheDocument();
      expect(within(section).getByText("1 of 4 completed repairs have an act.")).toBeInTheDocument();
      expect(within(section).getByText("3 completed repairs are still waiting for their first act.")).toBeInTheDocument();
      expect(within(section).getByText("Missing acts")).toBeInTheDocument();
      expect(within(section).getByText("3")).toBeInTheDocument();
      expect(within(section).getByText("Median time to first act")).toBeInTheDocument();
      expect(within(section).getByText("—")).toBeInTheDocument();
      expect(within(section).getByText("No completed repairs with an exported act yet.")).toBeInTheDocument();
      expect(within(section).getByText("Re-exported repairs")).toBeInTheDocument();
      expect(within(section).getByText("Act exports in period")).toBeInTheDocument();
      expect(within(section).getByText("1")).toBeInTheDocument();
      expect(within(section).queryByText("Act exports in period:")).not.toBeInTheDocument();
    });
  });

  it("shows a neutral empty state when the selected period has no completed repairs", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      if (url === "/repairs/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/vehicles/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/customers/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/services/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/suppliers/") {
        return Promise.resolve({ data: [] });
      }
      if (url === "/users/") {
        return Promise.resolve({ data: [] });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      return Promise.resolve({ data: [] });
    });

    renderApp("/app");

    const section = await screen.findByRole("region", { name: "Acts Coverage" });

    await waitFor(() => {
      expect(within(section).getByText("No completed repairs")).toBeInTheDocument();
      expect(within(section).getByText("No completed repairs in this period.")).toBeInTheDocument();
      expect(within(section).getByText("Pick a date range with completed work to review act coverage.")).toBeInTheDocument();
      expect(within(section).queryByText("0 / 0")).not.toBeInTheDocument();
    });
  });

  it("temporarily hides the repair calendar on moneyflow", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Operations Dashboard")).toBeInTheDocument());
    await pickDashboardDateRange(user, "2025-04-01", "2025-04-30");

    expect(await screen.findByRole("region", { name: "Sales Plan" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Acts Coverage" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Repair Calendar", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Flow Timeline", level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "MoneyFlow financial trend chart" })).not.toBeInTheDocument();
    expect(screen.queryByText("Turn on at least one line to display the chart.")).not.toBeInTheDocument();
  });

  it("opens detail dialogs for customer and vehicle cards", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Vehicles" }));
    await user.click((await screen.findAllByText("WB 1234K"))[0]);
    expect(await screen.findByRole("button", { name: "Edit Vehicle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Vehicle" })).toBeInTheDocument();
    // Desktop + mobile vehicle panels both render the same meta (two matching nodes).
    expect(screen.getAllByText("Date Added: 04-11-2024").length).toBeGreaterThanOrEqual(1);
    // Vehicle modal: repair title may appear once (e.g. mobile list) or again on History tab (table); not duplicated as former desktop cards + list.
    expect(screen.getAllByText("Brake Inspection").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the ordered parts linked to the selected repair", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    expect((await screen.findAllByText("1 linked part")).length).toBeGreaterThan(0);

    await openRepairKanbanCardByTrackingCode(user, "TOR-1011");

    const repairDialog = await screen.findByRole("dialog", { name: SMOKE_DEFAULT_REPAIR_DIALOG_NAME });
    expect(within(repairDialog).getByText("Linked Parts")).toBeInTheDocument();
    expect(within(repairDialog).getByText("Brake Pad Set")).toBeInTheDocument();
    expect(within(repairDialog).getByText("AutoParts Pro")).toBeInTheDocument();
    expect(within(repairDialog).getByText("Ordered 05-04-2025")).toBeInTheDocument();
  });

  it("allows editing the completed date for completed repairs", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({
          data: [{ id: 1, full_name: "Alex Johnson", phone: "+48 555 100 200", email: "", notes: "", vehicle_count: 1 }],
        });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              customer: { id: 1, full_name: "Alex Johnson" },
              license_plate: "WB 1234K",
              make: "Toyota",
              model: "Corolla",
              year: 2018,
              vin: "",
              color: "White",
              notes: "",
              added_date: "2024-11-04",
            },
          ],
        });
      }
      if (url === "/repairs/") {
        return Promise.resolve({
          data: [
            {
              id: 15,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "Wheel Alignment",
              issue_notes: "Steering wheel is slightly off-centre.",
              status: "completed",
              mileage_at_service: 128450,
              tracking_code: "TOR-1015",
              completed_at: "2025-03-08",
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-03-06T10:00:00Z",
              updated_at: "2025-03-08T10:00:00Z",
            },
          ],
        });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      return Promise.resolve({ data: [] });
    });
    mockApi.patch.mockImplementation((url: string, data?: Record<string, unknown>) => {
      if (url === "/repairs/15") {
        return Promise.resolve({
          data: {
            id: 15,
            vehicle_id: 1,
            vehicle_label: "WB 1234K • Toyota Corolla",
            owner_name: "Alex Johnson",
            master_id: null,
            master_name: "",
            service_name: "Wheel Alignment",
            issue_notes: "Steering wheel is slightly off-centre.",
            status: data?.status ?? "completed",
            mileage_at_service: data?.mileage_at_service ?? 128450,
            tracking_code: "TOR-1015",
            completed_at: data?.completed_at ?? "2025-03-08",
            repair_notes: [],
            before_photos: [],
            during_photos: [],
            after_photos: [],
            created_at: "2025-03-06T10:00:00Z",
            updated_at: "2025-03-08T10:00:00Z",
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await openRepairKanbanCardByTrackingCode(user, "TOR-1015");

    const repairDialog = await screen.findByRole("dialog", { name: SMOKE_DEFAULT_REPAIR_DIALOG_NAME });
    const completedDateInput = within(repairDialog).getByDisplayValue("08-03-2025");

    await user.clear(completedDateInput);
    await user.type(completedDateInput, "10-03-2025");
    await user.tab();
    await user.click(within(repairDialog).getByRole("button", { name: "Save Repair Update" }));

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/repairs/15",
        expect.objectContaining({
          status: "completed",
          completed_at: "2025-03-10",
        })
      );
    });
  });

  it("prefills the added date when creating a new vehicle", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Vehicles" }));
    await user.click(await screen.findByRole("button", { name: "+ Add Vehicle" }));

    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const [year, month, day] = today.split("-");
    const expectedDate = `${day}-${month}-${year}`;
    expect(await screen.findByDisplayValue(expectedDate)).toBeInTheDocument();
  });

  it("allows attaching, opening and removing an invoice from purchase details", async () => {
    const user = userEvent.setup();
    const view = renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Purchases" }));
    expect(screen.queryByText("TOR-2040")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /Brake Pad Set/i }));
    const purchaseDialog = await screen.findByRole("dialog");
    expect(screen.queryByLabelText("Tracking")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Repair Code")).not.toBeInTheDocument();
    expect(screen.queryByText("TOR-2040")).not.toBeInTheDocument();
    expect(screen.queryByText("Supplier Document")).not.toBeInTheDocument();

    await user.click(within(purchaseDialog).getByRole("tab", { name: "Invoice" }));
    expect(await within(purchaseDialog).findByText("No invoice attached yet")).toBeInTheDocument();
    expect(within(purchaseDialog).getByText("Add Invoice")).toBeInTheDocument();

    const invoiceInput = view.container.querySelector("#purchase-modal-invoice-input");
    expect(invoiceInput).not.toBeNull();

    const invoiceFile = new File(["invoice"], "invoice.pdf", { type: "application/pdf" });
    await user.upload(invoiceInput as HTMLInputElement, invoiceFile);

    expect(await within(purchaseDialog).findByText("invoice.pdf")).toBeInTheDocument();
    expect(within(purchaseDialog).getByText("Attached")).toBeInTheDocument();
    expect(within(purchaseDialog).getByText("Replace Invoice")).toBeInTheDocument();
    expect(within(purchaseDialog).getByText("Delete Invoice")).toBeInTheDocument();
    expect(within(purchaseDialog).queryByText("Open Invoice")).not.toBeInTheDocument();

    await user.click(within(purchaseDialog).getByRole("button", { name: "invoice.pdf" }));
    expect(mockOpen).toHaveBeenCalledWith("blob:test-invoice", "_blank", "noopener,noreferrer");

    await user.click(within(purchaseDialog).getByRole("button", { name: "Delete Invoice" }));
    expect(mockConfirm).toHaveBeenCalledWith("Remove the attached invoice from this purchase?");
    expect(await within(purchaseDialog).findByText("No invoice attached yet")).toBeInTheDocument();
    expect(within(purchaseDialog).getByText("Empty")).toBeInTheDocument();
  });

  it("keeps purchase linkage to the selected repair even without manual vehicle selection", async () => {
    const user = userEvent.setup();
    mockApi.post.mockImplementation((url: string, data?: Record<string, unknown>) => {
      if (url === "/uploads/invoice/") {
        return Promise.resolve({ data: { url: "blob:test-invoice", name: "invoice.pdf" } });
      }
      if (url === "/purchases/bulk/") {
        const line = (data?.lines as Array<Record<string, unknown>> | undefined)?.[0];
        return Promise.resolve({
          data: [
            {
              id: 99,
              order_date: data?.order_date,
              approximate_delivery_date: null,
              supplier: { id: 1, name: data?.supplier_name, nip: "", phone: "", email: "", notes: "" },
              part_name: line?.part_name,
              quantity: line?.quantity,
              purchase_price: String(line?.purchase_price),
              sale_price: String(line?.sale_price ?? 0),
              repair_code: line?.repair_code,
              vehicle: line?.vehicle_id,
              vehicle_license_plate: "WB 1234K",
              unit_of_measure: SMOKE_UOM_PCS,
              is_shop_consumable: false,
              invoice_name: "",
              invoice_url: "",
              delivered: false,
              created_at: "2025-04-05T10:00:00Z",
              updated_at: "2025-04-05T10:00:00Z",
            },
          ],
        });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({
          data: {
            id: 99,
            order_date: data?.order_date,
            approximate_delivery_date: null,
            supplier: { id: 1, name: data?.supplier_name, nip: "", phone: "", email: "", notes: "" },
            part_name: data?.part_name,
            quantity: data?.quantity,
            purchase_price: String(data?.purchase_price),
            sale_price: String(data?.sale_price ?? 0),
            repair_code: data?.repair_code,
            vehicle: data?.vehicle_id,
            vehicle_license_plate: "WB 1234K",
            unit_of_measure: SMOKE_UOM_PCS,
            is_shop_consumable: false,
            invoice_name: "",
            invoice_url: "",
            delivered: false,
            created_at: "2025-04-05T10:00:00Z",
            updated_at: "2025-04-05T10:00:00Z",
          },
        });
      }
      return Promise.resolve({
        data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
      });
    });
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Purchases" }));
    await user.click(await screen.findByRole("button", { name: "+ Add part line" }));

    await user.clear(screen.getByLabelText("Order Date"));
    await user.type(screen.getByLabelText("Order Date"), "05-04-2025");
    await user.tab();
    await user.type(screen.getByLabelText("Supplier"), "AutoParts Pro");
    await user.type(screen.getByLabelText("Part"), "Brake Sensor");
    await user.type(screen.getByLabelText("Purchase Price"), "85");
    await user.selectOptions(
      screen.getByLabelText("Linked Repair"),
      "TOR-1011"
    );

    expect(screen.getByLabelText("Vehicle")).toHaveValue("1");

    await user.click(screen.getByRole("button", { name: "Save line" }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        "/purchases/bulk/",
        expect.objectContaining({
          order_date: "2025-04-05",
          supplier_name: "AutoParts Pro",
          lines: expect.arrayContaining([
            expect.objectContaining({
              part_name: "Brake Sensor",
              repair_code: "TOR-1011",
              vehicle_id: 1,
            }),
          ]),
        })
      );
    });
  });

  it("lets staff explicitly unlink a purchase from repair before saving", async () => {
    const user = userEvent.setup();
    mockApi.post.mockImplementation((url: string, data?: Record<string, unknown>) => {
      if (url === "/purchases/bulk/") {
        const line = (data?.lines as Array<Record<string, unknown>> | undefined)?.[0];
        return Promise.resolve({
          data: [
            {
              id: 100,
              order_date: data?.order_date,
              approximate_delivery_date: null,
              supplier: { id: 1, name: data?.supplier_name, nip: "", phone: "", email: "", notes: "" },
              part_name: line?.part_name,
              quantity: line?.quantity,
              purchase_price: String(line?.purchase_price),
              sale_price: String(line?.sale_price ?? 0),
              repair_code: typeof line?.repair_code === "string" ? line.repair_code : "",
              vehicle: typeof line?.vehicle_id === "number" ? line.vehicle_id : null,
              vehicle_license_plate: typeof line?.vehicle_id === "number" ? "WB 1234K" : "",
              unit_of_measure: SMOKE_UOM_PCS,
              is_shop_consumable: false,
              invoice_name: "",
              invoice_url: "",
              delivered: false,
              created_at: "2025-04-05T10:00:00Z",
              updated_at: "2025-04-05T10:00:00Z",
            },
          ],
        });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({
          data: {
            id: 100,
            order_date: data?.order_date,
            approximate_delivery_date: null,
            supplier: { id: 1, name: data?.supplier_name, nip: "", phone: "", email: "", notes: "" },
            part_name: data?.part_name,
            quantity: data?.quantity,
            purchase_price: String(data?.purchase_price),
            sale_price: String(data?.sale_price ?? 0),
            repair_code: typeof data?.repair_code === "string" ? data.repair_code : "",
            vehicle: typeof data?.vehicle_id === "number" ? data.vehicle_id : null,
            vehicle_license_plate: typeof data?.vehicle_id === "number" ? "WB 1234K" : "",
            unit_of_measure: SMOKE_UOM_PCS,
            is_shop_consumable: false,
            invoice_name: "",
            invoice_url: "",
            delivered: false,
            created_at: "2025-04-05T10:00:00Z",
            updated_at: "2025-04-05T10:00:00Z",
          },
        });
      }
      return Promise.resolve({
        data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
      });
    });

    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Purchases" }));
    await user.click(await screen.findByRole("button", { name: "+ Add part line" }));

    expect(screen.getByRole("option", { name: "No repair linked" })).toBeInTheDocument();
    expect(
      screen.getByText(/Leave vehicle and repair empty on a line for stock or parts not tied to a job yet/)
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Order Date"));
    await user.type(screen.getByLabelText("Order Date"), "05-04-2025");
    await user.tab();
    await user.type(screen.getByLabelText("Supplier"), "AutoParts Pro");
    await user.type(screen.getByLabelText("Part"), "Brake Sensor");
    await user.type(screen.getByLabelText("Purchase Price"), "85");
    await user.selectOptions(screen.getByLabelText("Linked Repair"), "TOR-1011");

    expect(screen.getByLabelText("Vehicle")).toHaveValue("1");
    expect(screen.getByRole("button", { name: "Unlink repair" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unlink repair" }));
    expect(screen.getByLabelText("Linked Repair")).toHaveValue("");
    expect(screen.getByLabelText("Vehicle")).toHaveValue("1");

    await user.click(screen.getByRole("button", { name: "Save line" }));

    await waitFor(() => {
      const purchaseCall = mockApi.post.mock.calls.find(([u]) => u === "/purchases/bulk/");
      expect(purchaseCall).toBeTruthy();
      const payload = purchaseCall?.[1] as Record<string, unknown>;
      expect(payload).toMatchObject({
        order_date: "2025-04-05",
        supplier_name: "AutoParts Pro",
      });
      const lines = payload.lines as Array<Record<string, unknown>>;
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ part_name: "Brake Sensor", vehicle_id: 1 });
      expect(lines[0]).not.toHaveProperty("repair_code");
    });
  });

  it("removes repair linkage when editing an existing purchase", async () => {
    const user = userEvent.setup();
    mockApi.patch.mockImplementation((url: string, data?: Record<string, unknown>) => {
      if (url === "/purchases/2") {
        return Promise.resolve({
          data: {
            id: 2,
            order_date: data?.order_date,
            approximate_delivery_date: null,
            supplier: { id: 1, name: data?.supplier_name, nip: "", phone: "", email: "", notes: "" },
            part_name: data?.part_name,
            quantity: data?.quantity,
            purchase_price: String(data?.purchase_price),
            sale_price: String(data?.sale_price ?? 0),
            repair_code: typeof data?.repair_code === "string" ? data.repair_code : "TOR-1011",
            vehicle: typeof data?.vehicle_id === "number" ? data.vehicle_id : null,
            vehicle_license_plate: typeof data?.vehicle_id === "number" ? "WB 1234K" : "",
            unit_of_measure: SMOKE_UOM_PCS,
            is_shop_consumable: false,
            invoice_name: "",
            invoice_url: "",
            delivered: Boolean(data?.delivered),
            created_at: "2025-04-05T10:00:00Z",
            updated_at: "2025-04-05T10:05:00Z",
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Purchases" }));
    await user.click(await screen.findByText("Brake Pad Set"));

    const purchaseDialog = await screen.findByRole("dialog");
    expect(within(purchaseDialog).getByLabelText("Linked Repair")).toHaveValue("TOR-1011");

    await user.click(within(purchaseDialog).getByRole("button", { name: "Unlink repair" }));
    expect(within(purchaseDialog).getByLabelText("Linked Repair")).toHaveValue("");

    await user.click(within(purchaseDialog).getByRole("button", { name: "Save Purchase" }));

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/purchases/2",
        expect.objectContaining({
          repair_code: "",
          vehicle_id: null,
        })
      );
    });
  });

  it("tracks consumable inventory snapshots and moves zero stock rows into out-of-stock", async () => {
    const user = userEvent.setup();
    const consumableSupplier = { id: 7, name: "Chem Co", nip: "", phone: "", email: "", notes: "" };
    const consumables = [
      {
        id: 31,
        order_date: "2025-04-10",
        approximate_delivery_date: null,
        supplier: consumableSupplier,
        vehicle_license_plate: "",
        part_name: "Gloves",
        quantity: 6,
        current_stock_quantity: null,
        inventory_checked_on: null,
        purchase_price: "3.50",
        sale_price: "0.00",
        repair_code: "",
        vehicle: null,
        unit_of_measure: SMOKE_UOM_PCS,
        is_shop_consumable: true,
        invoice_name: "",
        invoice_url: "",
        delivered: true,
        created_at: "2025-04-10T10:00:00Z",
        updated_at: "2025-04-10T10:00:00Z",
      },
      {
        id: 32,
        order_date: "2025-04-09",
        approximate_delivery_date: null,
        supplier: consumableSupplier,
        vehicle_license_plate: "",
        part_name: "Degreaser",
        quantity: 3,
        current_stock_quantity: "0.00",
        inventory_checked_on: "2025-04-11",
        purchase_price: "9.00",
        sale_price: "0.00",
        repair_code: "",
        vehicle: null,
        unit_of_measure: SMOKE_UOM_PCS,
        is_shop_consumable: true,
        invoice_name: "",
        invoice_url: "",
        delivered: true,
        created_at: "2025-04-09T10:00:00Z",
        updated_at: "2025-04-11T10:00:00Z",
      },
      {
        id: 33,
        order_date: "2025-04-08",
        approximate_delivery_date: null,
        supplier: consumableSupplier,
        vehicle_license_plate: "",
        part_name: "Cleaner",
        quantity: 5,
        current_stock_quantity: "2.00",
        inventory_checked_on: "2025-04-10",
        purchase_price: "12.00",
        sale_price: "0.00",
        repair_code: "",
        vehicle: null,
        unit_of_measure: SMOKE_UOM_PCS,
        is_shop_consumable: true,
        invoice_name: "",
        invoice_url: "",
        delivered: true,
        created_at: "2025-04-08T10:00:00Z",
        updated_at: "2025-04-10T10:00:00Z",
      },
    ];

    mockApi.get.mockImplementation((url: string, config?: { params?: Record<string, string> }) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/customers/") || url.startsWith("/vehicles/") || url === "/repairs/" || url === "/services/" || url === "/auth/staff/") {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      if (isPurchasesIndexGet(url)) {
        if (config?.params?.shop_consumable === "true") {
          return Promise.resolve({
            data: {
              results: consumables,
              count: consumables.length,
              next: null,
              previous: null,
            },
          });
        }
        return Promise.resolve({ data: { results: [], count: 0, next: null, previous: null } });
      }
      return Promise.resolve({ data: [] });
    });

    mockApi.patch.mockImplementation((url: string, data?: Record<string, unknown>) => {
      if (url.startsWith("/purchases/")) {
        const id = Number(url.split("/").pop());
        const current = consumables.find((item) => item.id === id);
        if (!current) {
          return Promise.resolve({ data: {} });
        }
        current.current_stock_quantity =
          data?.current_stock_quantity == null ? null : Number(data.current_stock_quantity).toFixed(2);
        current.inventory_checked_on =
          typeof data?.inventory_checked_on === "string" && data.inventory_checked_on
            ? data.inventory_checked_on
            : null;
        current.updated_at = "2025-04-12T10:05:00Z";
        return Promise.resolve({ data: { ...current } });
      }
      return Promise.resolve({ data: {} });
    });

    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Purchases" }));
    await user.click(screen.getByRole("tab", { name: "Consumables" }));

    expect(await screen.findByRole("columnheader", { name: "Bought" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Inventory date" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "On hand" })).toBeInTheDocument();
    expect(screen.getByText("Not inventoried")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Out of stock (1)" })).toBeInTheDocument();
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    expect(screen.getByLabelText("Inventory date Gloves")).toHaveValue(today);
    await user.type(screen.getByLabelText("On hand Gloves"), "4");
    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/purchases/31",
        expect.objectContaining({
          current_stock_quantity: 4,
          inventory_checked_on: today,
        })
      );
    });
    expect(screen.getByDisplayValue(today)).toBeInTheDocument();
    expect(screen.getByDisplayValue("4")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("On hand Cleaner"));
    await user.type(screen.getByLabelText("On hand Cleaner"), "0");
    await user.click(screen.getAllByRole("button", { name: "Save" })[1]);

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith(
        "/purchases/33",
        expect.objectContaining({
          current_stock_quantity: 0,
          inventory_checked_on: "2025-04-10",
        })
      );
    });
    expect(screen.queryByText("Cleaner")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Out of stock (2)" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show Out of stock (2)" }));
    expect(await screen.findByText("Cleaner")).toBeInTheDocument();
  });

  it("renders a public client portal route", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/portal/ABC-123/") {
        return Promise.resolve({
          data: {
            tracking_code: "TOR-0001",
            service_name: "Brake Inspection",
            status: "in_progress",
            status_display: "In Progress",
            vehicle_info: { label: "Toyota Corolla", year: 2020, license_plate: "WA 12345" },
            estimated_date: null,
            mileage_at_service: null,
            completed_at: null,
            created_at: "2025-01-01T10:00:00Z",
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderApp("/portal/ABC-123");

    expect(await screen.findByText("Repair Status")).toBeInTheDocument();
    expect(screen.getByText("Brake Inspection")).toBeInTheDocument();
  });

  it("allows staff login from the login page", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.reject(new Error("unauthorized"));
      }
      if (url === "/customers/" || url === "/vehicles/") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderApp("/login");

    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");

    await user.clear(emailInput);
    await user.type(emailInput, "manager@test.local");
    await user.clear(passwordInput);
    await user.type(passwordInput, "manager12345");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith("/auth/login", {
        email: "manager@test.local",
        password: "manager12345",
      });
    });
  });

  it("shows date filter chips on the Repairs kanban board", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await screen.findByRole("heading", { name: "Kanban Board", level: 2 });

    expect(screen.getByRole("button", { name: "7 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90 days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All time" })).toBeInTheDocument();
  });

  it("filters repairs by date when a date chip is clicked", async () => {
    const recentDate = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const oldDate = new Date(Date.now() - 60 * 86_400_000).toISOString();

    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({ data: [] });
      }
      if (url === "/repairs/") {
        return Promise.resolve({
          data: [
            {
              id: 201,
              vehicle_id: 1,
              vehicle_label: "WB XXXX • Make Model",
              owner_name: "Name",
              master_id: null,
              master_name: "",
              service_name: "Recent Oil Change",
              issue_notes: "",
              status: "new",
              tracking_code: "TOR-0201",
              portal_token: "test-portal-token-0201",
              estimated_date: null,
              completed_at: null,
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: recentDate,
              updated_at: recentDate,
            },
            {
              id: 202,
              vehicle_id: 1,
              vehicle_label: "WB XXXX • Make Model",
              owner_name: "Name",
              master_id: null,
              master_name: "",
              service_name: "Old Brake Job",
              issue_notes: "",
              status: "new",
              tracking_code: "TOR-0202",
              portal_token: "test-portal-token-0202",
              estimated_date: null,
              completed_at: null,
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: oldDate,
              updated_at: oldDate,
            },
          ],
        });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await screen.findByRole("heading", { name: "Kanban Board", level: 2 });

    expect((await screen.findAllByText("Recent Oil Change")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Old Brake Job").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "7 days" }));

    expect(screen.getAllByText("Recent Oil Change").length).toBeGreaterThan(0);
    expect(screen.queryByText("Old Brake Job")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "All time" }));

    expect((await screen.findAllByText("Old Brake Job")).length).toBeGreaterThan(0);
  });

  it("caps Completed column at 15 and expands on Show more click", async () => {
    const repairs = Array.from({ length: 20 }, (_, i) => ({
      id: 300 + i,
      vehicle_id: 1,
      vehicle_label: "WB XXXX • Make Model",
      owner_name: "Name",
      master_id: null,
      master_name: "",
      service_name: `Job ${i + 1}`,
      issue_notes: "",
      status: "completed",
      tracking_code: `TOR-03${String(i).padStart(2, "0")}`,
      completed_at: "2025-01-10",
      repair_notes: [],
      before_photos: [],
      during_photos: [],
      after_photos: [],
      created_at: "2025-01-10T10:00:00Z",
      updated_at: "2025-01-10T10:00:00Z",
    }));

    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({ data: [] });
      }
      if (url === "/repairs/") {
        return Promise.resolve({ data: repairs });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await screen.findByRole("heading", { name: "Kanban Board", level: 2 });

    const kanban = await screen.findByLabelText("Repairs kanban board");

    expect(await screen.findByRole("button", { name: "Show 5 more" })).toBeInTheDocument();
    expect(within(kanban).getAllByText("Job 1").length).toBeGreaterThan(0);
    expect(within(kanban).getAllByText("Job 15").length).toBeGreaterThan(0);
    expect(within(kanban).queryByText("Job 16")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show 5 more" }));

    expect(await within(kanban).findByText("Job 16")).toBeInTheDocument();
    expect(within(kanban).getByText("Job 20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show less" }));

    expect(within(kanban).queryByText("Job 16")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show 5 more" })).toBeInTheDocument();
  });

  it("keeps the workspace accessible on refresh when a cached user exists and auth check has a transient failure", async () => {
    window.localStorage.setItem(
      "auth-user",
      JSON.stringify({
        id: 1,
        email: "manager@test.local",
        first_name: "Test",
        last_name: "Manager",
        role: "admin",
        is_staff: false,
      })
    );

    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.reject(new Error("temporary network issue"));
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({
          data: [{ id: 1, full_name: "Alex Johnson", phone: "+48 555 100 200", email: "", notes: "", vehicle_count: 1 }],
        });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              customer: { id: 1, full_name: "Alex Johnson" },
              license_plate: "WB 1234K",
              make: "Toyota",
              model: "Corolla",
              year: 2018,
              vin: "",
              color: "White",
              notes: "",
              added_date: "2024-11-04",
            },
          ],
        });
      }
      if (url === "/repairs/") {
        return Promise.resolve({ data: [] });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      if (url === "/purchases/suppliers/" || url === "/services/" || url === "/auth/staff/") {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      return Promise.resolve({ data: [] });
    });

    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    expect(screen.getByText("manager@test.local")).toBeInTheDocument();
  });

  it("client portal does not show tracking code", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/portal/ABC-123/") {
        return Promise.resolve({
          data: {
            tracking_code: "TOR-0001",
            service_name: "Brake Inspection",
            status: "completed",
            status_display: "Completed",
            vehicle_info: { label: "Toyota Corolla", year: 2020, license_plate: "WA 12345" },
            estimated_date: null,
            mileage_at_service: null,
            completed_at: "2025-01-15",
            created_at: "2025-01-01T10:00:00Z",
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    renderApp("/portal/ABC-123");

    expect(await screen.findByText("Repair Status")).toBeInTheDocument();
    expect(screen.queryByText("Order TOR-0001")).not.toBeInTheDocument();
  });

  it("kanban cards show tracking code chip", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await screen.findByLabelText("Repairs kanban board");

    expect(screen.getByText("#TOR-1011")).toBeInTheDocument();
  });

  it("shows regenerate portal link button to admin", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await openRepairKanbanCardByTrackingCode(user, "TOR-1011");

    const dialog = await screen.findByRole("dialog", { name: SMOKE_DEFAULT_REPAIR_DIALOG_NAME });
    expect(within(dialog).getByRole("button", { name: "Regenerate client portal link" })).toBeInTheDocument();
  });

  it("hides regenerate portal link button from staff", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 2, email: "staff@test.local", first_name: "Staff", last_name: "User", role: "staff", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({ data: [] });
      }
      if (url === "/repairs/") {
        return Promise.resolve({
          data: [
            {
              id: 11,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "Brake Inspection",
              issue_notes: "Customer reported vibration while braking.",
              status: "in_progress",
              tracking_code: "TOR-1011",
              portal_token: "test-portal-token-1011",
              estimated_date: null,
              completed_at: null,
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-04-05T10:00:00Z",
              updated_at: "2025-04-05T10:00:00Z",
            },
          ],
        });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getAllByRole("button", { name: "Repairs" })[0]);
    await openRepairKanbanCardByTrackingCode(user, "TOR-1011");

    const dialog = await screen.findByRole("dialog", { name: SMOKE_DEFAULT_REPAIR_DIALOG_NAME });
    expect(within(dialog).queryByRole("button", { name: "Regenerate client portal link" })).not.toBeInTheDocument();
  });

  it("regenerate portal link does not call API when confirmation is cancelled", async () => {
    mockConfirm.mockReturnValue(false);
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await openRepairKanbanCardByTrackingCode(user, "TOR-1011");

    const dialog = await screen.findByRole("dialog", { name: SMOKE_DEFAULT_REPAIR_DIALOG_NAME });
    await user.click(within(dialog).getByRole("button", { name: "Regenerate client portal link" }));

    expect(mockApi.post).not.toHaveBeenCalledWith(
      expect.stringContaining("regenerate-portal-token"),
      expect.anything()
    );
  });

  it("regenerate portal link calls API when confirmed", async () => {
    mockConfirm.mockReturnValue(true);
    mockApi.post.mockResolvedValue({ data: { portal_token: "new-token-abc123" } });
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await openRepairKanbanCardByTrackingCode(user, "TOR-1011");

    const dialog = await screen.findByRole("dialog", { name: SMOKE_DEFAULT_REPAIR_DIALOG_NAME });
    await user.click(within(dialog).getByRole("button", { name: "Regenerate client portal link" }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith("/repairs/11/regenerate-portal-token/");
    });
  });

  it("shows Make Act before first export and View PDF after an act already exists", async () => {
    const pdfBlob = new Blob(["pdf"], { type: "application/pdf" });

    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (isPurchasesUnitsGet(url)) {
        return Promise.resolve({ data: SMOKE_UNITS_OF_MEASURE_LIST });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({
          data: [{ id: 1, full_name: "Alex Johnson", phone: "+48 555 100 200", email: "", notes: "", vehicle_count: 1 }],
        });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              customer: { id: 1, full_name: "Alex Johnson" },
              license_plate: "WB 1234K",
              make: "Toyota",
              model: "Corolla",
              year: 2018,
              vin: "",
              color: "White",
              notes: "",
              added_date: "2024-11-04",
            },
          ],
        });
      }
      if (url === "/repairs/") {
        return Promise.resolve({
          data: [
            {
              id: 11,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "First Act Repair",
              issue_notes: "First completed repair without act.",
              status: "completed",
              mileage_at_service: 120500,
              tracking_code: "TOR-1011",
              portal_token: "test-portal-token-1011",
              has_pdf: false,
              estimated_date: null,
              completed_at: "2025-03-05",
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-03-05T10:00:00Z",
              updated_at: "2025-03-05T10:00:00Z",
            },
            {
              id: 12,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "Existing Act Repair",
              issue_notes: "Completed repair with stored act.",
              status: "completed",
              mileage_at_service: 120900,
              tracking_code: "TOR-1012",
              portal_token: "test-portal-token-1012",
              has_pdf: true,
              estimated_date: null,
              completed_at: "2025-03-06",
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-03-06T10:00:00Z",
              updated_at: "2025-03-06T10:00:00Z",
            },
          ],
        });
      }
      if (url === "/repairs/11/") {
        return Promise.resolve({
          data: {
            id: 11,
            vehicle_id: 1,
            vehicle_label: "WB 1234K • Toyota Corolla",
            owner_name: "Alex Johnson",
            master_id: null,
            master_name: "",
            service_name: "First Act Repair",
            issue_notes: "First completed repair without act.",
            status: "completed",
            mileage_at_service: 120500,
            tracking_code: "TOR-1011",
            portal_token: "test-portal-token-1011",
            has_pdf: true,
            latest_act_document_total: 299,
            estimated_date: null,
            completed_at: "2025-03-05",
            repair_notes: [],
            before_photos: [],
            during_photos: [],
            after_photos: [],
            created_at: "2025-03-05T10:00:00Z",
            updated_at: "2025-03-05T10:00:00Z",
          },
        });
      }
      if (url === "/services/") {
        return Promise.resolve({
          data: [{ id: 1, name: "Brake Inspection", description: "", price: "299.00", is_active: true }],
        });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      if (url === "/repairs/11/pdf/") {
        return Promise.resolve({ status: 404, data: null });
      }
      if (url === "/repairs/12/pdf/") {
        return Promise.resolve({ status: 200, data: pdfBlob });
      }
      if (isPurchasesIndexGet(url)) {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      return Promise.resolve({ data: [] });
    });

    mockApi.post.mockImplementation((url: string) => {
      if (url === "/repairs/11/pdf/export/") {
        return Promise.resolve({ data: pdfBlob });
      }
      return Promise.resolve({
        data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
      });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));

    await user.click(screen.getAllByText("First Act Repair")[1]);
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Make Act" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Make Act" }));
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith("/repairs/11/pdf/export/", null, { responseType: "blob" });
      expect(within(dialog).getByRole("button", { name: "View PDF" })).toBeInTheDocument();
    });

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getAllByText("Existing Act Repair")[1]);
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "View PDF" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Make Act" })).not.toBeInTheDocument();
  });

  it("blocks Make Act until odometer when returned is filled", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({
          data: [{ id: 1, full_name: "Alex Johnson", phone: "+48 555 100 200", email: "", notes: "", vehicle_count: 1 }],
        });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              customer: { id: 1, full_name: "Alex Johnson" },
              license_plate: "WB 1234K",
              make: "Toyota",
              model: "Corolla",
              year: 2018,
              vin: "",
              color: "White",
              notes: "",
              added_date: "2024-11-04",
            },
          ],
        });
      }
      if (url === "/repairs/") {
        return Promise.resolve({
          data: [
            {
              id: 21,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "No Odometer Repair",
              issue_notes: "Completed repair without return mileage.",
              status: "completed",
              mileage_at_service: null,
              tracking_code: "TOR-1021",
              portal_token: "test-portal-token-1021",
              has_pdf: false,
              estimated_date: null,
              completed_at: "2025-03-12",
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-03-12T10:00:00Z",
              updated_at: "2025-03-12T10:00:00Z",
            },
          ],
        });
      }
      if (url === "/purchases/") {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      if (url === "/services/" || url === "/auth/staff/") {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await openRepairKanbanCardByTrackingCode(user, "TOR-1021");

    const dialog = await screen.findByRole("dialog", { name: SMOKE_DEFAULT_REPAIR_DIALOG_NAME });
    await user.click(within(dialog).getByRole("button", { name: "Make Act" }));

    expect(mockAlert).toHaveBeenCalledWith("Fill in Odometer when returned (km) before exporting the act.");
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it("blocks View PDF when the completed repair odometer was cleared in the open modal", async () => {
    const pdfBlob = new Blob(["pdf"], { type: "application/pdf" });

    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({
          data: [{ id: 1, full_name: "Alex Johnson", phone: "+48 555 100 200", email: "", notes: "", vehicle_count: 1 }],
        });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              customer: { id: 1, full_name: "Alex Johnson" },
              license_plate: "WB 1234K",
              make: "Toyota",
              model: "Corolla",
              year: 2018,
              vin: "",
              color: "White",
              notes: "",
              added_date: "2024-11-04",
            },
          ],
        });
      }
      if (url === "/repairs/") {
        return Promise.resolve({
          data: [
            {
              id: 31,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "Existing Act With Odometer",
              issue_notes: "Completed repair with stored act.",
              status: "completed",
              mileage_at_service: 120900,
              tracking_code: "TOR-1031",
              portal_token: "test-portal-token-1031",
              has_pdf: true,
              estimated_date: null,
              completed_at: "2025-03-06",
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-03-06T10:00:00Z",
              updated_at: "2025-03-06T10:00:00Z",
            },
          ],
        });
      }
      if (url === "/purchases/") {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      if (url === "/services/" || url === "/auth/staff/") {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      if (url === "/repairs/31/pdf/") {
        return Promise.resolve({ status: 200, data: pdfBlob });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await openRepairKanbanCardByTrackingCode(user, "TOR-1031");

    const dialog = await screen.findByRole("dialog", { name: SMOKE_DEFAULT_REPAIR_DIALOG_NAME });
    const mileageInput = within(dialog).getByLabelText("Odometer reading in kilometers when vehicle was returned");
    await user.clear(mileageInput);
    await user.click(within(dialog).getByRole("button", { name: "View PDF" }));

    expect(mockAlert).toHaveBeenCalledWith("Fill in Odometer when returned (km) before exporting the act.");
    expect(mockApi.get.mock.calls.some(([url]) => url === "/repairs/31/pdf/")).toBe(false);
    expect(mileageInput).toHaveClass("repair-modal-mileage-input--attention");
  });

  it("blocks dragging a repair to Completed until odometer when returned is filled", async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === "/auth/csrf") {
        return Promise.resolve({ data: { detail: "CSRF cookie set" } });
      }
      if (url === "/auth/me") {
        return Promise.resolve({
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "admin", is_staff: false },
        });
      }
      if (url.startsWith("/customers/")) {
        return Promise.resolve({
          data: [{ id: 1, full_name: "Alex Johnson", phone: "+48 555 100 200", email: "", notes: "", vehicle_count: 1 }],
        });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              customer: { id: 1, full_name: "Alex Johnson" },
              license_plate: "WB 1234K",
              make: "Toyota",
              model: "Corolla",
              year: 2018,
              vin: "",
              color: "White",
              notes: "",
              added_date: "2024-11-04",
            },
          ],
        });
      }
      if (url === "/repairs/") {
        return Promise.resolve({
          data: [
            {
              id: 22,
              vehicle_id: 1,
              vehicle_label: "WB 1234K • Toyota Corolla",
              owner_name: "Alex Johnson",
              master_id: null,
              master_name: "",
              service_name: "Pending Mileage Repair",
              issue_notes: "Ready except for returned odometer.",
              status: "in_progress",
              mileage_at_service: null,
              tracking_code: "TOR-1022",
              portal_token: "test-portal-token-1022",
              has_pdf: false,
              estimated_date: null,
              completed_at: null,
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-03-12T10:00:00Z",
              updated_at: "2025-03-12T10:00:00Z",
            },
          ],
        });
      }
      if (url === "/purchases/") {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      if (url === "/services/" || url === "/auth/staff/") {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith("/analytics/dashboard/")) {
        return Promise.resolve({ data: createStubDashboardAnalyticsResponse() });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));

    const board = await screen.findByLabelText("Repairs kanban board");
    const card = screen.getByText("#TOR-1022").closest("article");
    const completedColumn = within(board).getByText("Completed").closest(".kanban-col");
    expect(card).not.toBeNull();
    expect(completedColumn).not.toBeNull();

    const dragStore = new Map<string, string>();
    const dataTransfer = {
      setData: (type: string, value: string) => {
        dragStore.set(type, value);
      },
      getData: (type: string) => dragStore.get(type) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };

    fireEvent.dragStart(card as HTMLElement, { dataTransfer });
    fireEvent.dragOver(completedColumn as HTMLElement, { dataTransfer });
    fireEvent.drop(completedColumn as HTMLElement, { dataTransfer });

    expect(mockAlert).toHaveBeenCalledWith(
      "Fill in Odometer when returned (km) before moving this repair to Completed."
    );
    expect(mockApi.patch).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog", { name: SMOKE_DEFAULT_REPAIR_DIALOG_NAME });
    const mileageInput = within(dialog).getByLabelText("Odometer reading in kilometers when vehicle was returned");
    expect(mileageInput).toHaveClass("repair-modal-mileage-input--attention");
  });
});
