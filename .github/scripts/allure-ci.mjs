#!/usr/bin/env node
/**
 * Allure 2 — Shields endpoint JSON (allure-report/badges/) и тело PR-комментария.
 * Маркер `<!-- csp-allure-ci -->` — для upsert комментария в .github/workflows/report.yml.
 * Живёт в репозитории car-service-platform; в workflow вызывать из корня репозитория:
 *
 *   node .github/scripts/allure-ci.mjs badges --results allure-results --out allure-report
 *   node .github/scripts/allure-ci.mjs pr-body --results allure-results --report allure-report \
 *     --output allure-pr-comment.md --pages-url "https://..." --fork-pr false
 */
import fs from "node:fs";
import path from "node:path";

const EPICS = ["unit", "api", "ui"];

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
    const rawEpic = epicFromLabels(doc.labels);
    const epic = EPICS.includes(rawEpic) ? rawEpic : "other";
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

function cmdPrBody(resultsDir, reportDir, outputFile, pagesUrl, forkPr) {
  const agg = aggregateResults(resultsDir);
  const summary = readWidgetSummary(reportDir);
  const stat = summary && summary.statistic ? summary.statistic : agg.total;

  const lines = [];
  lines.push("## Allure report summary");
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("| --- | ---: |");
  lines.push(`| Passed | ${stat.passed ?? 0} |`);
  lines.push(`| Failed | ${stat.failed ?? 0} |`);
  lines.push(`| Broken | ${stat.broken ?? 0} |`);
  lines.push(`| Skipped | ${stat.skipped ?? 0} |`);
  lines.push(`| **Total** | **${stat.total ?? agg.total.total}** |`);
  lines.push("");
  lines.push("### By epic (Allure `epic` label)");
  lines.push("");
  lines.push("| Epic | Total | Passed | Failed | Broken | Skipped |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
  for (const epic of EPICS) {
    const s = agg.byEpic[epic] || {
      total: 0,
      passed: 0,
      failed: 0,
      broken: 0,
      skipped: 0,
    };
    lines.push(
      `| **${epic}** | ${s.total} | ${s.passed} | ${s.failed} | ${s.broken} | ${s.skipped} |`,
    );
  }
  const other = agg.byEpic.other;
  if (other && other.total > 0) {
    lines.push(
      `| other | ${other.total} | ${other.passed} | ${other.failed} | ${other.broken} | ${other.skipped} |`,
    );
  }
  lines.push("");
  if (pagesUrl && forkPr !== "true") {
    lines.push(`**[View full report on GitHub Pages](${pagesUrl})**`);
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
  };
}

const { cmd, results, report, out, output, pagesUrl, forkPr } = parseArgs(process.argv);

if (cmd === "badges") {
  cmdBadges(results, out);
} else if (cmd === "pr-body") {
  cmdPrBody(results, report, output, pagesUrl, forkPr);
} else {
  console.error(
    "Usage: node .github/scripts/allure-ci.mjs badges --results <dir> --out <reportDir>\n" +
      "       node .github/scripts/allure-ci.mjs pr-body --results <dir> --report <reportDir> --output <file> [--pages-url <url>] [--fork-pr true|false]",
  );
  process.exit(1);
}
