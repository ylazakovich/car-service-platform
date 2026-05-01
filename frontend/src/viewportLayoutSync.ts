/**
 * Pinch-zoom / page zoom: visual viewport can become wider than the layout viewport.
 * Without stretching the document, fixed backgrounds show as “gutters” (often on the right).
 * Keeps `--layout-sync-min-width` on <html> = max(layout client width, visual viewport width).
 */
/** Keeps layout width in sync with pinch-zoom; returns teardown for tests / HMR. */
export function installViewportLayoutSync(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  const root = document.documentElement;
  const vvInitial = window.visualViewport;
  let vv = window.visualViewport;

  const sync = () => {
    vv = window.visualViewport;
    if (!vv) {
      root.style.removeProperty("--layout-sync-min-width");
      return;
    }
    const layoutW = root.clientWidth;
    const visualW = Math.ceil(vv.width);
    const next = Math.max(layoutW, visualW);
    root.style.setProperty("--layout-sync-min-width", `${next}px`);
  };

  const onFrame = () => {
    window.requestAnimationFrame(sync);
  };

  sync();
  window.addEventListener("resize", onFrame);
  vvInitial?.addEventListener("resize", onFrame);
  vvInitial?.addEventListener("scroll", onFrame);

  return () => {
    window.removeEventListener("resize", onFrame);
    vvInitial?.removeEventListener("resize", onFrame);
    vvInitial?.removeEventListener("scroll", onFrame);
    root.style.removeProperty("--layout-sync-min-width");
  };
}
