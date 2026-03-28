import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
                repair_code: "TOR-2040",
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

  it("prefills the added date when creating a new vehicle", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Vehicles" }));
    await user.click(await screen.findByRole("button", { name: "+ Add Vehicle" }));

    const expectedDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
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
      if (url === "/purchases/") {
        return Promise.resolve({ data: { results: [], count: 0 } });
      }
      if (url === "/purchases/suppliers/" || url === "/services/" || url === "/auth/staff/") {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: [] });
    });

    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    expect(screen.getByText("manager@test.local")).toBeInTheDocument();
  });
});
