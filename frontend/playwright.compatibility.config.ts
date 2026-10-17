import { defineConfig, devices } from "@playwright/test";
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export default defineConfig({
  testDir: "./tests/e2e/compatibility",
  outputDir: "../artifacts/reports/test-results/compatibility",
  timeout: 30000,
  workers: 1,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          "../artifacts/reports/test-results/compatibility/results.json",
      },
    ],
  ],
  use: {
    baseURL: "http://localhost:3101",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
  ],
  webServer: {
    command: "npm run dev -- --port 3101",
    url: "http://localhost:3101",
    env: {
      E2E_DISABLE_HMR: "1",
      VITE_API_URL: "http://localhost:18082",
      VITE_WS_URL: "http://localhost:18082/ws",
      DEBUG: "false",
    },
    reuseExistingServer: false,
    timeout: 120000,
  },
});
