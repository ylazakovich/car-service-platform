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

export function ConfirmReopenModal({
  trackingCode,
  vehicleLabel,
  completedAt,
  busy,
  onCancel,
  onConfirm,
}: ConfirmReopenModalProps) {
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
