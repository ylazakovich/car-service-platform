import { REPAIR_KANBAN_COLUMNS, type RepairStatus } from "../../features/staff/shared/repairs";

type StatusSwitcherProps = {
  value: RepairStatus;
  layout?: "row" | "grid";
  disabled?: boolean;
  onChange: (next: RepairStatus) => void;
};

/**
 * Render a group of buttons for switching between repair statuses defined by `REPAIR_KANBAN_COLUMNS`.
 *
 * @param value - The currently selected `RepairStatus` to mark as active.
 * @param layout - Layout mode, either `"row"` or `"grid"`. When `"row"`, directional arrows are rendered between buttons and the container receives a row-specific class.
 * @param disabled - If truthy, disables all buttons.
 * @param onChange - Callback invoked with the selected `RepairStatus` when a button is clicked.
 * @returns A JSX element containing the status switcher UI.
 */
export function StatusSwitcher({ value, layout = "row", disabled, onChange }: StatusSwitcherProps) {
  const opts = REPAIR_KANBAN_COLUMNS;
  const activeIdx = opts.findIndex((o) => o.status === value);
  const isRow = layout === "row";

  return (
    <div className={`status-switcher status-switcher--${layout}`} role="group" aria-label="Repair status">
      {opts.map((o, i) => (
        <span key={o.status} style={{ display: "contents" }}>
          <button
            type="button"
            className={`status-switcher__btn status-switcher__btn--${o.status} ${value === o.status ? "is-active" : ""}`}
            aria-pressed={value === o.status}
            disabled={disabled}
            onClick={() => onChange(o.status)}
          >
            <span className="status-switcher__dot" aria-hidden />
            <span>{o.label}</span>
          </button>
          {isRow && i < opts.length - 1 ? (
            <span
              aria-hidden
              className={`status-switcher__arrow ${i === activeIdx ? "is-next" : ""} ${i < activeIdx ? "is-past" : ""}`}
            >
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 3l5 5-5 5" />
              </svg>
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
