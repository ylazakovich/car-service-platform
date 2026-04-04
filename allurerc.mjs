/**
 * Allure Report 3 — подхватывается CLI как allurerc.* в корне репозитория.
 * https://allurereport.org/docs/v3/configure/
 * CI: variables из artifacts/allure-variables.json (write-allure-environment.sh; .properties из results не кладём — иначе дубль Metadata/Variables).
 * Сводный отчёт по нескольким CI-джобам: `allure generate` принимает одну папку results; отдельной команды «merge jobs» нет — см. scripts/ci/merge-allure-result-dirs.sh + report.yml.
 * Environments: лейбл component=frontend|backend (см. frontend/vitest.setup.ts, backend/conftest.py).
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
    /* нет файла или битый JSON — отчёт всё равно соберётся */
  }
  return {};
}

export default {
  name: "car-service-platform",
  output: "./allure-report",
  variables: loadVariables(),
  environments: {
    frontend: {
      matcher: ({ labels }) =>
        labels.some(
          ({ name, value }) => name === "component" && value === "frontend",
        ),
      variables: {
        "Test suite": "Vitest (unit)",
      },
    },
    backend: {
      matcher: ({ labels }) =>
        labels.some(
          ({ name, value }) => name === "component" && value === "backend",
        ),
      variables: {
        "Test suite": "pytest (API)",
      },
    },
  },
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
