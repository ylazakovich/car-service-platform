import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

const localStorageStore = new Map<string, string>();
const mockOpen = vi.fn();
const mockConfirm = vi.fn();
const mockCreateObjectURL = vi.fn();

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
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: mockCreateObjectURL,
    });
    mockOpen.mockReset();
    mockConfirm.mockReset();
    mockCreateObjectURL.mockReset();
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
      if (url === "/purchases/") {
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
                invoice_name: "",
                invoice_url: "",
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
    expect(await screen.findByRole("heading", { name: "Purchase Registry", level: 2 })).toBeInTheDocument();

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
    expect(await screen.findByRole("heading", { name: "Purchase Registry", level: 2 })).toBeInTheDocument();
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
              service_name: "Oil Change",
              issue_notes: "Scheduled maintenance.",
              status: "completed",
              tracking_code: "TOR-1011",
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
              completed_at: null,
              repair_notes: [],
              before_photos: [],
              during_photos: [],
              after_photos: [],
              created_at: "2025-04-08T10:00:00Z",
              updated_at: "2025-04-08T10:00:00Z",
            },
          ],
        });
      }
      if (url === "/purchases/") {
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
                invoice_name: "",
                invoice_url: "",
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
                invoice_name: "",
                invoice_url: "",
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
                invoice_name: "",
                invoice_url: "",
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
                invoice_name: "",
                invoice_url: "",
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
                invoice_name: "",
                invoice_url: "",
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

    const [startInput, endInput] = await screen.findAllByPlaceholderText("dd-mm-yyyy");
    await user.clear(startInput);
    await user.type(startInput, "01-03-2025");
    await user.tab();

    await user.clear(endInput);
    await user.type(endInput, "31-03-2025");
    await user.tab();

    const serviceResults = screen.getByRole("heading", { name: "Service Results", level: 3 }).closest("section");
    const partsResults = screen.getByRole("heading", { name: "Parts Results", level: 3 }).closest("section");

    expect(serviceResults).not.toBeNull();
    expect(partsResults).not.toBeNull();

    await waitFor(() => {
      expect(within(serviceResults as HTMLElement).getByText(/610,00\s*zł/)).toBeInTheDocument();
      expect(within(partsResults as HTMLElement).getByText(/120,00\s*zł/)).toBeInTheDocument();
      expect(within(partsResults as HTMLElement).getByText(/230,00\s*zł/)).toBeInTheDocument();
      expect(within(partsResults as HTMLElement).getByText(/110,00\s*zł/)).toBeInTheDocument();
    });
  });

  it("resets moneyflow to the last 30 days on every dashboard visit", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Operations Dashboard")).toBeInTheDocument());

    const today = new Date();
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);

    const startInput = await screen.findByLabelText("Start date");
    const endInput = await screen.findByLabelText("End date");

    expect(startInput).toHaveValue(formatExpectedDateInput(startDate));
    expect(endInput).toHaveValue(formatExpectedDateInput(endDate));

    await user.clear(startInput);
    await user.type(startInput, "01-01-2025");
    await user.tab();
    await user.clear(endInput);
    await user.type(endInput, "31-01-2025");
    await user.tab();

    expect(startInput).toHaveValue("01-01-2025");
    expect(endInput).toHaveValue("31-01-2025");

    await user.click(screen.getByRole("button", { name: "Purchases" }));
    expect(await screen.findByRole("heading", { name: "Purchase Registry", level: 2 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Start date")).toHaveValue(formatExpectedDateInput(startDate));
      expect(screen.getByLabelText("End date")).toHaveValue(formatExpectedDateInput(endDate));
    });
  });

  it("shows a moneyflow chart with toggleable series", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Operations Dashboard")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Flow Timeline", level: 3 })).toBeInTheDocument();

    const purchaseToggle = screen.getByRole("button", { name: "Purchase Spend trend" });
    const serviceToggle = screen.getByRole("button", { name: "Service Sales trend" });
    const partsToggle = screen.getByRole("button", { name: "Parts Sales trend" });

    expect(purchaseToggle).toHaveAttribute("aria-pressed", "true");
    expect(serviceToggle).toHaveAttribute("aria-pressed", "true");
    expect(partsToggle).toHaveAttribute("aria-pressed", "true");

    await user.click(purchaseToggle);
    await user.click(serviceToggle);
    await user.click(partsToggle);

    expect(purchaseToggle).toHaveAttribute("aria-pressed", "false");
    expect(serviceToggle).toHaveAttribute("aria-pressed", "false");
    expect(partsToggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Turn on at least one line to display the chart.")).toBeInTheDocument();
  });

  it("opens detail dialogs for customer and vehicle cards", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Vehicles" }));
    await user.click((await screen.findAllByText("WB 1234K"))[0]);
    expect(await screen.findByRole("button", { name: "Edit Vehicle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Vehicle" })).toBeInTheDocument();
    expect(screen.getByText("Date Added: 04-11-2024")).toBeInTheDocument();
    expect(screen.getAllByText("Brake Inspection")).toHaveLength(2);
    expect(screen.getAllByText("Tracking: TOR-1011")).toHaveLength(2);
  });

  it("shows the ordered parts linked to the selected repair", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    expect((await screen.findAllByText("1 linked part")).length).toBeGreaterThan(0);

    await user.click(screen.getAllByText("Brake Inspection")[1]);

    const repairDialog = await screen.findByRole("dialog");
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
      if (url === "/purchases/") {
        return Promise.resolve({ data: { results: [], count: 0 } });
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
    await user.click(screen.getAllByText("Wheel Alignment")[1]);

    const repairDialog = await screen.findByRole("dialog");
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
    await user.click(await screen.findByRole("heading", { name: "Brake Pad Set", level: 4 }));
    expect(screen.queryByLabelText("Tracking")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Repair Code")).not.toBeInTheDocument();
    expect(screen.queryByText("TOR-2040")).not.toBeInTheDocument();
    expect(screen.queryByText("Supplier Document")).not.toBeInTheDocument();

    expect(await screen.findByText("No invoice attached yet")).toBeInTheDocument();
    expect(screen.getByText("Add Invoice")).toBeInTheDocument();

    const invoiceInput = view.container.querySelector("#purchase-modal-invoice-input");
    expect(invoiceInput).not.toBeNull();

    const invoiceFile = new File(["invoice"], "invoice.pdf", { type: "application/pdf" });
    await user.upload(invoiceInput as HTMLInputElement, invoiceFile);

    expect(await screen.findByText("invoice.pdf")).toBeInTheDocument();
    expect(screen.getByText("Attached")).toBeInTheDocument();
    expect(screen.getByText("Replace Invoice")).toBeInTheDocument();
    expect(screen.getByText("Delete Invoice")).toBeInTheDocument();
    expect(screen.queryByText("Open Invoice")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "invoice.pdf" }));
    expect(mockOpen).toHaveBeenCalledWith("blob:test-invoice", "_blank", "noopener,noreferrer");

    await user.click(screen.getByRole("button", { name: "Delete Invoice" }));
    expect(mockConfirm).toHaveBeenCalledWith("Remove the attached invoice from this purchase?");
    expect(await screen.findByText("No invoice attached yet")).toBeInTheDocument();
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });

  it("keeps purchase linkage to the selected repair even without manual vehicle selection", async () => {
    const user = userEvent.setup();
    mockApi.post.mockImplementation((url: string, data?: Record<string, unknown>) => {
      if (url === "/uploads/invoice/") {
        return Promise.resolve({ data: { url: "blob:test-invoice", name: "invoice.pdf" } });
      }
      if (url === "/purchases/") {
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
            invoice_name: "",
            invoice_url: "",
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
    await user.click(await screen.findByRole("button", { name: "+ Add Purchase" }));

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

    await user.click(screen.getByRole("button", { name: "Add Purchase" }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        "/purchases/",
        expect.objectContaining({
          order_date: "2025-04-05",
          supplier_name: "AutoParts Pro",
          part_name: "Brake Sensor",
          repair_code: "TOR-1011",
          vehicle_id: 1,
        })
      );
    });
  });

  it("renders a public client portal route", async () => {
    renderApp("/portal/ABC-123");

    expect(await screen.findByText("Track Your Repair")).toBeInTheDocument();
    expect(screen.getByText(/Access code: ABC-123/)).toBeInTheDocument();
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
      if (url === "/purchases/") {
        return Promise.resolve({ data: { results: [], count: 0 } });
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
      if (url.startsWith("/customers/")) {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith("/vehicles/")) {
        return Promise.resolve({ data: [] });
      }
      if (url === "/repairs/") {
        return Promise.resolve({ data: repairs });
      }
      if (url === "/purchases/") {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Repairs" }));
    await screen.findByRole("heading", { name: "Kanban Board", level: 2 });

    const kanban = await screen.findByLabelText("Desktop repairs board");

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

});
