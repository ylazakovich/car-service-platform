/**
 * Figma Visual Collect — собирает bounding rects + computed styles для Figma импорта.
 * Генерирует: /output/desktop_http___localhost_4173_.json и mobile аналог.
 *
 * Запуск:
 *   cd frontend && npx playwright test e2e/figma-visual-collect.spec.ts --project=desktop-chrome
 *   cd frontend && npx playwright test e2e/figma-visual-collect.spec.ts --project=mobile-chrome
 */
import { test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { AUTH_STATE_ADMIN, openAdminApp } from "./fixtures/auth";
import { StaffMobileNavigationPage } from "./pages/StaffMobileNavigationPage";

const OUTPUT_DIR = resolve(process.cwd(), "../output");
mkdirSync(OUTPUT_DIR, { recursive: true });

type Section = "Dashboard" | "Vehicles" | "Repairs" | "Purchases" | "Registers" | "Users";
const SECTIONS: Section[] = ["Dashboard", "Vehicles", "Repairs", "Purchases", "Registers", "Users"];

interface VisualElement {
  tag: string;
  id?: string;
  classes?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  borderRadius?: number;
  opacity: number;
  section: string;
}

async function collectVisualElements(
  page: import("@playwright/test").Page,
  section: string,
): Promise<VisualElement[]> {
  return page.evaluate((sec) => {
    const results: Array<{
      tag: string;
      id?: string;
      classes?: string;
      text?: string;
      x: number;
      y: number;
      width: number;
      height: number;
      backgroundColor?: string;
      color?: string;
      fontSize?: number;
      fontWeight?: string;
      borderRadius?: number;
      opacity: number;
      section: string;
    }> = [];

    const elements = Array.from(document.querySelectorAll("*"));

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;

      const style = window.getComputedStyle(el);
      const opacity = parseFloat(style.opacity ?? "1");
      if (opacity === 0) continue;

      const bg = style.backgroundColor;
      const hasBackground = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
      const isLeaf = el.children.length === 0;
      const text = isLeaf ? el.textContent?.trim().slice(0, 200) : undefined;
      const hasMeaningfulContent = hasBackground || (text && text.length > 0);
      if (!hasMeaningfulContent) continue;

      const borderRadiusRaw = parseFloat(style.borderRadius ?? "0");
      const fontSizeRaw = parseFloat(style.fontSize ?? "0");

      results.push({
        tag: el.tagName.toLowerCase(),
        id: (el as HTMLElement).id || undefined,
        classes:
          typeof (el as HTMLElement).className === "string"
            ? ((el as HTMLElement).className.trim() || undefined)
            : undefined,
        text: text || undefined,
        x: Math.round(rect.left),
        y: Math.round(rect.top + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        backgroundColor: hasBackground ? bg : undefined,
        color: style.color || undefined,
        fontSize: fontSizeRaw > 0 ? fontSizeRaw : undefined,
        fontWeight: style.fontWeight || undefined,
        borderRadius: borderRadiusRaw > 0 ? borderRadiusRaw : undefined,
        opacity,
        section: sec,
      });
    }

    return results;
  }, section);
}

test.describe("Figma visual collect · all sections", () => {
  test.use({ storageState: AUTH_STATE_ADMIN });

  test("collect visual data", async ({ page }, testInfo) => {
    const prefix = testInfo.project.name.startsWith("mobile") ? "mobile" : "desktop";
    const allElements: VisualElement[] = [];

    for (const section of SECTIONS) {
      await openAdminApp(page);
      const nav = new StaffMobileNavigationPage(page);
      await nav.gotoStaffSection(section);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);

      const elements = await collectVisualElements(page, section);
      allElements.push(...elements);
      console.log(`  ${prefix} ${section}: ${elements.length} elements`);
    }

    const filename = resolve(OUTPUT_DIR, `${prefix}_http___localhost_4173_.json`);
    writeFileSync(filename, JSON.stringify(allElements, null, 2), "utf-8");
    console.log(`\n  ✓ Saved ${allElements.length} total elements → ${filename}`);
  });
});
