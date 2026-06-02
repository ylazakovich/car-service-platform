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
  vi.restoreAllMocks();
});

function renderPortalStatusPage(repair: PortalRepair = basePortalRepair, accessCode = "ABC-123") {
  mockApi.get.mockResolvedValue({ data: repair });

  return render(
    <MemoryRouter initialEntries={[`/portal/${accessCode}`]}>
      <Routes>
        <Route path="/portal/:accessCode" element={<ClientPortalPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("client portal status page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
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

  it("keeps route tokens URL-encoded when requesting the portal API", async () => {
    renderPortalStatusPage(basePortalRepair, "ABC%20123%2BPL");

    expect(await screen.findByRole("heading", { name: "Your repair status" })).toBeInTheDocument();
    expect(mockApi.get).toHaveBeenCalledWith("/portal/ABC%20123%2BPL/");
  });

  it("shows progress states for a repair waiting for parts", async () => {
    renderPortalStatusPage({ ...basePortalRepair, status: "waiting_parts", status_display: "Waiting for Parts" });

    const progress = await screen.findByRole("list", { name: "Repair progress" });
    expect(within(progress).getByText("Received")).toHaveTextContent("Received — completed");
    expect(within(progress).getByText("In Progress")).toHaveTextContent("In Progress — current step");
    expect(within(progress).getByText("Ready for Pickup")).toHaveTextContent("Ready for Pickup — upcoming");
    expect(within(progress).getByText("Waiting for parts — we'll resume as soon as they arrive")).toBeInTheDocument();
  });

  it.each([
    ["new", ["Received — current step", "In Progress — upcoming", "Ready for Pickup — upcoming"]],
    ["in_progress", ["Received — completed", "In Progress — current step", "Ready for Pickup — upcoming"]],
    ["completed", ["Received — completed", "In Progress — completed", "Ready for Pickup — current step"]],
  ] satisfies Array<[PortalRepair["status"], string[]]>)('maps %s status to the customer progress stepper', async (status, expectedStates) => {
    renderPortalStatusPage({ ...basePortalRepair, status });

    const progress = await screen.findByRole("list", { name: "Repair progress" });
    for (const state of expectedStates) {
      expect(within(progress).getByText(state.split(" — ")[0])).toHaveTextContent(state);
    }
  });

  it("lists structured service lines instead of the legacy service summary", async () => {
    renderPortalStatusPage({
      ...basePortalRepair,
      service_name: "Legacy summary should not be shown",
      service_lines: [
        { name: "Oil change", catalog_service_id: 1 },
        { name: "Brake inspection", catalog_service_id: 2 },
      ],
    });

    const services = await screen.findByRole("list", { name: "" });
    expect(within(services).getByText("Oil change")).toBeInTheDocument();
    expect(within(services).getByText("Brake inspection")).toBeInTheDocument();
    expect(screen.queryByText("Legacy summary should not be shown")).not.toBeInTheDocument();
  });

  it("falls back to the legacy service name when structured service lines are absent", async () => {
    renderPortalStatusPage({ ...basePortalRepair, service_lines: undefined, service_name: "Legacy brake summary" });

    expect(await screen.findByRole("heading", { name: "Your repair status" })).toBeInTheDocument();
    expect(screen.getByText("Legacy brake summary")).toBeInTheDocument();
  });

  it("omits the vehicle year separator when the backend does not provide a year", async () => {
    renderPortalStatusPage({
      ...basePortalRepair,
      vehicle_info: { ...basePortalRepair.vehicle_info, year: null },
    });

    expect(await screen.findByText("Toyota Corolla")).toBeInTheDocument();
    expect(screen.queryByText("Toyota Corolla ·")).not.toBeInTheDocument();
  });

  it.each([
    ["estimated date", { completed_at: null, estimated_date: "2025-01-20" }, "Est. completion", "20 Jan 2025"],
    ["completed date", { completed_at: "2025-01-15", estimated_date: "2025-01-20" }, "Completed", "15 Jan 2025"],
    ["created date fallback", { completed_at: null, estimated_date: null }, "Est. completion", "01 Jan 2025"],
  ])('shows the %s in the customer-facing date block', async (_name, dates, label, value) => {
    renderPortalStatusPage({ ...basePortalRepair, ...dates });

    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.getByText(value)).toBeInTheDocument();
  });

  it("renders trusted workshop identity, phone, and directions when present", async () => {
    renderPortalStatusPage({
      ...basePortalRepair,
      workshop: {
        name: "Y&O Garage",
        phone: "+48 123 456 789",
        address: "Warsaw, Main 1",
        maps_url: "https://maps.example.test/garage",
      },
    });

    expect(await screen.findByText("Y&O Garage")).toBeInTheDocument();
    expect(screen.getByText("Authorized service")).toBeInTheDocument();
    expect(screen.getByText("Warsaw, Main 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /call the workshop/i })).toHaveAttribute("href", "tel:+48 123 456 789");
    expect(screen.getByRole("link", { name: /directions/i })).toHaveAttribute("href", "https://maps.example.test/garage");
  });

  it("hides the workshop contact row when workshop contact fields are blank", async () => {
    renderPortalStatusPage({
      ...basePortalRepair,
      workshop: { name: "Y&O Garage", phone: "", address: "", maps_url: "" },
    });

    expect(await screen.findByText("Y&O Garage")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /call the workshop/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /directions/i })).not.toBeInTheDocument();
  });

  it.each([
    [30_000, "Updated just now"],
    [5 * 60_000, "Updated 5 min ago"],
    [3 * 60 * 60_000, "Updated 3h ago"],
    [2 * 24 * 60 * 60_000, "Updated 2d ago"],
  ])("formats last-updated copy for %d ms old updates", async (ageMs, expected) => {
    const now = new Date("2025-01-25T12:00:00Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(now);
    renderPortalStatusPage({
      ...basePortalRepair,
      updated_at: new Date(now - ageMs).toISOString(),
    });

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it("shows the not-found state for expired or unknown access codes", async () => {
    mockApi.get.mockRejectedValue({ response: { status: 404 } });

    render(
      <MemoryRouter initialEntries={["/portal/MISSING"]}>
        <Routes>
          <Route path="/portal/:accessCode" element={<ClientPortalPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Access code not found" })).toBeInTheDocument();
    expect(screen.getByText(/incorrect or expired/i)).toBeInTheDocument();
  });

  it("shows a retryable error state for non-404 portal API failures", async () => {
    mockApi.get.mockRejectedValue({ response: { status: 500 } });

    render(
      <MemoryRouter initialEntries={["/portal/BROKEN"]}>
        <Routes>
          <Route path="/portal/:accessCode" element={<ClientPortalPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByText("Please refresh the page and try again.")).toBeInTheDocument();
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
