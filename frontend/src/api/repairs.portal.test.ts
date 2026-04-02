import { describe, expect, it, vi, beforeEach } from "vitest";
import { regeneratePortalToken } from "./repairs";

const mockApi = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock("./client", () => ({ default: mockApi }));

describe("regeneratePortalToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts to the correct endpoint", async () => {
    mockApi.post.mockResolvedValue({ data: { portal_token: "newtoken123" } });

    await regeneratePortalToken(42);

    expect(mockApi.post).toHaveBeenCalledWith("/repairs/42/regenerate-portal-token/");
  });

  it("returns the new portal_token from the response", async () => {
    const newToken = "fake-portal-token-regenerated";
    mockApi.post.mockResolvedValue({ data: { portal_token: newToken } });

    const result = await regeneratePortalToken(1);

    expect(result.portal_token).toBe(newToken);
  });
});
