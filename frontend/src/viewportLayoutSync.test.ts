import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installViewportLayoutSync } from "./viewportLayoutSync";

describe("installViewportLayoutSync", () => {
  let cleanup: () => void;
  const originalVv = Object.getOwnPropertyDescriptor(window, "visualViewport");
  const originalRaf = window.requestAnimationFrame;

  beforeEach(() => {
    document.documentElement.style.removeProperty("--layout-sync-min-width");
  });

  afterEach(() => {
    cleanup?.();
    cleanup = () => {};
    if (originalVv) {
      Object.defineProperty(window, "visualViewport", originalVv);
    } else {
      delete (window as unknown as { visualViewport?: unknown }).visualViewport;
    }
    window.requestAnimationFrame = originalRaf;
    vi.restoreAllMocks();
  });

  it("sets --layout-sync-min-width to max(documentElement.clientWidth, ceil(visualViewport.width))", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        width: 480.7,
        height: 700,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    cleanup = installViewportLayoutSync();

    expect(document.documentElement.style.getPropertyValue("--layout-sync-min-width")).toBe("481px");
  });

  it("clears the CSS variable when visualViewport is absent after resize", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        width: 390,
        height: 800,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    cleanup = installViewportLayoutSync();
    expect(document.documentElement.style.getPropertyValue("--layout-sync-min-width")).toBe("390px");

    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: undefined,
    });

    window.dispatchEvent(new Event("resize"));

    expect(document.documentElement.style.getPropertyValue("--layout-sync-min-width")).toBe("");
  });

  it("teardown removes listeners and clears the CSS variable", () => {
    Object.defineProperty(document.documentElement, "clientWidth", {
      configurable: true,
      value: 400,
    });
    const vv = {
      width: 500,
      height: 800,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: vv,
    });

    const removeWindow = vi.spyOn(window, "removeEventListener");

    cleanup = installViewportLayoutSync();
    expect(document.documentElement.style.getPropertyValue("--layout-sync-min-width")).toBe("500px");

    cleanup();
    cleanup = () => {};

    expect(removeWindow).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(vv.removeEventListener).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(vv.removeEventListener).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(document.documentElement.style.getPropertyValue("--layout-sync-min-width")).toBe("");
  });
});
