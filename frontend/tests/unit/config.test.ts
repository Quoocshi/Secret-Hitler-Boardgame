import { expect,it } from "vitest";
import { config } from "@/lib/api/config";
it("uses public local development endpoints without credentials",()=>{ expect(config.apiUrl).toBe("http://localhost:8080"); expect(new URL(config.wsUrl).pathname).toBe("/ws"); });
