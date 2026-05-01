import type { ReactNode } from "react";

type RegistersHelpDisclosureProps = {
  children: ReactNode;
  /** Closed-state label (`<details>` summary). */
  summary?: string;
  className?: string;
};

/**
 * Collapsible Registers guidance — intended for narrow viewports only; parents should not render on desktop.
 */
export function RegistersHelpDisclosure({
  children,
  summary = "Section guide",
  className = "",
}: RegistersHelpDisclosureProps) {
  return (
    <details className={`registers-help-disclosure ${className}`.trim()}>
      <summary className="registers-help-disclosure-summary">{summary}</summary>
      <div className="registers-help-disclosure-body">{children}</div>
    </details>
  );
}
