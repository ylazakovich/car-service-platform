/**
 * Render a static status label indicating a repair will be created with the "New" status.
 *
 * The label includes a decorative dot (marked `aria-hidden`) followed by the text "Will be created as · New".
 *
 * @returns A JSX element containing the status label with a decorative dot and the text `Will be created as · New`.
 */
export function StatusAutotag() {
  return (
    <span className="status-autotag" title="New repairs default to New">
      <span className="status-autotag__dot" aria-hidden />
      Will be created as · New
    </span>
  );
}
