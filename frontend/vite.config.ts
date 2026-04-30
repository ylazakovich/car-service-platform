import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";
import { defineConfig } from "vitest/config";

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET ?? "http://localhost:8000";
/** Set by docker-compose.dev.lan.yml when publishing to LAN — Vite default CORS only allows localhost origins. */
const viteLanDev = process.env.VITE_LAN_DEV === "1";
/** Host port mapped to Vite :5173 in Docker (`4173:5173`). Without this, HMR WebSocket may target :5173 and fail on phone/LAN. */
const devPublishedPort = Number.parseInt(process.env.VITE_DEV_PUBLISHED_PORT ?? "", 10);
const internalVitePort = 5173;
const hmrClientPort =
  Number.isFinite(devPublishedPort) && devPublishedPort > 0 && devPublishedPort !== internalVitePort
    ? devPublishedPort
    : undefined;

/** Docker Compose service name — changeOrigin would send Host: backend, which is not in default ALLOWED_HOSTS. */
function apiProxyOptions(): ProxyOptions {
  const target = devProxyTarget;
  let useLocalhostHost = false;
  try {
    useLocalhostHost = new URL(target).hostname === "backend";
  } catch {
    /* keep false */
  }
  const base: ProxyOptions = { target, changeOrigin: true };
  if (!useLocalhostHost) {
    return base;
  }
  return {
    ...base,
    configure(proxy) {
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.setHeader("host", "localhost");
      });
    },
  };
}

const apiProxy = apiProxyOptions();

/** Set in docker-compose.dev.lan.yml when opening dev from http://<LAN-IP>:port — fixes asset URLs + Host checks on phones. */
const viteDevServerOrigin = process.env.VITE_DEV_SERVER_ORIGIN?.trim().replace(/\/$/, "") ?? "";
function lanServerExtras(): { origin: string; allowedHosts: string[] } | Record<string, never> {
  if (!viteDevServerOrigin) {
    return {};
  }
  try {
    const host = new URL(viteDevServerOrigin).hostname;
    if (!host) {
      return {};
    }
    return { origin: viteDevServerOrigin, allowedHosts: [host] };
  } catch {
    return {};
  }
}
const _lanExtras = lanServerExtras();

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: internalVitePort,
    strictPort: true,
    ...(hmrClientPort !== undefined ? { hmr: { clientPort: hmrClientPort } } : {}),
    ...(viteLanDev ? { cors: true as const } : {}),
    ..._lanExtras,
    proxy: {
      "/api": apiProxy,
      "/media": apiProxy,
    },
  },
  /* `vite preview` (default :4173) does not reuse server.proxy unless configured — same proxy as dev for local build preview + Django on VITE_DEV_PROXY_TARGET */
  preview: {
    host: true,
    port: 4173,
    ...(hmrClientPort !== undefined && hmrClientPort !== 4173 ? { hmr: { clientPort: hmrClientPort } } : {}),
    ...(viteLanDev ? { cors: true as const } : {}),
    ..._lanExtras,
    proxy: {
      "/api": apiProxy,
      "/media": apiProxy,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["allure-vitest/setup", "./vitest.setup.ts"],
    reporters: [
      "default",
      "github-actions",
      ["junit", { outputFile: "test-results/junit.xml" }],
      "allure-vitest/reporter",
    ],
    css: true,
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
