/**
 * Stable E2E fixture from `scripts/demo/demo_data.sql`:
 * completed repair TOR-1001 — AA 1234 BB • Toyota Camry, intentionally starts without a PDF.
 * CI loads this file after compose-up (`.github/workflows/pr.yml`). Locally: `bash scripts/db/load-demo.sh`.
 */
export const E2E_DEMO_REPAIR_TRACKING_CODE = "TOR-1001";

/**
 * Dedicated completed repair seeded with an initial `RepairDocument` by
 * `python manage.py seed_e2e_pdf_documents` so View PDF can be tested without
 * causing a POST export.
 */
export const E2E_DEMO_REPAIR_WITH_PDF_TRACKING_CODE = "TOR-2001";

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
 * `purchases.part_name` fragment from `scripts/demo/demo_data.sql` (vehicle `E2E_DEMO_REPAIR_VEHICLE_PLATE`, repair TOR-1001).
 */
export const E2E_DEMO_PURCHASE_PART_SUBSTRING = "Castrol EDGE";

/**
 * `python manage.py seed_e2e_pdf_documents` creates an initial PDF for `E2E_DEMO_REPAIR_WITH_PDF_TRACKING_CODE` only.
 * Vehicles registry shows `.vehicles-compact-row--needs-act` for any vehicle with a completed repair without a PDF.
 */
export const E2E_DEMO_VEHICLE_NEEDS_ACT_PLATE = E2E_DEMO_REPAIR_VEHICLE_PLATE;

/** `scripts/demo/demo_data.sql` — stable service name in catalog (Registers → Services). */
export const E2E_DEMO_SERVICE_NAME_IN_CATALOG = "AC service";

/** Demo customer with ≥1 vehicle (Registers → Customers with vehicles). */
export const E2E_DEMO_CUSTOMER_WITH_VEHICLES_NAME = "Oleksandr Kovalenko";
