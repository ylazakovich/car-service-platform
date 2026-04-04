import react from "@vitejs/plugin-react";
import type { ProxyOptions } from "vite";
import { defineConfig } from "vitest/config";

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET ?? "http://localhost:8000";

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
