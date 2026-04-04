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
    setupFiles: ["./vitest.setup.ts", "allure-vitest/setup"],
    css: true,
    reporters: [
      "default",
      "github-actions",
      ["junit", { outputFile: "test-results/junit.xml" }],
      "allure-vitest/reporter",
    ],
  },
});
