import { RepairIcon } from "./repairIcons";

type ConfirmDeleteModalProps = {
  trackingCode: string;
  vehicleLabel: string;
  ownerName: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  trackingCode,
  vehicleLabel,
  ownerName,
  busy,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <div className="modal-overlay repair-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-modal__head">
          <span className="confirm-modal__icon">
            <RepairIcon name="trash" size={18} />
          </span>
          <div className="confirm-modal__titles">
            <div className="confirm-modal__title" id="confirm-delete-title">
              Delete this repair?
            </div>
            <div className="confirm-modal__sub">
              This will permanently remove the repair card, its services and any client link. Completed acts will be
              kept in the archive.
            </div>
          </div>
        </div>
        <dl className="confirm-modal__what">
          <dt>ID</dt>
          <dd>{trackingCode}</dd>
          <dt>Vehicle</dt>
          <dd>{vehicleLabel}</dd>
          <dt>Owner</dt>
          <dd>{ownerName}</dd>
        </dl>
        <div className="confirm-modal__actions">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="button-danger-solid" onClick={onConfirm} disabled={busy}>
            <RepairIcon name="trash" size={14} />
            Delete repair
          </button>
        </div>
      </div>
    </div>
  );
}
