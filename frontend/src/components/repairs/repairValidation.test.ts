import { describe, expect, it } from "vitest";
import {
  countRepairFieldErrors,
  firstRepairErrorFieldId,
  validateRepairCreateFields,
  validateRepairEditFields,
  type RepairFieldErrors,
} from "./repairValidation";
import type { RepairServiceLineDraft } from "../../features/staff/shared/repairs";

function line(name: string): RepairServiceLineDraft {
  return {
    key: `line-${name}`,
    persisted_id: null,
    name,
    catalog_service_id: null,
    catalog_service_price: "",
  };
}

describe("repair form validation helpers", () => {
  it.each([
    ["empty errors", {}, 0],
    ["one error", { vehicle: "Select a vehicle for this repair." }, 1],
    ["two errors", { vehicle: "Select a vehicle for this repair.", services: "Add at least one service." }, 2],
    ["three errors", { vehicle: "x", master: "y", services: "z" }, 3],
  ] satisfies Array<[string, RepairFieldErrors, number]>)('countRepairFieldErrors counts %s', (_name, errors, expected) => {
    expect(countRepairFieldErrors(errors)).toBe(expected);
  });

  it.each([
    ["vehicle has priority over master and services", { vehicle: "v", master: "m", services: "s" }, "repair-field-vehicle"],
    ["master has priority over services", { master: "m", services: "s" }, "repair-field-master"],
    ["services is returned when it is the only error", { services: "s" }, "repair-field-services"],
    ["empty errors return null", {}, null],
    ["owner-only errors are not focusable in repair modal", { owner: "o" }, null],
  ] satisfies Array<[string, RepairFieldErrors, string | null]>)('firstRepairErrorFieldId returns %s', (_name, errors, expected) => {
    expect(firstRepairErrorFieldId(errors)).toBe(expected);
  });

  it.each([
    ["vehicle and at least one service", { vehicleId: "12", masterId: "", serviceLines: [line("Oil change")] }, {}],
    ["vehicle and service with surrounding whitespace", { vehicleId: "12", masterId: "", serviceLines: [line("  Diagnostics  ")] }, {}],
    ["vehicle and one named service after blank rows", { vehicleId: "12", masterId: "", serviceLines: [line(""), line("  "), line("Brakes")] }, {}],
    ["missing vehicle", { vehicleId: "", masterId: "", serviceLines: [line("Oil change")] }, { vehicle: "Select a vehicle for this repair." }],
    ["missing service lines", { vehicleId: "12", masterId: "", serviceLines: [] }, { services: "Add at least one service." }],
    ["blank service names", { vehicleId: "12", masterId: "", serviceLines: [line(""), line("   ")] }, { services: "Add at least one service." }],
    ["missing vehicle and services", { vehicleId: "", masterId: "", serviceLines: [line("   ")] }, { vehicle: "Select a vehicle for this repair.", services: "Add at least one service." }],
    ["master is not required while creating a draft", { vehicleId: "12", masterId: "", serviceLines: [line("Tires")] }, {}],
  ])('validateRepairCreateFields handles %s', (_name, input, expected) => {
    expect(validateRepairCreateFields(input)).toEqual(expected);
  });

  it.each([
    ["new status without master when services are not editable", { masterId: "", status: "new", serviceLines: [], canEditServices: false }, {}],
    ["waiting_parts without master when services are not editable", { masterId: "", status: "waiting_parts", serviceLines: [], canEditServices: false }, {}],
    ["in_progress with master and locked services", { masterId: "7", status: "in_progress", serviceLines: [], canEditServices: false }, {}],
    ["completed with master and named service", { masterId: "7", status: "completed", serviceLines: [line("Inspection")], canEditServices: true }, {}],
    ["picked_up with master and whitespace-trimmed service", { masterId: "7", status: "picked_up", serviceLines: [line("  Pickup prep  ")], canEditServices: true }, {}],
    ["in_progress missing master", { masterId: "", status: "in_progress", serviceLines: [line("Oil")], canEditServices: false }, { master: "Assign a master before moving to this status." }],
    ["completed missing master", { masterId: "", status: "completed", serviceLines: [line("Oil")], canEditServices: false }, { master: "Assign a master before moving to this status." }],
    ["picked_up missing master", { masterId: "", status: "picked_up", serviceLines: [line("Oil")], canEditServices: false }, { master: "Assign a master before moving to this status." }],
    ["editable services require a non-blank row", { masterId: "7", status: "new", serviceLines: [line(""), line("  ")], canEditServices: true }, { services: "Add at least one service." }],
    ["editable services and status gate can report both errors", { masterId: "", status: "completed", serviceLines: [line("  ")], canEditServices: true }, { master: "Assign a master before moving to this status.", services: "Add at least one service." }],
    ["locked services do not require service rows", { masterId: "7", status: "completed", serviceLines: [], canEditServices: false }, {}],
  ])('validateRepairEditFields handles %s', (_name, input, expected) => {
    expect(validateRepairEditFields(input)).toEqual(expected);
  });
});
