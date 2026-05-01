import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REGISTERS_MOBILE_BREAKPOINT, useMediaQuery } from "./useMediaQuery";

describe("useMediaQuery", () => {
  const changeHandlers: Array<() => void> = [];
  let matchesState = false;

  beforeEach(() => {
    changeHandlers.length = 0;
    matchesState = false;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        get media() {
          return query;
        },
        get matches() {
          return matchesState;
        },
        addEventListener: (_: string, handler: () => void) => {
          changeHandlers.push(handler);
        },
        removeEventListener: (_: string, handler: () => void) => {
          const i = changeHandlers.indexOf(handler);
          if (i >= 0) changeHandlers.splice(i, 1);
        },
        addListener: (handler: () => void) => {
          changeHandlers.push(handler);
        },
        removeListener: (handler: () => void) => {
          const i = changeHandlers.indexOf(handler);
          if (i >= 0) changeHandlers.splice(i, 1);
        },
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initial match state from matchMedia", () => {
    matchesState = true;
    const { result } = renderHook(() => useMediaQuery(REGISTERS_MOBILE_BREAKPOINT));
    expect(result.current).toBe(true);
  });

  it("updates when the media query change event fires", () => {
    matchesState = false;
    const { result } = renderHook(() => useMediaQuery(REGISTERS_MOBILE_BREAKPOINT));
    expect(result.current).toBe(false);

    act(() => {
      matchesState = true;
      changeHandlers.forEach((h) => h());
    });

    expect(result.current).toBe(true);
  });
});
