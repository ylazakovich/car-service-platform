/**
 * Stable E2E fixture from `demo/demo_data.sql`:
 * completed repair TOR-1001 — AA 1234 BB • Toyota Camry, service below (unique among that plate’s completed jobs in demo).
 * CI loads this file after compose-up (`.github/workflows/pr.yml`). Locally: `bash scripts/load-demo.sh`.
 */
export const E2E_DEMO_REPAIR_TRACKING_CODE = "TOR-1001";

/** Substring of API `vehicle_label` for this repair (`{plate} • {make} {model}`) — stable in modal title. */
export const E2E_DEMO_REPAIR_VEHICLE_PLATE = "AA 1234 BB";

/**
 * Repair Update modal `aria-labelledby` → accessible name of `role="dialog"` (matches `get_vehicle_label` on backend).
 * Prefer this over `filter({ hasText: plate })` to avoid matching multiple dialogs / non-dialog nodes.
 */
export const E2E_DEMO_REPAIR_DIALOG_NAME = /AA 1234 BB\s*•\s*Toyota Camry/;

export const E2E_DEMO_REPAIR_SERVICE_NAME = "Oil change + filter replacement";

/** Kanban / list summary when demo repair has multiple `repair_service_lines` (first line + count). */
export const E2E_DEMO_REPAIR_KANBAN_SERVICES_SUMMARY = "Oil change + filter replacement +1";

/**
 * `purchases.part_name` fragment from `demo/demo_data.sql` (vehicle `E2E_DEMO_REPAIR_VEHICLE_PLATE`, repair TOR-1001).
 */
export const E2E_DEMO_PURCHASE_PART_SUBSTRING = "Castrol EDGE";

/**
 * Fresh demo DB has no `repair_documents` rows → completed repairs have `has_pdf: false`.
 * Vehicles registry shows `.vehicles-compact-row--needs-act` for any vehicle with such a repair.
 */
export const E2E_DEMO_VEHICLE_NEEDS_ACT_PLATE = E2E_DEMO_REPAIR_VEHICLE_PLATE;

/** `demo/demo_data.sql` — stable service name in catalog (Registers → Services). */
export const E2E_DEMO_SERVICE_NAME_IN_CATALOG = "AC service";

/** Demo customer with ≥1 vehicle (Registers → Customers with vehicles). */
export const E2E_DEMO_CUSTOMER_WITH_VEHICLES_NAME = "Oleksandr Kovalenko";
