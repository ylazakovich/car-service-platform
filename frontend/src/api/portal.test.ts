import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchPortalRepair } from "./portal";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("./client", () => ({ default: mockApi }));

describe("fetchPortalRepair", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the correct portal endpoint", async () => {
    const portalCode = "fake-portal-code-for-test";
    mockApi.get.mockResolvedValue({
      data: {
        tracking_code: "TOR-0001",
        service_name: "Oil Change",
        status: "in_progress",
        status_display: "In Progress",
        vehicle_info: { label: "Toyota Yaris", year: 2020, license_plate: "WA 12345" },
        estimated_date: null,
        mileage_at_service: null,
        completed_at: null,
        created_at: "2025-01-01T10:00:00Z",
      },
    });

    await fetchPortalRepair(token);

    expect(mockApi.get).toHaveBeenCalledWith(`/portal/${encodeURIComponent(token)}/`);
  });

  it("returns the repair data from the response", async () => {
    const someCode = "some-portal-access-code";
    mockApi.get.mockResolvedValue({
      data: {
        tracking_code: "TOR-0042",
        service_name: "Brake Replacement",
        status: "completed",
        status_display: "Completed",
        vehicle_info: { label: "BMW 3 Series", year: 2019, license_plate: "KR 99999" },
        estimated_date: null,
        mileage_at_service: 54200,
        completed_at: "2025-03-15",
        created_at: "2025-03-10T08:00:00Z",
      },
    });

    const result = await fetchPortalRepair(someCode);

    expect(result.tracking_code).toBe("TOR-0042");
    expect(result.status).toBe("completed");
    expect(result.vehicle_info.license_plate).toBe("KR 99999");
  });

  it("URL-encodes special characters in the access code", async () => {
    const codeWithSpecialChars = "abc+def=ghi";
    mockApi.get.mockResolvedValue({ data: {} });

    await fetchPortalRepair(codeWithSpecialChars);

    const calledUrl = mockApi.get.mock.calls[0][0] as string;
    expect(calledUrl).toContain(encodeURIComponent(codeWithSpecialChars));
    expect(calledUrl).not.toContain("+");
    expect(calledUrl).not.toContain("=");
  });
});
