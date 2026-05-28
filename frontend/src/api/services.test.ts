import { beforeEach, describe, expect, it, vi } from "vitest";
import { createService, deleteService, fetchServices, updateService, type ServiceItem } from "./services";

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./client", () => ({ default: mockApi }));

const service: ServiceItem = {
  id: 7,
  name: "Oil change",
  description: "Engine oil and filter",
  price: "120.00",
  is_active: true,
};

describe("services API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchServices reads the services collection and returns response data", async () => {
    mockApi.get.mockResolvedValue({ data: [service] });

    const result = await fetchServices();

    expect(mockApi.get).toHaveBeenCalledWith("/services/");
    expect(result).toEqual([service]);
  });

  it("createService posts the write payload unchanged", async () => {
    const payload = { name: "Diagnostics", description: "Computer diagnostics", price: "80.00", is_active: true };
    mockApi.post.mockResolvedValue({ data: { ...service, ...payload, id: 8 } });

    const result = await createService(payload);

    expect(mockApi.post).toHaveBeenCalledWith("/services/", payload);
    expect(result).toMatchObject({ id: 8, name: "Diagnostics", price: "80.00" });
  });

  it("createService preserves null price for non-priced catalog rows", async () => {
    const payload = { name: "Custom inspection", price: null };
    mockApi.post.mockResolvedValue({ data: { ...service, ...payload } });

    await createService(payload);

    expect(mockApi.post).toHaveBeenCalledWith("/services/", payload);
  });

  it("updateService patches the detail endpoint without forcing a trailing slash", async () => {
    const patch = { name: "Oil + filter", is_active: false };
    mockApi.patch.mockResolvedValue({ data: { ...service, ...patch } });

    const result = await updateService(7, patch);

    expect(mockApi.patch).toHaveBeenCalledWith("/services/7", patch);
    expect(result).toMatchObject(patch);
  });

  it("deleteService deletes the detail endpoint", async () => {
    mockApi.delete.mockResolvedValue({});

    await deleteService(7);

    expect(mockApi.delete).toHaveBeenCalledWith("/services/7");
  });
});
