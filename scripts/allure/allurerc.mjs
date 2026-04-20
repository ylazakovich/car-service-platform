/**
 * Allure Report 3 — конфиг в репозитории: `scripts/allure/allurerc.mjs`.
 * Передаётся CLI явно: `npx allure generate … --config scripts/allure/allurerc.mjs` (см. `.github/workflows/report.yml`).
 * https://allurereport.org/docs/v3/configure/
 * CI: variables из artifacts/allure-variables.json (write-allure-environment.sh; .properties из results не кладём — иначе дубль Metadata/Variables).
 * Сводный отчёт по нескольким CI-джобам: в CI вызывается `npx allure@<версия> generate` (версия в report.yml, Renovate: alias allure-cli → npm:allure); одна папка results; merge — scripts/ci/merge-allure-result-dirs.sh + report.yml.
 * Environments: лейбл component=frontend|backend (см. frontend/vitest.setup.ts, backend/conftest.py); E2E — epic end-to-end / framework playwright (frontend/playwright.config.ts).
 *
 * Variables: глобальный блок — CI/runner/GitHub и прочие ключи без префикса джоб; Frontend./Backend./E2E. и Node/Python/Django — в variables соответствующего environment (см. Allure 3: global vs environments.*.variables).
 */
import fs from "node:fs";
import path from "node:path";

const varsFile =
  process.env.ALLURE_VARIABLES_JSON ||
  path.join(process.cwd(), "artifacts/allure-variables.json");

/** @returns {Record<string, string>} */
function loadMergedVariablesRaw() {
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

/**
 * Делит плоский JSON после merge CI на глобальные метаданные и per-environment.
 * Node/Python/Django пишутся на раннере шага Test Report — в UI показываем рядом с FE/BE.
 * @returns {{ global: Record<string, string>, frontend: Record<string, string>, backend: Record<string, string>, e2e: Record<string, string> }}
 */
function partitionMergedVariables(merged) {
  const global = {};
  const frontend = {};
  const backend = {};
  const e2e = {};

  for (const [k, v] of Object.entries(merged)) {
    if (k.startsWith("Frontend.")) {
      frontend[k] = v;
    } else if (k.startsWith("Backend.")) {
      backend[k] = v;
    } else if (k.startsWith("E2E.")) {
      e2e[k] = v;
    } else if (k === "Node") {
      frontend[k] = v;
    } else if (k === "Python" || k === "Django") {
      backend[k] = v;
    } else {
      global[k] = v;
    }
  }

  return { global, frontend, backend, e2e };
}

const merged = loadMergedVariablesRaw();
const { global, frontend, backend, e2e } = partitionMergedVariables(merged);

export default {
  name: "car-service-platform",
  output: "./allure-report",
  variables: global,
  environments: {
    frontend: {
      matcher: ({ labels }) =>
        labels.some(
          ({ name, value }) => name === "component" && value === "frontend",
        ),
      variables: {
        ...frontend,
        "Test suite": "Vitest (unit)",
      },
    },
    backend: {
      matcher: ({ labels }) =>
        labels.some(
          ({ name, value }) => name === "component" && value === "backend",
        ),
      variables: {
        ...backend,
        "Test suite": "pytest (API)",
      },
    },
    e2e: {
      matcher: ({ labels }) =>
        labels.some(
          ({ name, value }) =>
            (name === "epic" && value === "end-to-end") ||
            (name === "framework" &&
              String(value).toLowerCase() === "playwright"),
        ),
      variables: {
        ...e2e,
        "Test suite": "Playwright (E2E)",
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
