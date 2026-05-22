import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
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

/**
 * Render a repairs modal dialog shell with header, optional meta/status, form body, validation banner, and footer.
 *
 * The component displays a titled modal with an optional status autotag or metadata, shows a validation banner when
 * there are field errors, and renders action controls via the footer. It also wires keyboard shortcuts while the
 * modal is focused: `Cmd/Ctrl+Enter` triggers submission when available and not locked/saving; `Escape` invokes
 * `onEscape` if provided, otherwise `onClose`.
 *
 * @param mode - Either `"create"` or `"edit"`, determines footer action availability
 * @param title - Visible modal title
 * @param meta - Optional metadata node shown in the header when `showStatusAutotag` is false
 * @param mobile - Whether to render mobile-optimized modal styles
 * @param locked - When true, disables editing actions and switches footer to locked-only actions
 * @param errors - Field error object used to compute and display the validation banner
 * @param saving - Whether a save operation is in progress; disables submit controls and shows saving state
 * @param kebab - Optional actions node rendered in the header actions area
 * @param footerLayout - Footer layout mode, `"right"` or `"split"`
 * @param showStatusAutotag - When true, shows the status autotag in the header instead of `meta`
 * @param primaryLabel - Label for the primary submit button
 * @param savingLabel - Label to show on the primary button while saving
 * @param onClose - Called to close the modal (also used for the Cancel action)
 * @param onEscape - Optional handler invoked on `Escape` key; if absent `onClose` is used
 * @param onSubmit - Optional submit handler invoked from the form or Cmd/Ctrl+Enter
 * @param onDelete - Optional destructive delete handler shown in edit mode when not locked
 * @param onReopen - Optional handler to reopen a locked repair
 * @param onPickUp - Optional handler to mark a repair as picked up (locked-only action)
 * @param onUndoPickUp - Optional handler to undo a pickup (locked-only action)
 * @param children - Form/body content to render inside the modal
 * @returns A JSX element representing the repairs modal dialog
 */
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
  const modalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!modalRef.current?.contains(event.target as Node)) {
        return;
      }
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
    if (!onSubmit || locked || saving) {
      return;
    }
    onSubmit();
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
        ref={modalRef}
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

/**
 * Render the modal footer with action buttons and layout-specific placement.
 *
 * Renders a cancel button, an optional primary submit button (hidden when `locked` or `onSubmit` is not provided, disabled and showing `savingLabel` with a spinner when `saving`), and other conditional actions: a destructive Delete (when `mode === "edit"`, not `locked`, and `onDelete` is provided), Reopen / Pick Up / Undo Pickup (when `locked` and the corresponding handler is provided). The visual arrangement follows `layout` ("right" or "split") and shows a keyboard save hint when not `locked`.
 *
 * @param mode - Either "create" or "edit"; determines whether the destructive Delete button is eligible.
 * @param layout - Footer layout, `"right"` places actions on the right cluster, `"split"` separates destructive/hint area from the primary cluster.
 * @param locked - When true, hides the primary submit and shows locked-only actions (reopen, pick up, undo pickup) instead of the save hint.
 * @param saving - When true, disables the primary submit, adds `data-saving="true"`, shows a spinner, and swaps the primary label to `savingLabel`.
 * @param primaryLabel - Label for the primary submit button when not saving.
 * @param savingLabel - Label for the primary submit button while `saving` is true.
 * @param onCancel - Callback invoked when the Cancel button is clicked.
 * @param onDelete - Optional callback invoked by the destructive Delete button.
 * @param onReopen - Optional callback invoked by the Reopen repair button (shown only when `locked`).
 * @param onPickUp - Optional callback invoked by the Mark as Picked Up button (shown only when `locked`).
 * @param onUndoPickUp - Optional callback invoked by the Undo Pickup button (shown only when `locked`).
 * @param onSubmit - Optional submit handler; when provided and `locked` is false, a `<button type="submit">` primary action is rendered.
 * @returns The footer JSX element containing the arranged action buttons and optional hint.
 */
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

/**
 * Render a definition list of metadata key/value pairs.
 *
 * @param items - Array of `[label, value]` tuples to render; `label` is shown as the term (`<dt>`) and `value` as the description (`<dd>`).
 * @returns A `<dl>` element containing the provided metadata as rows.
 */
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

/**
 * Displays a client portal URL with a Copy button and an optional Regenerate control.
 *
 * @param portalUrl - The URL string shown to the user.
 * @param onCopy - Callback invoked when the Copy button is clicked.
 * @param onRegenerate - Optional callback invoked when the Regenerate button is clicked.
 * @param showRegenerate - When true and `onRegenerate` is provided, shows the Regenerate button.
 * @param disabled - When true, hides action controls (Copy and Regenerate).
 * @returns A JSX element that renders the portal URL and its action controls.
 */
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
