import { test, type Page } from "@playwright/test";

export type E2eCustomerVehicleFixture = {
  customerId: number;
  vehicleId: number;
  customerName: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
};

export type E2ePurchaseFixture = {
  purchaseId: number;
  supplierId?: number;
  partName: string;
};

export type E2eUnitFixture = {
  id: number;
  code: string;
};

export type E2eServiceFixture = {
  id: number;
  name: string;
};

function uniqueSuffix() {
  return `${test.info().workerIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function uniquePlate(prefix: string, suffix: string) {
  const cleanPrefix = prefix.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase().padEnd(2, "X");
  const cleanSuffix = suffix.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase();
  return `${cleanPrefix} ${cleanSuffix}`;
}

export async function createE2eUnit(page: Page, codePrefix = "e2e"): Promise<E2eUnitFixture> {
  const suffix = uniqueSuffix();
  return page.evaluate(
    async ({ codePrefixValue, suffixValue }) => {
      const token = document.cookie.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith("csrftoken="))?.split("=")[1];
      const code = `${codePrefixValue}-${suffixValue}`.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);
      const response = await fetch("/api/purchases/units/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { "X-CSRFToken": token } : {}) },
        body: JSON.stringify({ code, name: `E2E Unit ${suffixValue}`, is_active: true }),
      });
      if (!response.ok) throw new Error(`POST /api/purchases/units/ failed: ${response.status} ${await response.text()}`);
      const unit = (await response.json()) as { id: number; code: string };
      return { id: unit.id, code: unit.code };
    },
    { codePrefixValue: codePrefix, suffixValue: suffix },
  );
}

export async function createE2eService(page: Page, namePrefix = "E2E service"): Promise<E2eServiceFixture> {
  const suffix = uniqueSuffix();
  return page.evaluate(
    async ({ namePrefixValue, suffixValue }) => {
      const token = document.cookie.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith("csrftoken="))?.split("=")[1];
      const name = `${namePrefixValue} ${suffixValue}`;
      const response = await fetch("/api/services/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { "X-CSRFToken": token } : {}) },
        body: JSON.stringify({ name, description: `Created by E2E ${suffixValue}`, price: "123.45", is_active: true }),
      });
      if (!response.ok) throw new Error(`POST /api/services/ failed: ${response.status} ${await response.text()}`);
      const service = (await response.json()) as { id: number; name: string };
      return { id: service.id, name: service.name };
    },
    { namePrefixValue: namePrefix, suffixValue: suffix },
  );
}

export async function createE2eCustomer(page: Page, markerPrefix = "customer"): Promise<{ customerId: number; customerName: string }> {
  const suffix = uniqueSuffix();
  return page.evaluate(
    async ({ markerPrefixValue, suffixValue }) => {
      const customerName = `E2E ${markerPrefixValue} ${suffixValue}`;
      const token = document.cookie.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith("csrftoken="))?.split("=")[1];
      const headers = { "Content-Type": "application/json", ...(token ? { "X-CSRFToken": token } : {}) };
      const response = await fetch("/api/customers/", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          full_name: customerName,
          phone: `+48 600 ${String(Date.now()).slice(-6)}`,
          email: "",
          notes: "E2E customer",
        }),
      });
      if (!response.ok) throw new Error(`POST /api/customers/ failed: ${response.status} ${await response.text()}`);
      const customer = (await response.json()) as { id: number; full_name: string };
      return { customerId: customer.id, customerName: customer.full_name };
    },
    { markerPrefixValue: markerPrefix, suffixValue: suffix },
  );
}

export async function createE2eCustomerWithVehicle(page: Page, markerPrefix = "registry-e2e"): Promise<E2eCustomerVehicleFixture> {
  const suffix = uniqueSuffix();
  const plate = uniquePlate(markerPrefix, suffix);
  return page.evaluate(
    async ({ markerPrefixValue, plateValue, suffixValue }) => {
      const token = document.cookie.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith("csrftoken="))?.split("=")[1];
      const headers = { "Content-Type": "application/json", ...(token ? { "X-CSRFToken": token } : {}) };
      const customerName = `E2E ${markerPrefixValue} ${suffixValue}`;
      const customerResponse = await fetch("/api/customers/", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          full_name: customerName,
          phone: `+1555${plateValue.replace(/\D/g, "").padEnd(8, "0").slice(0, 8)}`,
          email: `${plateValue.replace(/\s+/g, "").toLowerCase()}@example.test`,
          notes: `Created by E2E ${suffixValue}`,
        }),
      });
      if (!customerResponse.ok) throw new Error(`POST /api/customers/ failed: ${customerResponse.status} ${await customerResponse.text()}`);
      const customer = (await customerResponse.json()) as { id: number };
      const vehicleResponse = await fetch("/api/vehicles/", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({
          customer_id: customer.id,
          license_plate: plateValue,
          make: "E2E",
          model: "Registry",
          year: 2024,
          vin: `VIN${plateValue.replace(/\s+/g, "")}${Date.now()}`.slice(0, 17),
          color: "Blue",
          mileage: 12345,
          notes: `Created by E2E ${suffixValue}`,
        }),
      });
      if (!vehicleResponse.ok) throw new Error(`POST /api/vehicles/ failed: ${vehicleResponse.status} ${await vehicleResponse.text()}`);
      const vehicle = (await vehicleResponse.json()) as { id: number; license_plate: string; make: string; model: string };
      return {
        customerId: customer.id,
        vehicleId: vehicle.id,
        customerName,
        vehiclePlate: vehicle.license_plate,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
      };
    },
    { markerPrefixValue: markerPrefix, plateValue: plate, suffixValue: suffix },
  );
}

export async function createE2ePurchase(
  page: Page,
  options: {
    partPrefix?: string;
    vehicleId?: number | null;
    repairCode?: string;
    unitId?: number;
    delivered?: boolean;
    isShopConsumable?: boolean;
    currentStockQuantity?: string | null;
    inventoryCheckedOn?: string | null;
  } = {},
): Promise<E2ePurchaseFixture> {
  const suffix = uniqueSuffix();
  const partName = `${options.partPrefix ?? "E2E Castrol EDGE"} ${suffix}`;
  return page.evaluate(
    async ({ optionsValue, partNameValue, suffixValue }) => {
      const token = document.cookie.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith("csrftoken="))?.split("=")[1];
      const response = await fetch("/api/purchases/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(token ? { "X-CSRFToken": token } : {}) },
        body: JSON.stringify({
          order_date: new Date().toISOString().slice(0, 10),
          supplier_name: `E2E Supplier ${suffixValue}`,
          vehicle_id: optionsValue.vehicleId ?? null,
          unit_of_measure_id: optionsValue.unitId,
          part_name: partNameValue,
          quantity: "2.00",
          purchase_price: "40.00",
          sale_price: "99.50",
          repair_code: optionsValue.repairCode ?? "",
          invoice_name: `E2E Invoice ${suffixValue}`,
          delivered: optionsValue.delivered ?? true,
          is_shop_consumable: optionsValue.isShopConsumable ?? false,
          current_stock_quantity: optionsValue.currentStockQuantity,
          inventory_checked_on: optionsValue.inventoryCheckedOn,
        }),
      });
      if (!response.ok) throw new Error(`POST /api/purchases/ failed: ${response.status} ${await response.text()}`);
      const purchase = (await response.json()) as { id: number; supplier?: { id: number }; part_name: string };
      return { purchaseId: purchase.id, supplierId: purchase.supplier?.id, partName: purchase.part_name };
    },
    { optionsValue: options, partNameValue: partName, suffixValue: suffix },
  );
}

export async function cleanupRepairsByIssueMarker(page: Page, marker: string): Promise<void> {
  await page.evaluate(async ({ markerValue }) => {
    const token = document.cookie.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith("csrftoken="))?.split("=")[1];
    const headers: Record<string, string> = token ? { "X-CSRFToken": token } : {};
    const response = await fetch("/api/repairs/?page_size=1000", { credentials: "include" });
    if (!response.ok) return;
    const payload = await response.json();
    const repairs = Array.isArray(payload) ? payload : (payload.results ?? []);
    for (const repair of repairs) {
      const haystack = `${repair.issue_description ?? ""} ${repair.issue_notes ?? ""} ${repair.description ?? ""}`;
      if (haystack.includes(markerValue)) {
        const deleteResponse = await fetch(`/api/repairs/${repair.id}`, { method: "DELETE", credentials: "include", headers });
        if (!deleteResponse.ok) {
          throw new Error(`DELETE /api/repairs/${repair.id} failed: ${deleteResponse.status} ${await deleteResponse.text()}`);
        }
      }
    }
  }, { markerValue: marker });
}

export async function cleanupE2eData(
  page: Page,
  ids: { purchaseIds?: number[]; serviceIds?: number[]; unitIds?: number[]; vehicleIds?: number[]; customerIds?: number[] },
) {
  await page.evaluate(async ({ idsValue }) => {
    const token = document.cookie.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith("csrftoken="))?.split("=")[1];
    const headers: Record<string, string> = token ? { "X-CSRFToken": token } : {};
    const del = async (url: string) => {
      const response = await fetch(url, { method: "DELETE", credentials: "include", headers });
      if (!response.ok && response.status !== 404) throw new Error(`DELETE ${url} failed: ${response.status} ${await response.text()}`);
    };
    for (const id of idsValue.purchaseIds ?? []) await del(`/api/purchases/${id}`);
    for (const id of idsValue.serviceIds ?? []) await del(`/api/services/${id}`);
    for (const id of idsValue.vehicleIds ?? []) await del(`/api/vehicles/${id}`);
    for (const id of idsValue.customerIds ?? []) await del(`/api/customers/${id}`);
    for (const id of idsValue.unitIds ?? []) await del(`/api/purchases/units/${id}`);
  }, { idsValue: ids });
}
