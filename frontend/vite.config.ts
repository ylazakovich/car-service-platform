import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
    reporters: ["default", "allure-vitest/reporter"],
    css: true,
    exclude: ["**/node_modules/**", "**/e2e/**"],
  },
});
