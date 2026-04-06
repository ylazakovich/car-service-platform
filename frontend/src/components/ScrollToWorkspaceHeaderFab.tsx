import { useCallback, useEffect, useState, type RefObject } from "react";

/** Считаем «у дна», если до конца документа не больше столько px. */
const BOTTOM_THRESHOLD_PX = 72;

function getScrollRoot(): HTMLElement {
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** Прокрутка страницы в начало (sticky-шапка + scrollIntoView часто не двигают документ). */
function scrollPageToTop(behavior: ScrollBehavior) {
  const root = getScrollRoot();
  root.scrollTo({ top: 0, left: 0, behavior });
  window.scrollTo({ top: 0, left: 0, behavior });
  if (behavior === "auto") {
    root.scrollTop = 0;
    document.body.scrollTop = 0;
  }
}

type ScrollToWorkspaceHeaderFabProps = {
  /** Обычно mobile shell (≤820px). */
  active: boolean;
  /** Не показывать поверх открытого drawer меню. */
  pickerOpen: boolean;
  /** Для фокуса на кнопке меню после прокрутки. */
  headerRef: RefObject<HTMLElement | null>;
  /** Для пересчёта при смене секции / высоты контента. */
  layoutRootRef: RefObject<HTMLElement | null>;
};

/**
 * Плавающая кнопка «в шапку»: видна только у нижнего края viewport,
 * когда страница реально прокручивается (есть запас по высоте).
 */
export function ScrollToWorkspaceHeaderFab({
  active,
  pickerOpen,
  headerRef,
  layoutRootRef,
}: ScrollToWorkspaceHeaderFabProps) {
  const [visible, setVisible] = useState(false);

  const computeVisible = useCallback(() => {
    if (!active || pickerOpen) {
      return false;
    }
    const root = getScrollRoot();
    const scrollHeight = root.scrollHeight;
    const clientHeight = root.clientHeight;
    if (scrollHeight <= clientHeight + BOTTOM_THRESHOLD_PX) {
      return false;
    }
    const y = root.scrollTop;
    return y + clientHeight >= scrollHeight - BOTTOM_THRESHOLD_PX;
  }, [active, pickerOpen]);

  const sync = useCallback(() => {
    setVisible(computeVisible());
  }, [computeVisible]);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return undefined;
    }
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    document.addEventListener("scroll", sync, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", sync);
      document.removeEventListener("scroll", sync, true);
    };
  }, [active, sync]);

  useEffect(() => {
    if (!active) return undefined;
    const root = layoutRootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => sync());
    ro.observe(root);
    return () => ro.disconnect();
  }, [active, layoutRootRef, sync]);

  const handleClick = () => {
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";

    scrollPageToTop(behavior);

    window.setTimeout(
      () => {
        const toggle = headerRef.current?.querySelector<HTMLButtonElement>(".shell-mobile-header-toggle");
        toggle?.focus({ preventScroll: true });
      },
      reduce ? 0 : 500,
    );
  };

  if (!active || !visible) {
    return null;
  }

  return (
    <button
      type="button"
      className="shell-scroll-to-header-fab"
      onClick={handleClick}
      aria-label="Jump to top of page and focus workspace menu"
    >
      <span className="shell-scroll-to-header-fab-label">Jump to top</span>
    </button>
  );
}
