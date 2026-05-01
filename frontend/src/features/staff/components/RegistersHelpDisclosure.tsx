import type { ReactNode } from "react";

type RegistersHelpDisclosureProps = {
  children: ReactNode;
  /** Closed-state label (tap to expand full guidance). */
  summary?: string;
  className?: string;
};

/**
 * Collapsible guidance for Registers subsections — keeps screens short; full copy on demand.
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
