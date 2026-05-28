import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptInvite, createInvite, fetchUsers, resetInvite, updateUserName, type UserItem } from "./users";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("./client", () => ({ default: mockApi }));

const user: UserItem = {
  id: 3,
  email: "ola@example.com",
  first_name: "Ola",
  last_name: "Nowak",
  role: "staff",
  is_staff: true,
  is_active: true,
  created_at: "2026-01-01T10:00:00Z",
  has_usable_password: false,
};

describe("users API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchUsers reads the auth users collection", async () => {
    mockApi.get.mockResolvedValue({ data: [user] });

    const result = await fetchUsers();

    expect(mockApi.get).toHaveBeenCalledWith("/auth/users/");
    expect(result).toEqual([user]);
  });

  it("createInvite includes optional names when provided", async () => {
    mockApi.post.mockResolvedValue({ data: { id: 4, email: "jan@example.com", role: "staff", invite_url: "https://app/invite/t" } });

    const result = await createInvite("jan@example.com", "staff", "Jan", "Kowalski");

    expect(mockApi.post).toHaveBeenCalledWith("/auth/users/invite/", {
      email: "jan@example.com",
      role: "staff",
      first_name: "Jan",
      last_name: "Kowalski",
    });
    expect(result.invite_url).toBe("https://app/invite/t");
  });

  it("createInvite sends empty names by default so the backend owns display fallback", async () => {
    mockApi.post.mockResolvedValue({ data: { id: 4, email: "jan@example.com", role: "staff", invite_url: "url" } });

    await createInvite("jan@example.com", "staff");

    expect(mockApi.post).toHaveBeenCalledWith("/auth/users/invite/", {
      email: "jan@example.com",
      role: "staff",
      first_name: "",
      last_name: "",
    });
  });

  it("acceptInvite posts token and password to the accept endpoint", async () => {
    mockApi.post.mockResolvedValue({});

    await acceptInvite("token-123", "secret-password");

    expect(mockApi.post).toHaveBeenCalledWith("/auth/users/invite/accept", {
      token: "token-123",
      password: "secret-password",
    });
  });

  it("resetInvite returns the new invite URL", async () => {
    mockApi.post.mockResolvedValue({ data: { invite_url: "https://app/invite/new" } });

    const result = await resetInvite(3);

    expect(mockApi.post).toHaveBeenCalledWith("/auth/users/3/reset-invite/");
    expect(result).toEqual({ invite_url: "https://app/invite/new" });
  });

  it("updateUserName patches only first and last name", async () => {
    mockApi.patch.mockResolvedValue({ data: { ...user, first_name: "Aleksandra", last_name: "K." } });

    const result = await updateUserName(3, "Aleksandra", "K.");

    expect(mockApi.patch).toHaveBeenCalledWith("/auth/users/3/", {
      first_name: "Aleksandra",
      last_name: "K.",
    });
    expect(result).toMatchObject({ first_name: "Aleksandra", last_name: "K." });
  });
});
