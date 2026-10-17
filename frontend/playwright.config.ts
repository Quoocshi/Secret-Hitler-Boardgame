import { defineConfig, devices } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://localhost:18081";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const apiPort = Number(new URL(apiUrl).port);
const frontendPort = Number(new URL(baseURL).port);
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export default defineConfig({
  testDir: "./tests/e2e/legacy",
  outputDir: "../artifacts/reports/test-results/legacy",
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: "../artifacts/reports/test-results/legacy/results.json" },
    ],
    [
      "html",
      { open: "never", outputFolder: "../artifacts/reports/playwright-report" },
    ],
  ],
  use: { baseURL, trace: "off", video: "off", screenshot: "off" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "edge", use: { ...devices["Desktop Edge"], channel: "msedge" } },
  ],
  webServer: [
    {
      command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-legacy-backend.ps1 -Port ${apiPort}`,
      url: apiUrl + "/ws/info",
      reuseExistingServer: false,
      timeout: 180000,
    },
    {
      command: `npm run dev -- --port ${frontendPort}`,
      url: baseURL,
      env: {
        E2E_DISABLE_HMR: "1",
        VITE_API_URL: apiUrl,
        VITE_WS_URL: apiUrl + "/ws",
        DEBUG: "false",
      },
      reuseExistingServer: false,
      timeout: 120000,
    },
  ],
});
