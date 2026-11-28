import { defineConfig, devices } from "@playwright/test";
import { E2E_ADMIN, E2E_DB_FILE, E2E_JWT_SECRET, E2E_PORT } from "./e2e/env";

// End-to-end tests run against their own `next dev` on port 3100, so they can run beside `npm run dev`:
// - NEXT_DIST_DIR keeps its build output apart from the normal dev server's (Next.js locks .next/dev).
// - HOTEL_DB_FILE points the JSON store at a throwaway copy (made by e2e/global-setup.ts), so requests
//   sent by the tests never reach the committed data/db.json.
// - DATABASE_URL="" forces the JSON store; empty webhook and cron settings keep notifications queued.
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  // One worker: the tests share one dev server and its per-process rate limits.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The first visit to each page compiles it in the dev server.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}/privacy`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      NEXT_DIST_DIR: ".next/e2e",
      HOTEL_DB_FILE: E2E_DB_FILE,
      DATABASE_URL: "",
      ADMIN_EMAIL: E2E_ADMIN.email,
      ADMIN_PASSWORD: E2E_ADMIN.password,
      JWT_SECRET: E2E_JWT_SECRET,
      NOTIFICATION_WEBHOOK_URL: "",
      CRON_SECRET: "",
    },
  },
});
