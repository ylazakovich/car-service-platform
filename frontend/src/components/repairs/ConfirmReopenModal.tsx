import { useEffect } from "react";
import { formatRepairDisplayDate } from "../../features/staff/shared/repairs";
import { RepairIcon } from "./repairIcons";

type ConfirmReopenModalProps = {
  trackingCode: string;
  vehicleLabel: string;
  completedAt: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Render a confirmation modal prompting the user to reopen a completed repair.
 *
 * The modal shows the repair ID, vehicle label, and completion timestamp; when `busy` is true,
 * action buttons are disabled and the Escape key will not cancel the modal.
 *
 * @param trackingCode - Repair tracking identifier displayed as "ID"
 * @param vehicleLabel - Human-readable vehicle label displayed as "Vehicle"
 * @param completedAt - Completion timestamp; shows "—" when falsy
 * @param busy - When true, disables action buttons and prevents Escape-key cancellation
 * @param onCancel - Called when the overlay or Cancel button is clicked (or when Escape is pressed and not `busy`)
 * @param onConfirm - Called when the "Reopen repair" button is clicked
 * @returns The React element for the confirmation modal
 */
export function ConfirmReopenModal({
  trackingCode,
  vehicleLabel,
  completedAt,
  busy,
  onCancel,
  onConfirm,
}: ConfirmReopenModalProps) {
  useEffect(() => {
    /**
     * Handle Escape key presses to cancel the modal when it is not busy.
     *
     * @param event - The KeyboardEvent from the keydown listener; if the key is `"Escape"` and the modal is not busy, this prevents default behavior, stops immediate propagation, and invokes `onCancel`.
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || busy) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      onCancel();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [busy, onCancel]);

  return (
    <div className="modal-overlay repair-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-reopen-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-modal__head">
          <span
            className="confirm-modal__icon"
            style={{ background: "rgba(240, 168, 74, 0.18)", color: "var(--warning)" }}
          >
            <RepairIcon name="edit" size={18} />
          </span>
          <div className="confirm-modal__titles">
            <div className="confirm-modal__title" id="confirm-reopen-title">
              Reopen this repair?
            </div>
            <div className="confirm-modal__sub">
              The card will move back to In Progress. The completion timestamp is preserved and visible in the audit
              log.
            </div>
          </div>
        </div>
        <dl className="confirm-modal__what">
          <dt>ID</dt>
          <dd>{trackingCode}</dd>
          <dt>Vehicle</dt>
          <dd>{vehicleLabel}</dd>
          <dt>Completed</dt>
          <dd>{completedAt ? formatRepairDisplayDate(completedAt) : "—"}</dd>
        </dl>
        <div className="confirm-modal__actions">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="button" onClick={onConfirm} disabled={busy}>
            <RepairIcon name="edit" size={14} />
            Reopen repair
          </button>
        </div>
      </div>
    </div>
  );
}
