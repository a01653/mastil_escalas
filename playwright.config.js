import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:4185/mastil_escalas/",
    ...devices["Desktop Chrome"],
    headless: true,
  },
  reporter: [["list"]],
});
