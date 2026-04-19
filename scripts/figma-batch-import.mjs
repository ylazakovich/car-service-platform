#!/usr/bin/env node
/**
 * Figma Batch Import — отправляет все элементы из visual JSON в Figma через WebSocket.
 * Использует тот же WebSocket протокол, что и cursor-talk-to-figma-mcp.
 *
 * Использование:
 *   node scripts/figma-batch-import.mjs <channel> <desktop|mobile>
 *   node scripts/figma-batch-import.mjs h7dfw322 desktop
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { WebSocket } = require("/tmp/figma-ws/node_modules/ws/index.js");
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const CHANNEL = process.argv[2];
const MODE = process.argv[3]; // "desktop" или "mobile"

if (!CHANNEL || !MODE) {
  console.error("Usage: node figma-batch-import.mjs <channel> <desktop|mobile>");
  process.exit(1);
}

const FRAME_IDS = {
  desktop: "5:5",
  mobile: "5:6",
};

const FRAME_ID = FRAME_IDS[MODE];
if (!FRAME_ID) {
  console.error("MODE must be 'desktop' or 'mobile'");
  process.exit(1);
}

const JSON_FILE = resolve(ROOT, `output/${MODE}_http___localhost_4173_.json`);
const elements = JSON.parse(readFileSync(JSON_FILE, "utf-8"));

// Фильтрация по правилам задания
const valid = elements.filter(
  (el) => el.width >= 2 && el.height >= 2 && el.opacity !== 0
);

console.log(`\nLoaded ${elements.length} elements, ${valid.length} valid after filtering`);

// Конвертация rgb(r,g,b) или rgba(r,g,b,a) → {r,g,b,a} в диапазоне 0-1
function parseColor(cssColor) {
  if (!cssColor) return null;
  const rgba = cssColor.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
  if (!rgba) return null;
  return {
    r: parseInt(rgba[1]) / 255,
    g: parseInt(rgba[2]) / 255,
    b: parseInt(rgba[3]) / 255,
    a: rgba[4] !== undefined ? parseFloat(rgba[4]) : 1,
  };
}

// WebSocket connection
const ws = new WebSocket("ws://localhost:3055");
const pending = new Map();

function send(command, params) {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const request = {
      id,
      type: "message",
      channel: CHANNEL,
      message: { id, command, params: { ...params, commandId: id } },
    };
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout: ${command}`));
    }, 15000);
    pending.set(id, { resolve, reject, timeout });
    ws.send(JSON.stringify(request));
  });
}

ws.on("message", (data) => {
  try {
    const msg = JSON.parse(data.toString());
    const id = msg.id || msg.message?.id;
    if (id && pending.has(id)) {
      const { resolve, timeout } = pending.get(id);
      clearTimeout(timeout);
      pending.delete(id);
      resolve(msg.message?.result ?? msg);
    }
  } catch {}
});

ws.on("open", async () => {
  // Присоединяемся к каналу
  const joinId = randomUUID();
  const joinProm = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error("Join timeout")), 5000);
    pending.set(joinId, {
      resolve: (v) => { clearTimeout(t); res(v); },
      reject: rej,
      timeout: t,
    });
  });

  ws.send(JSON.stringify({ id: joinId, type: "join", channel: CHANNEL, message: { id: joinId, command: "join", params: { channel: CHANNEL, commandId: joinId } } }));
  await joinProm;
  console.log(`✓ Joined channel ${CHANNEL}`);

  // Статистика
  let created = 0;
  let textCreated = 0;
  let errors = 0;
  const CONCURRENCY = 3;

  async function processElement(el) {
    const bg = parseColor(el.backgroundColor);
    const color = parseColor(el.color);

    try {
      if (bg) {
        // Создаём прямоугольник через create_frame (поддерживает fillColor и cornerRadius)
        const params = {
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          name: el.tag + (el.id ? `#${el.id}` : el.classes ? `.${el.classes.split(" ")[0]}` : ""),
          parentId: FRAME_ID,
          fillColor: bg,
          layoutMode: "NONE",
        };
        await send("create_frame", params);
        created++;
      }

      if (el.text) {
        const textParams = {
          x: el.x,
          y: el.y,
          text: el.text.slice(0, 200),
          fontSize: el.fontSize ? Math.round(el.fontSize) : 14,
          fontWeight: el.fontWeight ? parseInt(el.fontWeight) || 400 : 400,
          fontColor: color || { r: 0, g: 0, b: 0, a: 1 },
          name: `text: ${el.text.slice(0, 30)}`,
          parentId: FRAME_ID,
        };
        await send("create_text", textParams);
        textCreated++;
        created++;
      }
    } catch (err) {
      errors++;
      if (errors <= 5) console.error(`  Error on element (${el.tag}): ${err.message}`);
    }
  }

  // Обработка батчами для контроля нагрузки
  console.log(`\nRendering ${valid.length} elements into '${MODE}' frame (ID: ${FRAME_ID})...\n`);

  for (let i = 0; i < valid.length; i += CONCURRENCY) {
    const batch = valid.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(processElement));

    if ((i + CONCURRENCY) % 30 === 0 || i + CONCURRENCY >= valid.length) {
      const done = Math.min(i + CONCURRENCY, valid.length);
      process.stdout.write(`  ${done}/${valid.length} elements (${textCreated} texts, ${errors} errors)\r`);
    }
  }

  console.log(`\n\n✓ Done!`);
  console.log(`  Total created: ${created}`);
  console.log(`  Text nodes:    ${textCreated}`);
  console.log(`  Errors:        ${errors}`);

  ws.close();
  process.exit(0);
});

ws.on("error", (err) => {
  console.error("WebSocket error:", err.message);
  process.exit(1);
});
