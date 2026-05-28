import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mapApiPurchaseToPurchaseEntry, usePurchases, type PurchaseEntry } from "./usePurchases";
import { fetchPurchases, fetchSuppliers, fetchUnitsOfMeasure } from "../../../api/purchases";
import type { PurchaseItem, PurchasePage } from "../../../api/purchases";

vi.mock("../../../api/purchases", async () => {
  const actual = await vi.importActual<typeof import("../../../api/purchases")>("../../../api/purchases");
  return {
    ...actual,
    fetchPurchases: vi.fn(),
    fetchSuppliers: vi.fn(),
    fetchUnitsOfMeasure: vi.fn(),
  };
});

const fetchPurchasesMock = vi.mocked(fetchPurchases);
const fetchSuppliersMock = vi.mocked(fetchSuppliers);
const fetchUnitsOfMeasureMock = vi.mocked(fetchUnitsOfMeasure);

function emptyPurchasePage(): PurchasePage {
  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.clearAllMocks();
});

function purchase(overrides: Partial<PurchaseItem> = {}): PurchaseItem {
  return {
    id: 11,
    order_date: "2026-01-02",
    approximate_delivery_date: null,
    supplier: {
      id: 5,
      name: "Parts Sp. z o.o.",
      nip: "1234567890",
      phone: "+48555100200",
      email: "parts@example.com",
      notes: "preferred",
    },
    part_name: "Oil filter",
    quantity: 2,
    current_stock_quantity: null,
    inventory_checked_on: null,
    purchase_price: "40.50",
    sale_price: "65.00",
    repair_code: "R-001",
    vehicle: 3,
    vehicle_license_plate: "WX12345",
    unit_of_measure: { id: 1, code: "pcs", name: "Pieces", is_active: true, sort_order: 10 },
    invoice_name: "invoice.pdf",
    invoice_url: "/media/invoices/invoice.pdf",
    delivered: true,
    is_shop_consumable: false,
    created_at: "2026-01-02T10:00:00Z",
    updated_at: "2026-01-02T10:00:00Z",
    ...overrides,
  };
}

describe("usePurchases", () => {
  it("keeps warehouse purchases in initial loading state until the first fetch settles", async () => {
    fetchSuppliersMock.mockResolvedValue([]);
    fetchUnitsOfMeasureMock.mockResolvedValue([]);
    const warehouseFetch = deferred<PurchasePage>();
    fetchPurchasesMock.mockReturnValueOnce(warehouseFetch.promise);

    const { result } = renderHook(() => usePurchases([]));

    expect(result.current.isPurchasesLoading).toBe(true);
    expect(result.current.purchases).toEqual([]);

    await act(async () => {
      warehouseFetch.resolve(emptyPurchasePage());
      await warehouseFetch.promise;
    });

    await waitFor(() => expect(result.current.isPurchasesLoading).toBe(false));
  });

  it("keeps consumables in loading state while their first enabled fetch is in flight", async () => {
    fetchSuppliersMock.mockResolvedValue([]);
    fetchUnitsOfMeasureMock.mockResolvedValue([]);
    fetchPurchasesMock.mockResolvedValueOnce(emptyPurchasePage());
    const consumablesFetch = deferred<PurchasePage>();
    fetchPurchasesMock.mockReturnValueOnce(consumablesFetch.promise);

    const { result } = renderHook(() => usePurchases([], { enableConsumablesFetch: true }));

    expect(result.current.isConsumablesLoading).toBe(true);

    await act(async () => {
      consumablesFetch.resolve(emptyPurchasePage());
      await consumablesFetch.promise;
    });

    await waitFor(() => expect(result.current.isConsumablesLoading).toBe(false));
  });
});

describe("mapApiPurchaseToPurchaseEntry", () => {
  it("maps API purchase fields into the UI entry shape", () => {
    expect(mapApiPurchaseToPurchaseEntry(purchase())).toEqual({
      id: 11,
      order_date: "2026-01-02",
      approximate_delivery_date: "",
      supplier_name: "Parts Sp. z o.o.",
      supplier_nip: "1234567890",
      part_name: "Oil filter",
      quantity: 2,
      current_stock_quantity: null,
      inventory_checked_on: null,
      purchase_price: 40.5,
      sale_price: 65,
      repair_code: "R-001",
      vehicle_id: 3,
      vehicle_label: "WX12345",
      unit_of_measure_id: 1,
      unit_of_measure_code: "pcs",
      invoice_name: "invoice.pdf",
      invoice_url: "/media/invoices/invoice.pdf",
      delivered: true,
      is_shop_consumable: false,
    } satisfies PurchaseEntry);
  });

  it("preserves approximate delivery and inventory check dates when API provides them", () => {
    const result = mapApiPurchaseToPurchaseEntry(
      purchase({
        approximate_delivery_date: "2026-01-10",
        current_stock_quantity: "12.75",
        inventory_checked_on: "2026-01-03",
      }),
    );

    expect(result.approximate_delivery_date).toBe("2026-01-10");
    expect(result.current_stock_quantity).toBe(12.75);
    expect(result.inventory_checked_on).toBe("2026-01-03");
  });

  it("falls back to an empty vehicle label when license plate is absent", () => {
    const result = mapApiPurchaseToPurchaseEntry(purchase({ vehicle: null, vehicle_license_plate: undefined }));

    expect(result.vehicle_id).toBeNull();
    expect(result.vehicle_label).toBe("");
  });

  it.each([
    ["false booleans", false, false, false, false],
    ["truthy non-boolean values", 1 as unknown as boolean, "yes" as unknown as boolean, true, true],
    ["falsy non-boolean values", 0 as unknown as boolean, "" as unknown as boolean, false, false],
  ])('normalizes %s for delivered and shop-consumable flags', (_name, delivered, isShopConsumable, expectedDelivered, expectedShopConsumable) => {
    const result = mapApiPurchaseToPurchaseEntry(
      purchase({ delivered, is_shop_consumable: isShopConsumable }),
    );

    expect(result.delivered).toBe(expectedDelivered);
    expect(result.is_shop_consumable).toBe(expectedShopConsumable);
  });
});
