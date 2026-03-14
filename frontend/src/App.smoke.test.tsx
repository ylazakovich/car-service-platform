import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

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
    renderApp("/app");

    await waitFor(() => expect(screen.getByText("Service Desk")).toBeInTheDocument());
    expect(screen.getByText("Car Service Platform")).toBeInTheDocument();
    expect(screen.getByText("manager@test.local")).toBeInTheDocument();
    expect(screen.getByText(/Customers and vehicles/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Alex Johnson", level: 4 })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "WB 1234K", level: 4 })).toBeInTheDocument();
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
