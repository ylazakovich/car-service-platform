/**
 * Stable E2E fixture from `demo/demo_data.sql`:
 * completed repair TOR-1001 — AA 1234 BB • Toyota Camry, service below (unique among that plate’s completed jobs in demo).
 * CI loads this file after compose-up (`.github/workflows/pr.yml`). Locally: `bash scripts/load-demo.sh`.
 */
export const E2E_DEMO_REPAIR_TRACKING_CODE = "TOR-1001";

/** Substring of API `vehicle_label` for this repair (`{plate} • {make} {model}`) — stable in modal title. */
export const E2E_DEMO_REPAIR_VEHICLE_PLATE = "AA 1234 BB";

export const E2E_DEMO_REPAIR_SERVICE_NAME = "Oil change + filter replacement";

/** Kanban / list summary when demo repair has multiple `repair_service_lines` (first line + count). */
export const E2E_DEMO_REPAIR_KANBAN_SERVICES_SUMMARY = "Oil change + filter replacement +1";
