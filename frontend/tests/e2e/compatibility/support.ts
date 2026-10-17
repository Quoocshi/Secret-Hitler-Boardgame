import { expect, type Page } from "@playwright/test";
import { legacyView } from "../../support/legacy-view";

// Apply in workers as well as the config loader: failed tests must not snapshot private views.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export function mockView(overrides: Record<string, unknown> = {}) {
  const players = Array.from({ length: 5 }, (_, index) => ({
    ...legacyView().players[0],
    id: "p" + (index + 1),
    nickname: "P" + (index + 1),
    isHost: index === 0,
  }));
  return legacyView({
    players,
    currentPresidentId: "p1",
    currentChancellorId: "p2",
    ...overrides,
  });
}

/** Mock only the public transport contract; this is not evidence of a real BE action. */
export async function openMockRoom(page: Page, snapshot = mockView()) {
  let current = snapshot;
  const sentActions: string[] = [];
  await page.route("http://localhost:18082/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = current;
    if (path.endsWith("/ws/info")) {
      body = {
        websocket: true,
        cookie_needed: false,
        origins: ["*:*"],
        entropy: 1234,
      };
    }
    if (path.endsWith("/join")) {
      body = { roomCode: current.roomCode, gameState: current };
    }
    const headers = {
      "Access-Control-Allow-Origin": "http://localhost:3101",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type,X-Session-Token",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
    } else {
      await route.fulfill({ json: body, headers });
    }
  });
  await page.routeWebSocket(/localhost:18082\/ws\//, (socket) => {
    socket.send("o");
    socket.onMessage((message) => {
      const frames = JSON.parse(String(message)) as string[];
      for (const frame of frames) {
        if (frame.startsWith("CONNECT")) {
          socket.send(
            "a" +
              JSON.stringify([
                "CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000",
              ]),
          );
        }
        if (frame.startsWith("SEND")) {
          sentActions.push(
            frame.match(/destination:([^\n]+)/)?.[1] ?? "unknown",
          );
        }
      }
    });
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "hboardgame.identity",
      JSON.stringify({
        schemaVersion: 1,
        roomCode: "ABC234",
        nickname: "P1",
        sessionToken: "11111111-1111-4111-8111-111111111111",
      }),
    );
  });
  await page.goto("/room/ABC234");
  await expect(page.getByTestId("connection")).toHaveText("Đã đồng bộ");
  return {
    update(next: typeof snapshot) {
      current = next;
    },
    sentActions,
  };
}
