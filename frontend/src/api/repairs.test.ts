import { describe, expect, it, vi, beforeEach } from "vitest";
import { exportRepairPdf, fetchLatestRepairPdf, openRepairPdfForPreview } from "./repairs";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("./client", () => ({ default: mockApi }));

describe("repair PDF API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchLatestRepairPdf returns null on 404", async () => {
    mockApi.get.mockResolvedValue({ status: 404, data: new Blob() });

    const result = await fetchLatestRepairPdf(42);

    expect(result).toBeNull();
    expect(mockApi.get).toHaveBeenCalledWith("/repairs/42/pdf/", {
      responseType: "blob",
      validateStatus: expect.any(Function),
    });
  });

  it("fetchLatestRepairPdf returns blob on 200", async () => {
    const blob = new Blob(["pdf"], { type: "application/pdf" });
    mockApi.get.mockResolvedValue({ status: 200, data: blob });

    const result = await fetchLatestRepairPdf(7);

    expect(result).toBe(blob);
  });

  it("exportRepairPdf POSTs export endpoint", async () => {
    const blob = new Blob(["x"], { type: "application/pdf" });
    mockApi.post.mockResolvedValue({ data: blob });

    const result = await exportRepairPdf(5);

    expect(mockApi.post).toHaveBeenCalledWith("/repairs/5/pdf/export/", null, { responseType: "blob" });
    expect(result).toBe(blob);
  });

  it("openRepairPdfForPreview uses latest when present", async () => {
    const blob = new Blob(["cached"], { type: "application/pdf" });
    mockApi.get.mockResolvedValue({ status: 200, data: blob });

    const result = await openRepairPdfForPreview(1);

    expect(result).toBe(blob);
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it("openRepairPdfForPreview exports when no latest", async () => {
    const exported = new Blob(["new"], { type: "application/pdf" });
    mockApi.get.mockResolvedValue({ status: 404, data: new Blob() });
    mockApi.post.mockResolvedValue({ data: exported });

    const result = await openRepairPdfForPreview(1);

    expect(result).toBe(exported);
    expect(mockApi.post).toHaveBeenCalledTimes(1);
  });
});
