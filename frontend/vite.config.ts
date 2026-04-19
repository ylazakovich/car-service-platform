import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";
import { defineConfig } from "vitest/config";

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET ?? "http://localhost:8000";
/** Set by docker-compose.dev.lan.yml when publishing to LAN — Vite default CORS only allows localhost origins. */
const viteLanDev = process.env.VITE_LAN_DEV === "1";

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

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    ...(viteLanDev ? { cors: true as const } : {}),
    proxy: {
      "/api": apiProxy,
      "/media": apiProxy,
    },
  },
  /* `vite preview` (default :4173) does not reuse server.proxy unless configured — same proxy as dev for local build preview + Django on VITE_DEV_PROXY_TARGET */
  preview: {
    host: true,
    port: 4173,
    ...(viteLanDev ? { cors: true as const } : {}),
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
