import { describe, expect, it } from "vitest";
import {
  formatRepairCardDateRow,
  formatRepairDisplayDate,
  formatRepairServicesSummary,
  getLastRecordedOdometerFromRepairs,
  getRepairStatusClass,
  initials,
  masterTint,
  newRepairServiceLineDraft,
  parseVehicleProfileMileageKm,
  repairStatusLabel,
  type RepairEntry,
  type RepairStatus,
} from "./repairs";

function repair(overrides: Partial<RepairEntry> = {}): RepairEntry {
  return {
    id: 1,
    created_at: "2026-01-02T10:30:00Z",
    updated_at: "2026-01-02T10:30:00Z",
    completed_at: "",
    vehicle_id: 10,
    vehicle_label: "Toyota Corolla",
    vehicle_plate: "WX12345",
    vehicle_model: "Corolla",
    vehicle_year: 2018,
    mileage: null,
    owner_name: "Jan Kowalski",
    master_id: null,
    master_name: null,
    started_at: null,
    service_name: "Fallback service",
    service_lines: [],
    issue_notes: "",
    repair_notes: [],
    status: "new",
    mileage_at_service: null,
    tracking_code: "R-001",
    portal_token: "token",
    has_pdf: false,
    latest_act_document_total: null,
    estimated_date: "",
    before_photos: [],
    during_photos: [],
    after_photos: [],
    position: null,
    ...overrides,
  };
}

describe("repair shared presentation helpers", () => {
  it.each([
    ["new", "New"],
    ["in_progress", "In Progress"],
    ["waiting_parts", "Waiting for Parts"],
    ["completed", "Completed"],
    ["picked_up", "Picked Up"],
  ] satisfies Array<[RepairStatus, string]>)('repairStatusLabel maps %s', (status, expected) => {
    expect(repairStatusLabel(status)).toBe(expected);
  });

  it.each([
    ["new", "repair-status-chip repair-status-new"],
    ["in_progress", "repair-status-chip repair-status-in_progress"],
    ["waiting_parts", "repair-status-chip repair-status-waiting_parts"],
    ["completed", "repair-status-chip repair-status-completed"],
    ["picked_up", "repair-status-chip repair-status-picked_up"],
  ] satisfies Array<[RepairStatus, string]>)('getRepairStatusClass maps %s', (status, expected) => {
    expect(getRepairStatusClass(status)).toBe(expected);
  });

  it.each([
    ["2026-01-02", "02-01-2026"],
    ["2026-01-02T10:30:00Z", "02-01-2026 10:30"],
    ["2026-01-02 08:05", "02-01-2026 08:05"],
    [" 2026-12-31T23:59:59Z ", "31-12-2026 23:59"],
    ["2026-07-04T09:15+02:00", "04-07-2026 09:15"],
    ["not-a-date", "not-a-date"],
    ["2026/01/02", "2026/01/02"],
    ["", ""],
  ])('formatRepairDisplayDate handles %s', (value, expected) => {
    expect(formatRepairDisplayDate(value)).toBe(expected);
  });

  it.each([
    ["uses service_name fallback when there are no structured lines", repair({ service_name: "Legacy text", service_lines: [] }), "Legacy text"],
    ["uses dash when fallback service_name is blank", repair({ service_name: "   ", service_lines: [] }), "—"],
    ["ignores blank structured lines and uses fallback", repair({ service_name: "Fallback", service_lines: [{ id: null, name: "   ", catalog_service_id: null, sort_order: 1 }] }), "Fallback"],
    ["returns a single structured service name", repair({ service_lines: [{ id: 1, name: "Oil", catalog_service_id: null, sort_order: 1 }] }), "Oil"],
    ["summarizes two structured services", repair({ service_lines: [{ id: 1, name: "Oil", catalog_service_id: null, sort_order: 1 }, { id: 2, name: "Brakes", catalog_service_id: null, sort_order: 2 }] }), "Oil +1"],
    ["summarizes three structured services", repair({ service_lines: [{ id: 1, name: "Oil", catalog_service_id: null, sort_order: 1 }, { id: 2, name: "Brakes", catalog_service_id: null, sort_order: 2 }, { id: 3, name: "Tires", catalog_service_id: null, sort_order: 3 }] }), "Oil +2"],
  ])('formatRepairServicesSummary %s', (_name, input, expected) => {
    expect(formatRepairServicesSummary(input)).toBe(expected);
  });

  it.each([
    ["new status shows created only", repair({ status: "new", completed_at: "2026-01-03T12:00:00Z" }), ["Created 02-01-2026 10:30"]],
    ["in_progress status shows created only", repair({ status: "in_progress", completed_at: "2026-01-03T12:00:00Z" }), ["Created 02-01-2026 10:30"]],
    ["waiting_parts status shows created only", repair({ status: "waiting_parts", completed_at: "2026-01-03T12:00:00Z" }), ["Created 02-01-2026 10:30"]],
    ["completed status includes completion date", repair({ status: "completed", completed_at: "2026-01-03T12:00:00Z" }), ["Created 02-01-2026 10:30", "Completed 03-01-2026 12:00"]],
    ["picked_up status includes completion date", repair({ status: "picked_up", completed_at: "2026-01-03" }), ["Created 02-01-2026 10:30", "Completed 03-01-2026"]],
    ["completed status without completion date shows created only", repair({ status: "completed", completed_at: "" }), ["Created 02-01-2026 10:30"]],
  ])('formatRepairCardDateRow %s', (_name, input, expected) => {
    expect(formatRepairCardDateRow(input)).toEqual(expected);
  });

  it.each([
    ["empty string", "", null],
    ["undefined", undefined, null],
    ["whitespace", "   ", null],
    ["simple digits", "12345", 12345],
    ["spaces are ignored", "12 345", 12345],
    ["commas are ignored", "123,456", 123456],
    ["spaces and commas are ignored together", "1 234,567", 1234567],
    ["letters are rejected", "12a45", null],
    ["decimal point is rejected", "123.45", null],
    ["minus sign is rejected", "-123", null],
    ["zero is accepted", "0", 0],
  ] satisfies Array<[string, string | undefined, number | null]>)('parseVehicleProfileMileageKm handles %s', (_name, raw, expected) => {
    expect(parseVehicleProfileMileageKm(raw)).toBe(expected);
  });

  it.each([
    ["null", null, "?"],
    ["undefined", undefined, "?"],
    ["single word", "Ola", "O"],
    ["two words", "Jan Kowalski", "JK"],
    ["more than two words", "Jan Adam Kowalski", "JA"],
    ["lowercase words", "jan kowalski", "JK"],
    ["leading whitespace", "  Jan Kowalski", "JK"],
  ] satisfies Array<[string, string | null | undefined, string]>)('initials handles %s', (_name, name, expected) => {
    expect(initials(name)).toBe(expected);
  });

  it.each([
    ["null master", null, {}],
    ["undefined master", undefined, {}],
    ["empty master", "", {}],
    ["numeric string master", "2", { background: "hsl(94 45% 28%)", color: "hsl(94 60% 80%)" }],
    ["number master", 3, { background: "hsl(141 45% 28%)", color: "hsl(141 60% 80%)" }],
    ["wraps hue at 360", 8, { background: "hsl(16 45% 28%)", color: "hsl(16 60% 80%)" }],
  ])('masterTint handles %s', (_name, masterId, expected) => {
    expect(masterTint(masterId)).toEqual(expected);
  });

  it("newRepairServiceLineDraft creates a blank local-only row", () => {
    const draft = newRepairServiceLineDraft();

    expect(draft.key).toEqual(expect.any(String));
    expect(draft.key.length).toBeGreaterThan(0);
    expect(draft).toMatchObject({
      persisted_id: null,
      name: "",
      catalog_service_id: null,
      catalog_service_price: "",
    });
  });

  it.each([
    ["returns null when vehicle has no repair with odometer", [repair({ vehicle_id: 10, mileage_at_service: null })], 10, null],
    ["ignores other vehicles", [repair({ vehicle_id: 11, mileage_at_service: 90000, tracking_code: "OTHER" })], 10, null],
    ["returns the only matching odometer", [repair({ vehicle_id: 10, mileage_at_service: 12345, tracking_code: "R-123" })], 10, { km: 12345, tracking_code: "R-123" }],
    ["prefers latest completed date", [repair({ id: 1, completed_at: "2026-01-02", mileage_at_service: 100, tracking_code: "OLD" }), repair({ id: 2, completed_at: "2026-01-03", mileage_at_service: 200, tracking_code: "NEW" })], 10, { km: 200, tracking_code: "NEW" }],
    ["falls back to created date", [repair({ id: 1, created_at: "2026-01-05", completed_at: "", mileage_at_service: 100, tracking_code: "NEW" }), repair({ id: 2, created_at: "2026-01-04", completed_at: "", mileage_at_service: 200, tracking_code: "OLD" })], 10, { km: 100, tracking_code: "NEW" }],
    ["uses id as tie-breaker for same date", [repair({ id: 1, completed_at: "2026-01-03", mileage_at_service: 100, tracking_code: "LOW" }), repair({ id: 2, completed_at: "2026-01-03", mileage_at_service: 200, tracking_code: "HIGH" })], 10, { km: 200, tracking_code: "HIGH" }],
  ] satisfies Array<[string, RepairEntry[], number, { km: number; tracking_code: string } | null]>)('getLastRecordedOdometerFromRepairs %s', (_name, repairs, vehicleId, expected) => {
    expect(getLastRecordedOdometerFromRepairs(repairs, vehicleId)).toEqual(expected);
  });
});
