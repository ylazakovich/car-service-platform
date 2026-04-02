import { describe, expect, it, vi, beforeEach } from "vitest";
import { downloadRepairPdf } from "./repairs";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("./client", () => ({ default: mockApi }));

describe("downloadRepairPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls correct endpoint with blob responseType", async () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    mockApi.get.mockResolvedValue({ data: blob });

    await downloadRepairPdf(42);

    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.get).toHaveBeenCalledWith("/repairs/42/pdf/", { responseType: "blob" });
  });

  it("returns the blob from response", async () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    mockApi.get.mockResolvedValue({ data: blob });

    const result = await downloadRepairPdf(42);

    expect(result).toBeInstanceOf(Blob);
    expect(result).toBe(blob);
  });
});
