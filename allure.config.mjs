/**
 * Allure Report 3 — used by `npx allure generate` from repo root.
 * https://allurereport.org/docs/v3/configure/ — top-level `variables` show build metadata in the awesome UI.
 * CI writes artifacts/allure-variables.json (next to allure-results/) via scripts/ci/write-allure-environment.sh
 */
import fs from "node:fs";
import path from "node:path";

const varsFile =
  process.env.ALLURE_VARIABLES_JSON ||
  path.join(process.cwd(), "artifacts/allure-variables.json");

function loadVariables() {
  try {
    const raw = fs.readFileSync(varsFile, "utf8");
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, String(v)]),
      );
    }
  } catch {
    /* missing or invalid — report still generates */
  }
  return {};
}

export default {
  name: "car-service-platform",
  output: "./allure-report",
  variables: loadVariables(),
  plugins: {
    awesome: {
      options: {
        reportName: "car-service-platform",
        singleFile: false,
        reportLanguage: "en",
        groupBy: ["epic", "feature", "story"],
      },
    },
  },
};
