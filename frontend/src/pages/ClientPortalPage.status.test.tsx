import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ClientPortalPage } from "./ClientPortalPage";
import type { PortalRepair } from "../api/portal";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  interceptors: {
    response: { use: vi.fn() },
    request: { use: vi.fn() },
  },
}));

vi.mock("../api/client", () => ({ default: mockApi }));

const basePortalRepair: PortalRepair = {
  tracking_code: "TOR-0001",
  service_name: "Brake Inspection",
  status: "in_progress",
  status_display: "In Progress",
  vehicle_info: { label: "Toyota Corolla", year: 2020, license_plate: "WA 12345" },
  estimated_date: "2025-01-20",
  mileage_at_service: null,
  completed_at: null,
  created_at: "2025-01-01T10:00:00Z",
  updated_at: new Date().toISOString(),
  workshop: null,
};

afterEach(() => {
  cleanup();
});

function renderPortalStatusPage(repair: PortalRepair = basePortalRepair) {
  mockApi.get.mockResolvedValue({ data: repair });

  return render(
    <MemoryRouter initialEntries={["/portal/ABC-123"]}>
      <Routes>
        <Route path="/portal/:accessCode" element={<ClientPortalPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("client portal status page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the public repair status route", async () => {
    renderPortalStatusPage();

    expect(await screen.findByRole("heading", { name: "Your repair status" })).toBeInTheDocument();
    expect(mockApi.get).toHaveBeenCalledWith("/portal/ABC-123/");
    expect(screen.getByText("Repair Tracking")).toBeInTheDocument();
    expect(screen.getByText("Brake Inspection")).toBeInTheDocument();
    expect(screen.getByText("Toyota Corolla · 2020")).toBeInTheDocument();
    expect(screen.getByText("WA 12345")).toBeInTheDocument();
  });

  it("shows progress states for a repair waiting for parts", async () => {
    renderPortalStatusPage({ ...basePortalRepair, status: "waiting_parts", status_display: "Waiting for Parts" });

    const progress = await screen.findByRole("list", { name: "Repair progress" });
    expect(within(progress).getByText("Received")).toHaveTextContent("Received — completed");
    expect(within(progress).getByText("In Progress")).toHaveTextContent("In Progress — current step");
    expect(within(progress).getByText("Ready for Pickup")).toHaveTextContent("Ready for Pickup — upcoming");
    expect(within(progress).getByText("Waiting for parts — we'll resume as soon as they arrive")).toBeInTheDocument();
  });

  it("does not render the old order-style tracking-code header", async () => {
    renderPortalStatusPage({
      ...basePortalRepair,
      status: "completed",
      status_display: "Completed",
      estimated_date: null,
      completed_at: "2025-01-15",
    });

    expect(await screen.findByRole("heading", { name: "Your repair status" })).toBeInTheDocument();
    expect(screen.queryByText("Order TOR-0001")).not.toBeInTheDocument();
    expect(screen.getByText("Reference")).toBeInTheDocument();
    expect(screen.getByText("TOR-0001")).toBeInTheDocument();
  });
});
