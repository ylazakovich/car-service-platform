/**
 * Pure helper for mobile swipe navigation hints (section order is caller-defined).
 */
export function getSwipeNavNeighborLabels<T extends string>(
  sections: readonly T[],
  active: T,
  labels: Record<T, string>
): { prevLabel: string | null; nextLabel: string | null } {
  const idx = sections.indexOf(active);
  if (idx < 0) {
    return { prevLabel: null, nextLabel: null };
  }
  return {
    prevLabel: idx > 0 ? labels[sections[idx - 1] as T] ?? null : null,
    nextLabel: idx < sections.length - 1 ? labels[sections[idx + 1] as T] ?? null : null,
  };
}
