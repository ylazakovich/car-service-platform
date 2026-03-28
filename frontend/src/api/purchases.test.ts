import { describe, expect, it, vi, beforeEach } from "vitest";
import { uploadInvoiceFile } from "./purchases";

const mockApi = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock("./client", () => ({ default: mockApi }));

describe("uploadInvoiceFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts FormData without overriding multipart headers", async () => {
    mockApi.post.mockResolvedValue({
      data: { url: "/media/invoices/test.pdf", name: "test.pdf" },
    });

    const file = new File(["invoice"], "test.pdf", { type: "application/pdf" });
    const result = await uploadInvoiceFile(file);

    expect(result).toEqual({ url: "/media/invoices/test.pdf", name: "test.pdf" });
    expect(mockApi.post).toHaveBeenCalledTimes(1);

    const [url, body, config] = mockApi.post.mock.calls[0];
    expect(url).toBe("/uploads/invoice/");
    expect(body).toBeInstanceOf(FormData);
    expect(config).toBeUndefined();
  });
});
