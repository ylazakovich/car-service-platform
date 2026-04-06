import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";
import * as allure from "allure-js-commons";
import { allureFeatureFromFrontendPath } from "./vitest.allure-helpers";

/** Staff shell unit tests expect desktop sidebar; jsdom viewport is narrow by default. */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

beforeEach(async (ctx) => {
  await allure.label("component", "frontend");
  await allure.epic("unit");
  const fp = ctx.task.file.filepath;
  await allure.feature(allureFeatureFromFrontendPath(fp));
});
