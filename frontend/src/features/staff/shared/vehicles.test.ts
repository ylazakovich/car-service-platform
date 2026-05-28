import { describe, expect, it } from "vitest";
import {
  formatVehicleDisplayDate,
  formatVehicleMeta,
  formatVehicleTitle,
  type Vehicle,
  type VehicleUiDetails,
} from "./vehicles";

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 1,
    customer: { id: 10, full_name: "Jan Kowalski" },
    license_plate: "WX12345",
    make: "Toyota",
    model: "Corolla",
    year: 2018,
    vin: "VIN123",
    color: "Blue",
    notes: "",
    ...overrides,
  };
}

function details(overrides: Partial<VehicleUiDetails> = {}): VehicleUiDetails {
  return {
    mileage: "123000",
    last_service_date: "2026-01-02",
    added_date: "2025-12-15T09:20:00Z",
    ...overrides,
  };
}

describe("vehicle shared presentation helpers", () => {
  it.each([
    ["2026-01-02", "02-01-2026"],
    ["2026-01-02T10:30:00Z", "02-01-2026 10:30"],
    ["2026-01-02 08:05", "02-01-2026 08:05"],
    [" 2026-12-31T23:59:59Z ", "31-12-2026 23:59"],
    ["2026-07-04T09:15+02:00", "04-07-2026 09:15"],
    ["not-a-date", "not-a-date"],
    ["2026/01/02", "2026/01/02"],
    ["", ""],
  ])('formatVehicleDisplayDate handles %s', (value, expected) => {
    expect(formatVehicleDisplayDate(value)).toBe(expected);
  });

  it.each([
    ["make model and year", vehicle(), "Toyota Corolla, 2018"],
    ["make model without year", vehicle({ year: null }), "Toyota Corolla"],
    ["empty make is preserved", vehicle({ make: "", model: "Focus", year: 2020 }), " Focus, 2020"],
    ["empty model is preserved", vehicle({ make: "Ford", model: "", year: 2020 }), "Ford , 2020"],
  ])('formatVehicleTitle handles %s', (_name, input, expected) => {
    expect(formatVehicleTitle(input)).toBe(expected);
  });

  it.each([
    [
      "full metadata",
      vehicle(),
      details(),
      ["Mileage: 123000 km", "Last Service: 02-01-2026", "Added: 15-12-2025 09:20", "VIN: VIN123", "Color: Blue"],
    ],
    ["omits empty mileage", vehicle(), details({ mileage: "" }), ["Last Service: 02-01-2026", "Added: 15-12-2025 09:20", "VIN: VIN123", "Color: Blue"]],
    ["omits empty last service date", vehicle(), details({ last_service_date: "" }), ["Mileage: 123000 km", "Added: 15-12-2025 09:20", "VIN: VIN123", "Color: Blue"]],
    ["omits empty added date", vehicle(), details({ added_date: "" }), ["Mileage: 123000 km", "Last Service: 02-01-2026", "VIN: VIN123", "Color: Blue"]],
    ["omits empty vin", vehicle({ vin: "" }), details(), ["Mileage: 123000 km", "Last Service: 02-01-2026", "Added: 15-12-2025 09:20", "Color: Blue"]],
    ["omits empty color", vehicle({ color: "" }), details(), ["Mileage: 123000 km", "Last Service: 02-01-2026", "Added: 15-12-2025 09:20", "VIN: VIN123"]],
    ["returns empty list when every optional field is blank", vehicle({ vin: "", color: "" }), details({ mileage: "", last_service_date: "", added_date: "" }), []],
    ["formats datetime values in service rows", vehicle(), details({ last_service_date: "2026-02-03T04:05:00Z", added_date: "2026-03-04 05:06" }), ["Mileage: 123000 km", "Last Service: 03-02-2026 04:05", "Added: 04-03-2026 05:06", "VIN: VIN123", "Color: Blue"]],
  ] satisfies Array<[string, Vehicle, VehicleUiDetails, string[]]>)('formatVehicleMeta %s', (_name, inputVehicle, inputDetails, expected) => {
    expect(formatVehicleMeta(inputVehicle, inputDetails)).toEqual(expected);
  });
});
