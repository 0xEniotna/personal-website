import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4321",
    headless: true,
  },
  webServer: {
    command: "ASTRO_TELEMETRY_DISABLED=1 pnpm dev --host 127.0.0.1 --port 4321",
    port: 4321,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
