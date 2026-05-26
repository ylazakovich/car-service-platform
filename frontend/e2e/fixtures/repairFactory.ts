import { test, type Page } from "@playwright/test";

export type IsolatedRepairFixture = {
  customerId: number;
  vehicleId: number;
  repairId: number;
  trackingCode: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
};

export type IsolatedRepairOptions = {
  markerPrefix: string;
  status?: "new" | "in_progress" | "waiting_parts" | "completed" | "picked_up" | "cancelled";
  assignMaster?: boolean;
  completedAt?: string | null;
  serviceName?: string;
  servicePrice?: string;
  serviceLines?: Array<{ name: string; catalog_service_id?: number | null; catalog_service_price?: string; sort_order?: number }>;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  mileage?: number;
};

function todayIsoDate() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function buildUniqueSuffix() {
  return `${test.info().workerIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildPlate(markerPrefix: string, suffix: string) {
  const prefix = markerPrefix
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
  const normalized = suffix.replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase();
  return `${prefix} ${normalized}`;
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createIsolatedRepair(page: Page, options: IsolatedRepairOptions): Promise<IsolatedRepairFixture> {
  const suffix = buildUniqueSuffix();
  const plate = buildPlate(options.markerPrefix, suffix);
  const marker = `${options.markerPrefix} · ${test.info().title} · ${suffix}`;
  const status = options.status ?? "completed";
  const assignMaster = options.assignMaster ?? ["in_progress", "completed", "picked_up"].includes(status);
  const completedAt = options.completedAt === undefined ? (status === "completed" || status === "picked_up" ? todayIsoDate() : null) : options.completedAt;
  const serviceName = options.serviceName ?? options.serviceLines?.[0]?.name ?? `${options.markerPrefix} isolation service`;
  const servicePrice = options.servicePrice ?? "100.00";
  const serviceLines = options.serviceLines ?? [
    { name: serviceName, catalog_service_id: null, catalog_service_price: servicePrice, sort_order: 0 },
  ];
  const vehicleMake = options.vehicleMake ?? "E2E";
  const vehicleModel = options.vehicleModel ?? "Isolation";
  const vehicleYear = options.vehicleYear ?? 2024;
  const mileage = options.mileage ?? 123456;

  return page.evaluate(
    async ({ assignMasterValue, completedAtValue, markerText, mileageValue, plateValue, serviceLinesValue, serviceNameValue, statusValue, vehicleMakeValue, vehicleModelValue, vehicleYearValue }) => {
      type ApiCustomer = { id: number };
      type ApiVehicle = { id: number; license_plate: string; make: string; model: string };
      type ApiRepair = { id: number; tracking_code: string };

      const token = document.cookie
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith("csrftoken="))
        ?.split("=")[1];
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { "X-CSRFToken": token } : {}),
      };
      const jsonFetch = async <T,>(url: string, init: RequestInit): Promise<T> => {
        const response = await fetch(url, {
          credentials: "include",
          ...init,
          headers: {
            ...headers,
            ...(init.headers ?? {}),
          },
        });
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`${init.method ?? "GET"} ${url} failed: ${response.status} ${body}`);
        }
        return (await response.json()) as T;
      };
      const cleanupCustomerAndVehicle = async (customerId: number, vehicleId: number | null): Promise<void> => {
        if (vehicleId) {
          await fetch(`/api/vehicles/${vehicleId}`, { method: "DELETE", credentials: "include", headers });
        }
        await fetch(`/api/customers/${customerId}`, { method: "DELETE", credentials: "include", headers });
      };

      const me = assignMasterValue ? await jsonFetch<{ id: number }>("/api/auth/me", { method: "GET" }) : null;
      const customer = await jsonFetch<ApiCustomer>("/api/customers/", {
        method: "POST",
        body: JSON.stringify({
          full_name: `E2E ${plateValue}`,
          phone: `+1555${plateValue.replace(/\D/g, "").padEnd(8, "0").slice(0, 8)}`,
          email: `${plateValue.replace(/\s+/g, "").toLowerCase()}@example.test`,
          notes: markerText,
        }),
      });
      let vehicle: ApiVehicle;
      try {
        vehicle = await jsonFetch<ApiVehicle>("/api/vehicles/", {
          method: "POST",
          body: JSON.stringify({
            customer_id: customer.id,
            license_plate: plateValue,
            make: vehicleMakeValue,
            model: vehicleModelValue,
            year: vehicleYearValue,
            vin: `VIN${plateValue.replace(/\s+/g, "")}${Date.now()}`.slice(0, 17),
            color: "Blue",
            notes: markerText,
            mileage: mileageValue,
            added_date: completedAtValue ?? undefined,
          }),
        });
      } catch (error) {
        await cleanupCustomerAndVehicle(customer.id, null).catch(() => {});
        throw error;
      }
      let repair: ApiRepair;
      try {
        repair = await jsonFetch<ApiRepair>("/api/repairs/", {
          method: "POST",
          body: JSON.stringify({
            vehicle_id: vehicle.id,
            ...(me ? { master_id: me.id } : {}),
            service_name: serviceNameValue,
            service_lines: serviceLinesValue,
            issue_notes: markerText,
            status: statusValue,
            ...(completedAtValue ? { completed_at: completedAtValue } : {}),
            mileage_at_service: mileageValue,
          }),
        });
      } catch (error) {
        await cleanupCustomerAndVehicle(customer.id, vehicle.id).catch(() => {});
        throw error;
      }

      return {
        customerId: customer.id,
        vehicleId: vehicle.id,
        repairId: repair.id,
        trackingCode: repair.tracking_code,
        vehiclePlate: vehicle.license_plate,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
      };
    },
    {
      assignMasterValue: assignMaster,
      completedAtValue: completedAt,
      markerText: marker,
      mileageValue: mileage,
      plateValue: plate,
      serviceLinesValue: serviceLines,
      serviceNameValue: serviceName,
      statusValue: status,
      vehicleMakeValue: vehicleMake,
      vehicleModelValue: vehicleModel,
      vehicleYearValue: vehicleYear,
    },
  );
}

export async function cleanupIsolatedRepair(page: Page, fixture: IsolatedRepairFixture) {
  await page.evaluate(async ({ customerId, repairId, vehicleId }) => {
    const token = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("csrftoken="))
      ?.split("=")[1];
    const headers: Record<string, string> = token ? { "X-CSRFToken": token } : {};
    const deleteIfExists = async (url: string) => {
      const response = await fetch(url, { method: "DELETE", credentials: "include", headers });
      if (!response.ok && response.status !== 404) {
        const body = await response.text().catch(() => "");
        throw new Error(`DELETE ${url} failed: ${response.status} ${body}`);
      }
    };

    await deleteIfExists(`/api/repairs/${repairId}`);
    await deleteIfExists(`/api/vehicles/${vehicleId}`);
    await deleteIfExists(`/api/customers/${customerId}`);
  }, fixture);
}
