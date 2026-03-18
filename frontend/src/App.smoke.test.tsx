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
          data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "manager", is_staff: false },
        });
      }
      if (url === "/customers/") {
        return Promise.resolve({
          data: [{ id: 1, full_name: "Alex Johnson", phone: "+48 555 100 200", email: "", notes: "", vehicle_count: 1 }],
        });
      }
      if (url === "/vehicles/") {
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
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
    mockApi.post.mockResolvedValue({
      data: { id: 1, email: "manager@test.local", first_name: "Test", last_name: "Manager", role: "manager", is_staff: false },
    });
    mockApi.patch.mockResolvedValue({ data: {} });
    mockApi.delete.mockResolvedValue({ data: {} });
  });

  it("renders the staff workspace for an authenticated user", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    expect(screen.getByText("Internal workspace for the team.")).toBeInTheDocument();
    expect(screen.getByText("manager@test.local")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vehicles" }));
    expect(await screen.findByRole("heading", { name: "WB 1234K", level: 4 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Repairs" }));
    expect(await screen.findByRole("heading", { name: "Kanban Board", level: 2 })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Purchases" }));
    expect(await screen.findByRole("heading", { name: "Purchase Registry", level: 3 })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Users" })).toBeInTheDocument();
  });

  it("restores the last active staff section after reload", async () => {
    window.localStorage.setItem("staff-active-section", "purchases");
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    expect(await screen.findByRole("heading", { name: "Purchase Registry", level: 3 })).toBeInTheDocument();
  });

  it("opens detail dialogs for customer and vehicle cards", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Vehicles" }));
    await user.click(await screen.findByRole("heading", { name: "KR 2048A", level: 4 }));
    expect(await screen.findByRole("button", { name: "Edit Vehicle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Vehicle" })).toBeInTheDocument();
    expect(screen.getByText("Date Added: 2025-11-04")).toBeInTheDocument();
  });

  it("prefills the added date when creating a new vehicle", async () => {
    const user = userEvent.setup();
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Vehicles" }));
    await user.click(await screen.findByRole("button", { name: "Add New Vehicle" }));

    const expectedDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    expect(await screen.findByDisplayValue(expectedDate)).toBeInTheDocument();
  });

  it("allows attaching, opening and removing an invoice from purchase details", async () => {
    const user = userEvent.setup();
    const view = renderApp("/app");

    await waitFor(() => expect(screen.getByText("Car Service")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Purchases" }));
    await user.click(await screen.findByRole("heading", { name: "Brake Pad Set", level: 4 }));

    expect(await screen.findByText("No invoice attached yet")).toBeInTheDocument();

    const invoiceInput = view.container.querySelector("#purchase-modal-invoice-input");
    expect(invoiceInput).not.toBeNull();

    const invoiceFile = new File(["invoice"], "invoice.pdf", { type: "application/pdf" });
    await user.upload(invoiceInput as HTMLInputElement, invoiceFile);

    expect(await screen.findByText("invoice.pdf")).toBeInTheDocument();
    expect(screen.getByText("Attached")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Invoice" }));
    expect(mockOpen).toHaveBeenCalledWith("blob:test-invoice", "_blank", "noopener,noreferrer");

    await user.click(screen.getByRole("button", { name: "Remove Invoice" }));
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
});
