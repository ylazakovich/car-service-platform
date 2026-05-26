import type { ReactNode } from "react";
import { RepairIcon } from "./repairIcons";

type FieldRowProps = {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
  htmlFor?: string;
  children: ReactNode;
};

/**
 * Renders a labeled form row that displays a label, its children, and either an error message or a hint.
 *
 * The component adds modifier classes when `required`, `error`, or `fullWidth` are truthy. When both `error`
 * and `htmlFor` are provided, the error element receives an `id` of `${htmlFor}-error` and has `role="alert"`.
 *
 * @param label - Optional label text shown at the start of the row
 * @param hint - Optional hint text displayed when there is no error
 * @param error - Optional error text; when present it overrides `hint` and is announced with `role="alert"`
 * @param required - When true, adds a required modifier class to the row
 * @param fullWidth - When true, applies the full-width grid modifier class
 * @param htmlFor - Associates the label with a control by id; used to compute the error element id when `error` is present
 * @param children - The control(s) rendered inside the row
 * @returns A label element wrapping the provided content and contextual hint or error
 */
export function FieldRow({ label, hint, error, required, fullWidth, htmlFor, children }: FieldRowProps) {
  const cls = ["field-row"];
  if (required) {
    cls.push("field-row--required");
  }
  if (error) {
    cls.push("field-row--error");
  }
  if (fullWidth) {
    cls.push("field-grid--full");
  }

  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <label className={cls.join(" ")} htmlFor={htmlFor}>
      {label ? <span className="field-row__label">{label}</span> : null}
      {children}
      {error ? (
        <span className="field-row__error" id={errorId} role="alert">
          <RepairIcon name="info" size={12} />
          {error}
        </span>
      ) : hint ? (
        <span className="field-row__hint">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * Render a section header with a label and an optional right-side node or hint.
 *
 * @param label - The visible section title.
 * @param hint - Short secondary text shown on the right when `right` is not provided.
 * @param right - A React node rendered on the right side; if present it replaces the `hint`.
 * @returns The header element for a field section.
 */
export function SectionHead({
  label,
  hint,
  right,
}: {
  label: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="field-section__head">
      <span className="field-section__label">{label}</span>
      {right ?? (hint ? <span className="field-section__hint">{hint}</span> : null)}
    </div>
  );
}
