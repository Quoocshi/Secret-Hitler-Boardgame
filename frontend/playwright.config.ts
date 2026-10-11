import { defineConfig, devices } from "@playwright/test";
const apiUrl=process.env.E2E_API_URL??"http://localhost:8081";
const baseURL=process.env.PLAYWRIGHT_BASE_URL??"http://localhost:3000";
export default defineConfig({
 testDir:"./tests/e2e",timeout:120000,fullyParallel:false,workers:1,
 reporter:[["list"],["html",{open:"never"}]],
 use:{baseURL,trace:"off"},
 projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}},{name:"edge",use:{...devices["Desktop Edge"],channel:"msedge"}}],
 webServer:[
  {command:"powershell -NoProfile -ExecutionPolicy Bypass -File ../Backend/scripts/run-fixtures.ps1",url:apiUrl+"/__test/health",reuseExistingServer:!process.env.CI,timeout:180000},
  {command:"npm run dev",url:baseURL,env:{NEXT_PUBLIC_API_URL:apiUrl,NEXT_PUBLIC_WS_URL:apiUrl+"/ws"},reuseExistingServer:!process.env.CI,timeout:120000}
 ]
});
