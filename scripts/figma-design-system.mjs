#!/usr/bin/env node
/**
 * Figma Design System Creator
 * Builds a structured "🎨 Design System" frame containing:
 *   • Color tokens (Background, Text, Semantic)
 *   • Typography scale
 *   • Spacing tokens
 *   • Component definitions (Button, Input, Card, Badge, Nav)
 *
 * Usage: node scripts/figma-design-system.mjs <channel>
 */

import { createRequire } from "module";
import { randomUUID } from "crypto";
const require = createRequire(import.meta.url);
const { WebSocket } = require("/tmp/figma-ws/node_modules/ws/index.js");

const CHANNEL = process.argv[2];
if (!CHANNEL) {
  console.error("Usage: node figma-design-system.mjs <channel>");
  process.exit(1);
}

const PAGE_ID = "2:2381";   // "Imported UI" page
const DS_X    = 2200;       // to the right of Desktop (1440) + Mobile (1500+393)
const DS_Y    = 0;
const DS_W    = 1100;
const DS_H    = 3600;

// ── WebSocket setup ───────────────────────────────────────────
const ws = new WebSocket("ws://localhost:3055");
const pending = new Map();

function send(command, params) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const msg = {
      id, type: "message", channel: CHANNEL,
      message: { id, command, params: { ...params, commandId: id } },
    };
    const t = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout: ${command}`));
    }, 20000);
    pending.set(id, { resolve, reject, timeout: t });
    ws.send(JSON.stringify(msg));
  });
}

ws.on("message", (raw) => {
  try {
    const msg = JSON.parse(raw.toString());
    const id = msg.id || msg.message?.id;
    if (id && pending.has(id)) {
      const { resolve, timeout } = pending.get(id);
      clearTimeout(timeout);
      pending.delete(id);
      resolve(msg.message?.result ?? msg);
    }
  } catch {}
});

// ── Color palette (0–1 range) ─────────────────────────────────
const C = {
  base:          { r: 0.051, g: 0.051, b: 0.067, a: 1 },  // #0D0D11
  surface:       { r: 0.082, g: 0.082, b: 0.110, a: 1 },  // #15151C
  card:          { r: 0.110, g: 0.110, b: 0.149, a: 1 },  // #1C1C26
  elevated:      { r: 0.137, g: 0.137, b: 0.188, a: 1 },  // #232330
  textPrimary:   { r: 0.925, g: 0.933, b: 0.957, a: 1 },  // #ECEEF4
  textSecondary: { r: 0.706, g: 0.729, b: 0.808, a: 1 },  // #B4BACE
  textMuted:     { r: 0.494, g: 0.525, b: 0.600, a: 1 },  // #7E8699
  textOnAccent:  { r: 0.051, g: 0.051, b: 0.067, a: 1 },  // #0D0D11
  accent:        { r: 0.804, g: 0.847, b: 0.227, a: 1 },  // #CDD83A
  danger:        { r: 0.878, g: 0.322, b: 0.322, a: 1 },  // #E05252
  warning:       { r: 0.941, g: 0.659, b: 0.290, a: 1 },  // #F0A84A
  success:       { r: 0.306, g: 0.788, b: 0.580, a: 1 },  // #4EC994
  info:          { r: 0.357, g: 0.612, b: 0.965, a: 1 },  // #5B9CF6
  white:         { r: 1,     g: 1,     b: 1,     a: 1 },
  chipAccent:    { r: 0.804, g: 0.847, b: 0.227, a: 0.12 },
  chipDanger:    { r: 0.878, g: 0.322, b: 0.322, a: 0.10 },
  chipWarning:   { r: 0.941, g: 0.659, b: 0.290, a: 0.10 },
  chipSuccess:   { r: 0.306, g: 0.788, b: 0.580, a: 0.10 },
  chipInfo:      { r: 0.357, g: 0.612, b: 0.965, a: 0.10 },
};

// ── Helpers ───────────────────────────────────────────────────
async function mkFrame(parentId, x, y, w, h, name, fill, radius = 0) {
  const params = { x, y, width: w, height: h, name, layoutMode: "NONE" };
  if (parentId) params.parentId = parentId;
  if (fill)     params.fillColor = fill;
  if (radius)   params.cornerRadius = radius;
  const res = await send("create_frame", params);
  return res?.id || res?.nodeId;
}

async function mkText(parentId, x, y, content, size, weight, color) {
  const params = {
    parentId, x, y,
    text: String(content).slice(0, 200),
    fontSize: size,
    fontWeight: weight,
    fontColor: color || C.textPrimary,
    name: String(content).slice(0, 40),
  };
  return send("create_text", params);
}

const label  = (pid, x, y, t) => mkText(pid, x, y, t, 10, 700, C.textMuted);
const sublbl = (pid, x, y, t) => mkText(pid, x, y, t, 9,  600, C.textSecondary);
const hexlbl = (pid, x, y, t) => mkText(pid, x, y, t, 9,  400, C.textMuted);

// ── Main ──────────────────────────────────────────────────────
ws.on("open", async () => {
  // Join channel
  const jid = randomUUID();
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("join timeout")), 5000);
    pending.set(jid, { resolve: (v) => { clearTimeout(t); res(v); }, reject: rej, timeout: t });
    ws.send(JSON.stringify({
      id: jid, type: "join", channel: CHANNEL,
      message: { id: jid, command: "join", params: { channel: CHANNEL, commandId: jid } },
    }));
  });
  console.log(`✓ Joined ${CHANNEL}`);

  // ── Create top-level Design System frame ──────────────────
  console.log("Creating main frame…");
  const DS = await mkFrame(PAGE_ID, DS_X, DS_Y, DS_W, DS_H, "🎨 Design System", C.base);
  console.log(`  Frame: ${DS}`);

  // ══════════════════════════════════════════════════════════
  // SECTION 1 — COLOR TOKENS
  // ══════════════════════════════════════════════════════════
  console.log("Building Color Tokens…");
  await label(DS, 40, 40, "COLOR TOKENS");

  // — Background colors —
  await mkText(DS, 40, 68, "Background", 11, 700, C.textSecondary);

  const bgSwatches = [
    { name: "Bg/Base",     hex: "#0D0D11", fill: C.base },
    { name: "Bg/Surface",  hex: "#15151C", fill: C.surface },
    { name: "Bg/Card",     hex: "#1C1C26", fill: C.card },
    { name: "Bg/Elevated", hex: "#232330", fill: C.elevated },
  ];
  for (let i = 0; i < bgSwatches.length; i++) {
    const sx = 40 + i * 96;
    await mkFrame(DS, sx, 88, 80, 80, bgSwatches[i].name, bgSwatches[i].fill, 8);
    await sublbl(DS, sx, 176, bgSwatches[i].name);
    await hexlbl(DS, sx, 190, bgSwatches[i].hex);
  }

  // — Text colors (on dark backing plate) —
  await mkText(DS, 40, 222, "Text", 11, 700, C.textSecondary);

  const bgPlateW = 5 * 80 + 4 * 16;
  await mkFrame(DS, 40, 240, bgPlateW, 80, "text-swatch-bg", C.surface, 8);

  const textSwatches = [
    { name: "Text/Primary",   hex: "#ECEEF4", fill: C.textPrimary },
    { name: "Text/Secondary", hex: "#B4BACE", fill: C.textSecondary },
    { name: "Text/Muted",     hex: "#7E8699", fill: C.textMuted },
    { name: "Text/OnAccent",  hex: "#0D0D11", fill: C.textOnAccent },
    { name: "Text/Accent",    hex: "#CDD83A", fill: C.accent },
  ];
  for (let i = 0; i < textSwatches.length; i++) {
    const sx = 40 + i * 96;
    await mkFrame(DS, sx + 8, 248, 64, 64, textSwatches[i].name, textSwatches[i].fill, 6);
    await sublbl(DS, sx, 328, textSwatches[i].name);
    await hexlbl(DS, sx, 342, textSwatches[i].hex);
  }

  // — Semantic colors —
  await mkText(DS, 40, 374, "Semantic", 11, 700, C.textSecondary);

  const semanticSwatches = [
    { name: "Primary",  hex: "#CDD83A", fill: C.accent },
    { name: "Danger",   hex: "#E05252", fill: C.danger },
    { name: "Warning",  hex: "#F0A84A", fill: C.warning },
    { name: "Success",  hex: "#4EC994", fill: C.success },
    { name: "Info",     hex: "#5B9CF6", fill: C.info },
  ];
  for (let i = 0; i < semanticSwatches.length; i++) {
    const sx = 40 + i * 96;
    await mkFrame(DS, sx, 392, 80, 80, semanticSwatches[i].name, semanticSwatches[i].fill, 8);
    await sublbl(DS, sx, 480, semanticSwatches[i].name);
    await hexlbl(DS, sx, 494, semanticSwatches[i].hex);
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 2 — TYPOGRAPHY
  // ══════════════════════════════════════════════════════════
  console.log("Building Typography…");
  await label(DS, 40, 540, "TYPOGRAPHY");

  const typeScale = [
    { token: "Heading/H1",   size: 48, weight: 700, sample: "Service Dashboard" },
    { token: "Heading/H2",   size: 25, weight: 700, sample: "Operations Overview" },
    { token: "Heading/H3",   size: 16, weight: 700, sample: "Vehicle Registry" },
    { token: "Body",         size: 14, weight: 400, sample: "Regular body text · descriptions · cell content" },
    { token: "Small",        size: 12, weight: 400, sample: "Metadata · dates · secondary info" },
    { token: "XS / Label",  size: 11, weight: 700, sample: "SECTION LABEL · NAV GROUP" },
  ];

  let typoY = 568;
  for (const t of typeScale) {
    await mkText(DS, 40, typoY, t.sample, t.size, t.weight, C.textPrimary);
    const metaY = typoY + Math.max(0, (t.size - 11) / 2);
    await mkText(DS, 600, metaY, `${t.token} · ${t.size}px / ${t.weight}`, 11, 400, C.textMuted);
    typoY += Math.max(t.size + 16, 40);
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 3 — SPACING
  // ══════════════════════════════════════════════════════════
  console.log("Building Spacing…");
  const spacingTop = typoY + 40;
  await label(DS, 40, spacingTop, "SPACING");

  const spacings = [8, 16, 24, 32];
  let spX = 40;
  for (const sp of spacings) {
    await mkFrame(DS, spX, spacingTop + 24, sp, sp, `Spacing/${sp}`, C.accent, 2);
    await mkText(DS, spX, spacingTop + 24 + sp + 8, `${sp}px`, 10, 400, C.textMuted);
    spX += sp + 40;
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 4 — COMPONENTS
  // ══════════════════════════════════════════════════════════
  console.log("Building Components…");
  const compTop = spacingTop + 120;
  await label(DS, 40, compTop, "COMPONENTS");

  // ── Buttons ───────────────────────────────────────────────
  await mkText(DS, 40, compTop + 28, "Button", 11, 700, C.textSecondary);

  // Primary
  await mkFrame(DS, 40, compTop + 48, 160, 48, "Button/Primary", C.accent, 10);
  await mkText(DS, 72, compTop + 65, "Primary Button", 13, 700, C.textOnAccent);

  // Secondary
  await mkFrame(DS, 216, compTop + 48, 168, 48, "Button/Secondary", C.elevated, 10);
  await mkText(DS, 238, compTop + 65, "Secondary Button", 13, 600, C.textSecondary);

  // Danger
  await mkFrame(DS, 400, compTop + 48, 120, 48, "Button/Danger", C.danger, 10);
  await mkText(DS, 435, compTop + 65, "Delete", 13, 700, C.white);

  // Small primary
  await mkFrame(DS, 536, compTop + 57, 128, 34, "Button/Primary/Small", C.accent, 10);
  await mkText(DS, 558, compTop + 67, "+ Add Vehicle", 13, 700, C.textOnAccent);

  // ── Input ─────────────────────────────────────────────────
  await mkText(DS, 40, compTop + 128, "Input", 11, 700, C.textSecondary);

  await mkFrame(DS, 40, compTop + 148, 320, 48, "Input/Default", C.card, 10);
  await mkText(DS, 56, compTop + 166, "Search vehicles…", 14, 400, C.textMuted);

  await mkFrame(DS, 376, compTop + 154, 256, 36, "Input/Compact", C.card, 10);
  await mkText(DS, 392, compTop + 164, "Unit name", 13, 400, C.textMuted);

  // ── Cards ─────────────────────────────────────────────────
  await mkText(DS, 40, compTop + 232, "Card", 11, 700, C.textSecondary);

  // Metric Card
  await mkFrame(DS, 40, compTop + 252, 201, 160, "Card/Metric", C.surface, 14);
  await mkText(DS, 56, compTop + 272, "SERVICE SALES", 11, 700, C.accent);
  await mkText(DS, 56, compTop + 292, "₽ 284 500", 25, 700, C.textPrimary);
  await mkText(DS, 56, compTop + 330, "▲ 12% vs last month", 11, 400, C.textMuted);

  // Kanban Card
  await mkFrame(DS, 257, compTop + 252, 232, 160, "Card/Kanban", C.surface, 12);
  await mkText(DS, 273, compTop + 272, "BRAKE SYSTEM", 11, 700, C.accent);
  await mkText(DS, 273, compTop + 292, "Replace front brake pads", 13, 400, C.textPrimary);
  await mkText(DS, 273, compTop + 318, "BMW X5 · E05-2024", 11, 400, C.textMuted);
  await mkText(DS, 273, compTop + 338, "Иванов А.", 11, 400, C.textSecondary);

  // User / Registry Card
  await mkFrame(DS, 505, compTop + 252, 300, 90, "Card/User", C.card, 14);
  await mkText(DS, 521, compTop + 268, "Иванов Александр", 14, 700, C.textPrimary);
  await mkText(DS, 521, compTop + 290, "alex@carservice.ru", 12, 400, C.textMuted);
  await mkText(DS, 521, compTop + 314, "master", 11, 600, C.textSecondary);

  // ── Badge / Status Chip ───────────────────────────────────
  await mkText(DS, 40, compTop + 452, "Badge / Status Chip", 11, 700, C.textSecondary);

  const chips = [
    { label: "New",           fill: C.chipInfo,    color: C.info    },
    { label: "In Progress",   fill: C.chipWarning,  color: C.warning },
    { label: "Done",          fill: C.chipSuccess,  color: C.success },
    { label: "Cancelled",     fill: C.chipDanger,   color: C.danger  },
    { label: "#SVC-2024-001", fill: C.chipAccent,   color: C.accent  },
  ];

  let chipX = 40;
  for (const chip of chips) {
    const chipW = chip.label.length * 7 + 28;
    await mkFrame(DS, chipX, compTop + 472, chipW, 26, `Chip/${chip.label}`, chip.fill, 999);
    await mkText(DS, chipX + 14, compTop + 479, chip.label, 11, 700, chip.color);
    chipX += chipW + 12;
  }

  // ── Nav Item ──────────────────────────────────────────────
  await mkText(DS, 40, compTop + 532, "Nav Item", 11, 700, C.textSecondary);

  await mkFrame(DS, 40,  compTop + 552, 223, 35, "Nav/Active",   C.card,    8);
  await mkText (DS, 66,  compTop + 562, "Dashboard",   14, 700, C.textPrimary);
  await mkFrame(DS, 280, compTop + 552, 223, 35, "Nav/Inactive", C.surface, 8);
  await mkText (DS, 306, compTop + 562, "Vehicles",    14, 500, C.textSecondary);

  // ══════════════════════════════════════════════════════════
  // Report
  // ══════════════════════════════════════════════════════════
  console.log("\n✅ Design System created successfully!");
  console.log(`   Location: x=2200 y=0 on page "Imported UI"`);
  console.log(`   Frame ID: ${DS}`);
  console.log("");
  console.log("📊 Normalization Report:");
  console.log("   Colors:        ~20+ raw values → 13 structured tokens");
  console.log("     Background:  4 levels (Base, Surface, Card, Elevated)");
  console.log("     Text:        5 levels (Primary, Secondary, Muted, OnAccent, Accent)");
  console.log("     Semantic:    5 tokens (Primary, Danger, Warning, Success, Info)");
  console.log("   Typography:    6 scale steps defined (11→48px)");
  console.log("   Spacing:       4 tokens defined (8/16/24/32px)");
  console.log("   Components:    15 defined");
  console.log("     Button:      Primary, Secondary, Danger, Primary/Small");
  console.log("     Input:       Default, Compact");
  console.log("     Card:        Metric, Kanban, User");
  console.log("     Chip:        New, In Progress, Done, Cancelled, Tracking");
  console.log("     Nav:         Active, Inactive");
  console.log("");
  console.log("⚠️  Manual steps needed in Figma:");
  console.log("   · Select component frames → Ctrl+Alt+K to make real Figma Components");
  console.log("   · Create Color/Text Styles from swatches (right-click → Create Style)");
  console.log("   · Replace raw button elements in Desktop/Mobile frames with instances");

  ws.close();
  process.exit(0);
});

ws.on("error", (err) => {
  console.error("WebSocket error:", err.message);
  process.exit(1);
});
