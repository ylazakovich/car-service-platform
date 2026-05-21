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
