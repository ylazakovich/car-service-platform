import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { RepairIcon } from "./repairIcons";
import { FieldRow, SectionHead } from "./FieldRow";
import { StatusAutotag } from "./StatusAutotag";
import { countRepairFieldErrors, type RepairFieldErrors } from "./repairValidation";

export type RepairModalFooterLayout = "right" | "split";

export function RequiredChips({ fields }: { fields: string[] }) {
  if (fields.length === 0) return null;
  return (
    <div className="modal-footer__required-chips">
      {fields.map((field) => (
        <span key={field} className="modal-footer__required-chip">
          <span className="modal-footer__required-chip__dot" aria-hidden />
          {field}
        </span>
      ))}
    </div>
  );
}

type RepairModalShellProps = {
  mode: "create" | "edit";
  title: string;
  meta?: ReactNode;
  mobile?: boolean;
  locked?: boolean;
  errors?: RepairFieldErrors;
  saving?: boolean;
  isSubmitDisabled?: boolean;
  missingFields?: string[];
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
 * Render the repairs modal dialog shell containing header, form body, validation banner, and footer.
 *
 * Renders a titled, accessible dialog with optional status or meta in the header, a form body that shows a
 * validation banner when field errors are present, and a footer with action controls based on `mode`, `locked`,
 * and `footerLayout`. While mounted, global keyboard handlers invoke `onEscape` (or `onClose` if `onEscape` is absent)
 * for Escape, and invoke `onSubmit` for Cmd/Ctrl+Enter only when the key event originates from inside the dialog
 * and when `locked` and `saving` are both false.
 *
 * @param mode - "create" or "edit"; controls which footer actions are available
 * @param title - Visible modal title
 * @param meta - Optional header metadata node displayed when `showStatusAutotag` is false
 * @param mobile - If true, applies mobile-specific modal styling
 * @param locked - If true, disables editing actions and enables locked-only footer actions
 * @param errors - Field error object used to compute and display the validation banner
 * @param saving - If true, disables submit controls and shows saving state in the footer
 * @param kebab - Optional header actions node (kebab menu)
 * @param footerLayout - "right" or "split" layout for footer arrangement
 * @param showStatusAutotag - When true, shows the status autotag in the header instead of `meta`
 * @param primaryLabel - Label for the primary submit button
 * @param savingLabel - Label for the primary button while `saving` is true
 * @param onClose - Called to close the modal (also used for the Cancel action)
 * @param onEscape - Optional handler invoked on Escape; if absent `onClose` is used
 * @param onSubmit - Optional submit handler invoked from the form or Cmd/Ctrl+Enter
 * @param onDelete - Optional destructive delete handler (edit mode, unlocked)
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
  isSubmitDisabled,
  missingFields,
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
    /**
     * Handle global keyboard shortcuts for the modal.
     *
     * Pressing Escape prevents default and closes the modal by calling `onEscape()` if provided, otherwise `onClose()`. This Escape handling runs regardless of where the event originated.
     *
     * When the event originates from inside the modal, pressing Cmd/Ctrl + Enter prevents default and invokes `onSubmit()` only if `onSubmit` exists and the modal is not `locked` and not `saving`.
     *
     * @param event - The keyboard event received from the window keydown listener
     */
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (onEscape) {
          onEscape();
        } else {
          onClose();
        }
        return;
      }
      if (!modalRef.current?.contains(event.target as Node)) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && onSubmit && !locked && !saving) {
        event.preventDefault();
        onSubmit();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onEscape, onSubmit, locked, saving]);

  /**
   * Handle the form's submit event: prevent the browser's default submission and call the configured `onSubmit` callback when submission is allowed.
   *
   * Submission is invoked only when `onSubmit` exists and neither `locked` nor `saving` are true.
   *
   * @param event - The form submit event
   */
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
            isSubmitDisabled={isSubmitDisabled}
            missingFields={missingFields}
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
  isSubmitDisabled?: boolean;
  missingFields?: string[];
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
  isSubmitDisabled,
  missingFields,
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
      <button
        type="submit"
        className="button"
        data-saving={saving ? "true" : undefined}
        disabled={saving || isSubmitDisabled}
      >
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

  const chips = !locked && isSubmitDisabled && missingFields && missingFields.length > 0
    ? <RequiredChips fields={missingFields} />
    : null;

  const kbdHint = !locked && !isSubmitDisabled ? (
    <span className="modal-footer__hint"><kbd>⌘</kbd><kbd>↵</kbd> to save</span>
  ) : null;

  const leftSlot = chips ?? kbdHint;

  if (layout === "split") {
    return (
      <div className="modal-footer modal-footer--split">
        <div>{destructive ?? (locked ? <span /> : leftSlot)}</div>
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
      {destructive ? <div style={{ marginRight: "auto" }}>{destructive}</div> : !locked ? leftSlot : null}
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
