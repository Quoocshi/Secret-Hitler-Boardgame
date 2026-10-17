import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // SockJS uses Node's global name for Web Crypto; browsers expose it as globalThis.
  define: { global: "globalThis" },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 3000,
    strictPort: true,
    // Network-fault tests must not trigger the dev client's automatic page reload.
    hmr: process.env.E2E_DISABLE_HMR === "1" ? false : undefined,
  },
  preview: { port: 3000, strictPort: true },
});
