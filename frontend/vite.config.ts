import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
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
