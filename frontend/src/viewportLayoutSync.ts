/**
 * Pinch-zoom / page zoom: visual viewport can become wider than the layout viewport.
 * Without stretching the document, fixed backgrounds show as “gutters” (often on the right).
 * Keeps `--layout-sync-min-width` on <html> = max(layout client width, visual viewport width).
 */
export function installViewportLayoutSync(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const root = document.documentElement;
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
  vv?.addEventListener("resize", onFrame);
  vv?.addEventListener("scroll", onFrame);
}
