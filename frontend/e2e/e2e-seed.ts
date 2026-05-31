/**
 * Shared demo fixture values for the default Datafaker seed/profile.
 * Prefer isolated API fixtures for new E2E tests; these values are legacy shared defaults.
 * Locally load with `bash scripts/db/load-datafaker-demo.sh` or `bash scripts/db/load-demo.sh`.
 */
export const E2E_DEMO_REPAIR_TRACKING_CODE = "DFR-004";

/** Substring of API `vehicle_label` for this repair (`{plate} • {make} {model}`) — stable in modal title. */
export const E2E_DEMO_REPAIR_VEHICLE_PLATE = "DF 10003";

/**
 * Repair Update modal `aria-labelledby` → accessible name of `role="dialog"` (matches `get_vehicle_label` on backend).
 * Prefer this over `filter({ hasText: plate })` to avoid matching multiple dialogs / non-dialog nodes.
 */
export const E2E_DEMO_REPAIR_DIALOG_NAME = /DF 10003\s*•\s*Volvo Focus/;

export const E2E_DEMO_REPAIR_SERVICE_NAME = "Suspension diagnostics";

/** Kanban / list summary for the default Datafaker completed repair. */
export const E2E_DEMO_REPAIR_KANBAN_SERVICES_SUMMARY = "Suspension diagnostics";

/**
 * `purchases.part_name` fragment from the generated Datafaker payload (vehicle `E2E_DEMO_REPAIR_VEHICLE_PLATE`, repair `E2E_DEMO_REPAIR_TRACKING_CODE`).
 */
export const E2E_DEMO_PURCHASE_PART_SUBSTRING = "Battery 70Ah";

/**
 * Fresh demo DB has no `repair_documents` rows → completed repairs have `has_pdf: false`.
 * Vehicles registry shows `.vehicles-compact-row--needs-act` for any vehicle with such a repair.
 */
export const E2E_DEMO_VEHICLE_NEEDS_ACT_PLATE = E2E_DEMO_REPAIR_VEHICLE_PLATE;

/** Generated Datafaker service name in catalog (Registers → Services). */
export const E2E_DEMO_SERVICE_NAME_IN_CATALOG = "AC service";

/** Demo customer with ≥1 vehicle. */
export const E2E_DEMO_CUSTOMER_WITH_VEHICLES_NAME = "Kermit Cassin";
