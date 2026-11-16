"use strict";

const { defineConfig } = require("@playwright/test");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

module.exports = defineConfig({
  testDir: "./admin-backend/render-api/tests/browser",
  testMatch: "**/*.spec.cjs",
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5190",
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `${npm} run dev:emulators -- --only auth,firestore`,
      url: "http://127.0.0.1:9099",
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: `${npm} run dev:api:emulator`,
      url: "http://127.0.0.1:10000/health",
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: `${npm} run dev:maps:web:emulator`,
      url: "http://127.0.0.1:5190",
      timeout: 120000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_ADMIN_API_BASE_URL: "http://127.0.0.1:10000",
      },
    },
  ],
});
