#!/usr/bin/env node
/**
 * Allure 2 — emit Shields-style JSON under allure-report/badges/ and a PR comment body.
 * Marker `<!-- csp-allure-ci -->` is used by .github/workflows/report.yml to upsert the bot comment.
 * Run from the repository root, for example:
 *
 *   node .github/scripts/allure-ci.mjs badges --results allure-results --out allure-report
 *   node .github/scripts/allure-ci.mjs pr-body --results allure-results --report allure-report \
 *     --output allure-pr-comment.md --pages-url "https://..." --fork-pr false
 */
import fs from "node:fs";
import path from "node:path";

const EPICS = ["unit", "api", "ui", "end-to-end"];

/** PR comment: human-readable layer names (Allure `epic` label values). */
const EPIC_DISPLAY = {
  unit: "Unit",
  api: "API",
  ui: "UI",
  "end-to-end": "E2E",
  other: "Other",
};

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function listResultFiles(resultsDir) {
  if (!fs.existsSync(resultsDir)) return [];
  return fs
    .readdirSync(resultsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith("-result.json"))
    .map((e) => path.join(resultsDir, e.name));
}

function epicFromLabels(labels) {
  if (!Array.isArray(labels)) return null;
  const epic = labels.find((l) => l && l.name === "epic");
  return epic && epic.value ? String(epic.value).toLowerCase() : null;
}

/** Явный epic из labels, иначе Playwright → end-to-end (merged Allure без runtime epic). */
function epicForResult(doc) {
  const raw = epicFromLabels(doc.labels);
  if (raw && EPICS.includes(raw)) return raw;
  if (!Array.isArray(doc.labels)) return raw;
  const fw = doc.labels.find((l) => l && l.name === "framework");
  if (fw && String(fw.value).toLowerCase() === "playwright") return "end-to-end";
  return raw;
}

function aggregateResults(resultsDir) {
  const files = listResultFiles(resultsDir);
  const byEpic = {};
  for (const e of EPICS) {
    byEpic[e] = { passed: 0, failed: 0, broken: 0, skipped: 0, unknown: 0, total: 0 };
  }
  const total = { passed: 0, failed: 0, broken: 0, skipped: 0, unknown: 0, total: 0 };

  for (const file of files) {
    const doc = readJsonSafe(file);
    if (!doc || typeof doc.status !== "string") continue;
    const st = doc.status.toLowerCase();
    const rawEpic = epicForResult(doc);
    const epic = rawEpic && EPICS.includes(rawEpic) ? rawEpic : "other";
    if (!byEpic[epic]) {
      byEpic[epic] = { passed: 0, failed: 0, broken: 0, skipped: 0, unknown: 0, total: 0 };
    }
    const bucket = byEpic[epic];
    bucket.total++;
    total.total++;
    if (st === "passed") {
      bucket.passed++;
      total.passed++;
    } else if (st === "failed") {
      bucket.failed++;
      total.failed++;
    } else if (st === "broken") {
      bucket.broken++;
      total.broken++;
    } else if (st === "skipped") {
      bucket.skipped++;
      total.skipped++;
    } else {
      bucket.unknown++;
      total.unknown++;
    }
  }

  return { byEpic, total, resultCount: files.length };
}

function shieldJson(label, message, color) {
  return JSON.stringify({ schemaVersion: 1, label, message, color }, null, 0);
}

function colorForStats(s) {
  if (s.failed > 0 || s.broken > 0) return "red";
  if (s.skipped > 0 && s.passed + s.failed + s.broken === 0) return "yellow";
  if (s.passed > 0) return "brightgreen";
  return "lightgrey";
}

function messageForStats(s) {
  if (s.total === 0) return "no tests";
  const parts = [];
  if (s.passed) parts.push(`${s.passed} passed`);
  if (s.failed) parts.push(`${s.failed} failed`);
  if (s.broken) parts.push(`${s.broken} broken`);
  if (s.skipped) parts.push(`${s.skipped} skipped`);
  if (s.unknown) parts.push(`${s.unknown} other`);
  return parts.join(", ") || `${s.total} total`;
}

function cmdBadges(resultsDir, reportDir) {
  const { byEpic, total } = aggregateResults(resultsDir);
  const badgeDir = path.join(reportDir, "badges");
  fs.mkdirSync(badgeDir, { recursive: true });

  fs.writeFileSync(
    path.join(badgeDir, "total.json"),
    shieldJson("all tests", messageForStats(total), colorForStats(total)),
  );

  for (const epic of EPICS) {
    const s = byEpic[epic] || {
      passed: 0,
      failed: 0,
      broken: 0,
      skipped: 0,
      unknown: 0,
      total: 0,
    };
    fs.writeFileSync(
      path.join(badgeDir, `${epic}.json`),
      shieldJson(`${epic} tests`, messageForStats(s), colorForStats(s)),
    );
  }

  process.stdout.write(`Wrote shields JSON to ${badgeDir}\n`);
}

function readWidgetSummary(reportDir) {
  return readJsonSafe(path.join(reportDir, "widgets", "summary.json"));
}

/** @param {{ passed: number, total: number }} s */
function passRatePercent(s) {
  if (!s.total) return "—";
  const pct = (100 * s.passed) / s.total;
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded}%`;
}

function cmdPrBody(resultsDir, reportDir, outputFile, pagesUrl, forkPr, sourceRunId) {
  const agg = aggregateResults(resultsDir);
  const summary = readWidgetSummary(reportDir);
  const stat = summary && summary.statistic ? summary.statistic : agg.total;
  const total = stat.total ?? agg.total.total;
  const passed = stat.passed ?? 0;
  const failed = stat.failed ?? 0;
  const broken = stat.broken ?? 0;
  const skipped = stat.skipped ?? 0;
  const unknown = stat.unknown ?? agg.total.unknown ?? 0;

  const lines = [];
  lines.push("## Allure report summary");
  lines.push("");
  if (total > 0) {
    const rate = passRatePercent({ passed, total });
    const problems = failed + broken;
    const parts = [`**${total}** tests`, `**${passed}** passed`, `${rate} pass rate`];
    if (problems > 0) parts.push(`**${problems}** failed/broken`);
    if (skipped > 0) parts.push(`**${skipped}** skipped`);
    if (unknown > 0) parts.push(`**${unknown}** unknown`);
    lines.push(parts.join(" · "));
    lines.push("");
  }

  lines.push("### Outcomes (all suites)");
  lines.push("");
  lines.push("| Outcome | Count |");
  lines.push("| --- | --: |");
  lines.push(`| Passed | ${passed} |`);
  lines.push(`| Failed | ${failed} |`);
  lines.push(`| Broken | ${broken} |`);
  lines.push(`| Skipped | ${skipped} |`);
  if (unknown > 0) {
    lines.push(`| Unknown | ${unknown} |`);
  }
  lines.push(`| **Total** | **${total}** |`);
  if (total > 0) {
    lines.push(`| Pass rate (passed / total) | **${passRatePercent({ passed, total })}** |`);
  }
  lines.push("");

  lines.push("<details>");
  lines.push("<summary><strong>By layer</strong> (Allure <code>epic</code> label)</summary>");
  lines.push("");
  lines.push("| Layer | Tests | Passed | Failed | Broken | Skipped | Pass rate |");
  lines.push("| --- | --: | --: | --: | --: | --: | --: |");

  const empty = { total: 0, passed: 0, failed: 0, broken: 0, skipped: 0 };
  for (const epic of EPICS) {
    const s = agg.byEpic[epic] || empty;
    if (s.total === 0) continue;
    const label = EPIC_DISPLAY[epic] || epic;
    lines.push(
      `| ${label} | ${s.total} | ${s.passed} | ${s.failed} | ${s.broken} | ${s.skipped} | ${passRatePercent(s)} |`,
    );
  }
  const other = agg.byEpic.other;
  if (other && other.total > 0) {
    lines.push(
      `| ${EPIC_DISPLAY.other} | ${other.total} | ${other.passed} | ${other.failed} | ${other.broken} | ${other.skipped} | ${passRatePercent(other)} |`,
    );
  }
  const t = agg.total;
  lines.push(
    `| **All layers** | **${t.total}** | **${t.passed}** | **${t.failed}** | **${t.broken}** | **${t.skipped}** | ${passRatePercent(t)} |`,
  );
  lines.push("");
  lines.push("</details>");
  lines.push("");
  if (pagesUrl && forkPr !== "true") {
    lines.push(`**[View full report on GitHub Pages](${pagesUrl})**`);
    if (sourceRunId) {
      lines.push("");
      lines.push(
        `_This link includes a cache-busting query (\`run=${sourceRunId}\`) so the browser loads the latest deploy for this PR Pipeline run._`,
      );
    }
  } else if (forkPr === "true") {
    lines.push(
      "_Preview on GitHub Pages is only published for PRs from the same repository. Download the `allure-report` artifact from this workflow run._",
    );
  } else {
    lines.push("_GitHub Pages URL not available for this run._");
  }
  lines.push("");
  lines.push("<!-- csp-allure-ci -->");

  fs.writeFileSync(outputFile, lines.join("\n"), "utf8");
  process.stdout.write(`Wrote PR body to ${outputFile}\n`);
}

function parseArgs(argv) {
  const cmd = argv[2];
  const args = argv.slice(3);
  const get = (name) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : null;
  };
  return {
    cmd,
    results: get("--results") || "./allure-results",
    report: get("--report") || "./allure-report",
    out: get("--out") || get("--report") || "./allure-report",
    output: get("--output") || "allure-pr-comment.md",
    pagesUrl: get("--pages-url") || "",
    forkPr: get("--fork-pr") || "false",
    sourceRunId: get("--source-run-id") || "",
  };
}

const { cmd, results, report, out, output, pagesUrl, forkPr, sourceRunId } = parseArgs(process.argv);

if (cmd === "badges") {
  cmdBadges(results, out);
} else if (cmd === "pr-body") {
  cmdPrBody(results, report, output, pagesUrl, forkPr, sourceRunId);
} else {
  console.error(
    "Usage: node .github/scripts/allure-ci.mjs badges --results <dir> --out <reportDir>\n" +
      "       node .github/scripts/allure-ci.mjs pr-body --results <dir> --report <reportDir> --output <file> [--pages-url <url>] [--fork-pr true|false] [--source-run-id <id>]",
  );
  process.exit(1);
}
