import { useEffect, useId, type FormEvent, type ReactNode } from "react";
import { RepairIcon } from "./repairIcons";
import { FieldRow, SectionHead } from "./FieldRow";
import { StatusAutotag } from "./StatusAutotag";
import { countRepairFieldErrors, type RepairFieldErrors } from "./repairValidation";

export type RepairModalFooterLayout = "right" | "split";

type RepairModalShellProps = {
  mode: "create" | "edit";
  title: string;
  meta?: ReactNode;
  mobile?: boolean;
  locked?: boolean;
  errors?: RepairFieldErrors;
  saving?: boolean;
  kebab?: ReactNode;
  footerLayout: RepairModalFooterLayout;
  showStatusAutotag?: boolean;
  primaryLabel: string;
  savingLabel: string;
  onClose: () => void;
  onEscape?: () => void;
  onSubmit?: () => void;
  onDelete?: () => void;
  onReopen?: () => void;
  onPickUp?: () => void;
  onUndoPickUp?: () => void;
  children: ReactNode;
};

export function RepairModalShell({
  mode,
  title,
  meta,
  mobile,
  locked,
  errors,
  saving,
  kebab,
  footerLayout,
  showStatusAutotag,
  primaryLabel,
  savingLabel,
  onClose,
  onEscape,
  onSubmit,
  onDelete,
  onReopen,
  onPickUp,
  onUndoPickUp,
  children,
}: RepairModalShellProps) {
  const formId = useId();
  const errorCount = errors ? countRepairFieldErrors(errors) : 0;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && onSubmit && !locked && !saving) {
        event.preventDefault();
        onSubmit();
      }
      if (event.key === "Escape") {
        if (onEscape) {
          onEscape();
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, onEscape, onSubmit, locked, saving]);

  function handleFormSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit?.();
  }

  const modalClass = [
    "modal",
    "modal--md",
    mobile ? "modal--mobile" : "",
    locked ? "modal--locked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="modal-overlay repair-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className={modalClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header__titles">
            <span className="modal-header__eyebrow">Repairs</span>
            <h2 className="modal-header__title" id={`${formId}-title`}>
              {title}
            </h2>
            {showStatusAutotag ? (
              <div className="modal-header__meta">
                <StatusAutotag />
              </div>
            ) : meta ? (
              <div className="modal-header__meta">{meta}</div>
            ) : null}
          </div>
          <div className="modal-header__actions">
            {kebab}
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <RepairIcon name="x" />
            </button>
          </div>
        </div>

        <form id={formId} className="modal-form" onSubmit={handleFormSubmit}>
          <div className="modal-body">
            {errorCount > 0 ? (
              <div className="validation-banner" role="alert">
                <RepairIcon name="info" size={14} />
                {errorCount} required field{errorCount > 1 ? "s" : ""} need attention before saving.
              </div>
            ) : null}
            {children}
          </div>

          <RepairModalFooter
            mode={mode}
            layout={footerLayout}
            locked={locked}
            saving={saving}
            primaryLabel={primaryLabel}
            savingLabel={savingLabel}
            onCancel={onClose}
            onDelete={onDelete}
            onReopen={onReopen}
            onPickUp={onPickUp}
            onUndoPickUp={onUndoPickUp}
            onSubmit={onSubmit}
          />
        </form>
      </section>
    </div>
  );
}

type RepairModalFooterProps = {
  mode: "create" | "edit";
  layout: RepairModalFooterLayout;
  locked?: boolean;
  saving?: boolean;
  primaryLabel: string;
  savingLabel: string;
  onCancel: () => void;
  onDelete?: () => void;
  onReopen?: () => void;
  onPickUp?: () => void;
  onUndoPickUp?: () => void;
  onSubmit?: () => void;
};

function RepairModalFooter({
  mode,
  layout,
  locked,
  saving,
  primaryLabel,
  savingLabel,
  onCancel,
  onDelete,
  onReopen,
  onPickUp,
  onUndoPickUp,
  onSubmit,
}: RepairModalFooterProps) {
  const primary =
    locked || !onSubmit ? null : (
      <button type="submit" className="button" data-saving={saving ? "true" : undefined} disabled={saving}>
        {saving ? <span className="button__spinner" aria-hidden /> : null}
        {saving ? savingLabel : primaryLabel}
      </button>
    );

  const cancel = (
    <button type="button" className="button button-secondary" onClick={onCancel}>
      Cancel
    </button>
  );

  const destructive =
    mode === "edit" && !locked && onDelete ? (
      <button
        type="button"
        className="button button-secondary"
        style={{ color: "var(--danger)", borderColor: "rgba(224, 82, 82, 0.28)" }}
        onClick={onDelete}
      >
        <RepairIcon name="trash" size={14} />
        Delete
      </button>
    ) : null;

  const reopen =
    locked && onReopen ? (
      <button type="button" className="button" onClick={onReopen}>
        Reopen repair
      </button>
    ) : null;

  const pickUp =
    locked && onPickUp ? (
      <button type="button" className="button" onClick={onPickUp}>
        Mark as Picked Up
      </button>
    ) : null;

  const undoPickUp =
    locked && onUndoPickUp ? (
      <button type="button" className="button button-secondary" onClick={onUndoPickUp}>
        Undo Pickup
      </button>
    ) : null;

  const hint = !locked ? (
    <span className="modal-footer__hint">
      <kbd>⌘</kbd>
      <kbd>↵</kbd> to save
    </span>
  ) : null;

  if (layout === "split") {
    return (
      <div className="modal-footer modal-footer--split">
        <div>{destructive ?? (locked ? <span /> : hint)}</div>
        <div className="modal-footer__primary-cluster">
          {cancel}
          {undoPickUp}
          {reopen}
          {pickUp}
          {primary}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-footer modal-footer--right">
      {destructive ? <div style={{ marginRight: "auto" }}>{destructive}</div> : !locked ? hint : null}
      <div className="modal-footer__primary-cluster">
        {cancel}
        {undoPickUp}
        {reopen}
        {pickUp}
        {primary}
      </div>
    </div>
  );
}

export function MetaList({ items }: { items: [string, string][] }) {
  return (
    <dl className="meta-list">
      {items.map(([key, value]) => (
        <div className="meta-list__row" key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ClientLinkRow({
  portalUrl,
  onCopy,
  onRegenerate,
  showRegenerate,
  disabled,
}: {
  portalUrl: string;
  onCopy: () => void;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="client-link">
      <code className="client-link__url">{portalUrl}</code>
      {!disabled ? (
        <div className="client-link__actions">
          <button type="button" className="button button-secondary button-sm" onClick={onCopy}>
            Copy
          </button>
          {showRegenerate && onRegenerate ? (
            <button
              type="button"
              className="button button-ghost button-sm"
              aria-label="Regenerate client portal link"
              onClick={onRegenerate}
            >
              Regenerate
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { FieldRow, SectionHead };
