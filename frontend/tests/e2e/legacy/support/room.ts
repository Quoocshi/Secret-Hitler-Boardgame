import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import type {
  PlayerView,
  SessionIdentity,
} from "../../../../src/lib/game/types";
import { independentPlayers } from "./players";

export const apiUrl = process.env.E2E_API_URL ?? "http://localhost:18081";

export async function ownState(page: Page): Promise<PlayerView> {
  const identity = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("hboardgame.identity")!,
      ) as SessionIdentity,
  );
  const response = await page.request.get(
    `${apiUrl}/api/rooms/${identity.roomCode}/state`,
    { headers: { "X-Session-Token": identity.sessionToken } },
  );
  if (!response.ok()) {
    throw new Error("Own state could not be loaded.");
  }
  return response.json();
}

export async function waitOnline(page: Page) {
  await expect(page.getByTestId("connection")).toHaveText("Đã đồng bộ", {
    timeout: 15000,
  });
}

export async function confirm(page: Page, buttonName: string) {
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
}

export async function createLobby(
  browser: Browser,
  count: number,
  setup?: (context: BrowserContext) => Promise<void>,
) {
  const group = await independentPlayers(browser, count);
  try {
    if (setup) {
      for (const context of group.contexts) {
        await setup(context);
      }
    }
    const host = group.pages[0];
    await host.goto("/");
    await host.getByLabel("Tên của bạn").fill("P1");
    await host.getByRole("button", { name: "Tạo phòng", exact: true }).click();
    await waitOnline(host);
    const roomCode = await host.getByTestId("room-code").innerText();
    const membershipTimings: number[] = [];
    for (let index = 1; index < count; index++) {
      const joiningPlayer = group.pages[index];
      await joiningPlayer.goto("/");
      await joiningPlayer.getByLabel("Tên của bạn").fill("P" + (index + 1));
      await joiningPlayer.getByLabel("Mã phòng").fill(roomCode);
      const startedAt = Date.now();
      await joiningPlayer
        .getByRole("button", { name: "Vào phòng", exact: true })
        .click();
      for (const page of group.pages.slice(0, index + 1)) {
        await expect(page.getByTestId("member-count")).toHaveText(
          `${index + 1}/10`,
          { timeout: 5000 },
        );
      }
      membershipTimings.push(Date.now() - startedAt);
      await waitOnline(joiningPlayer);
    }
    return { ...group, roomCode, membershipTimings };
  } catch (error) {
    await group.close();
    throw error;
  }
}

export async function installNetworkFaults(context: BrowserContext) {
  await context.addInitScript(() => {
    const sockets: WebSocket[] = [];
    const NativeWebSocket = window.WebSocket;
    let sentActionCount = 0;
    let dropNextAction = false;
    window.WebSocket = class extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        // Interrupt game transport only, never Vite's development socket.
        if (new URL(url, window.location.href).pathname.startsWith("/ws/")) {
          sockets.push(this);
        }
      }
      send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if (typeof data === "string" && data.includes("SEND")) {
          sentActionCount++;
          if (dropNextAction) {
            dropNextAction = false;
            return;
          }
        }
        super.send(data);
      }
    };
    Object.assign(window, {
      closeTestSockets: () =>
        sockets.forEach((socket) => socket.close(1000, "test interruption")),
      testActionCount: () => sentActionCount,
      dropNextTestAction: () => {
        dropNextAction = true;
      },
    });
  });
}

export async function startGame(pages: Page[]) {
  await pages[0]
    .getByRole("button", { name: "Bắt đầu ván", exact: true })
    .click();
  for (const page of pages) {
    await expect(page.getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "NOMINATION",
    );
  }
}

export async function actorPage(pages: Page[], playerId: string | null) {
  for (const page of pages) {
    if ((await ownState(page)).myPlayerId === playerId) {
      return page;
    }
  }
  throw new Error("The public actor has no test browser.");
}

export async function nominate(pages: Page[], nomineeId?: string) {
  const snapshot = await ownState(pages[0]);
  const president = await actorPage(pages, snapshot.currentPresidentId);
  const selector = president.getByRole("combobox", {
    name: "Ứng viên Thủ tướng",
  });
  await selector.click();
  const options = president.locator('[role="option"][aria-disabled="false"]');
  const target =
    nomineeId ?? (await options.first().getAttribute("data-player-id"));
  await president
    .locator(`[role="option"][data-player-id="${target}"]`)
    .click();
  await confirm(president, "Đề cử");
  for (const page of pages) {
    await expect(page.getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "VOTING",
    );
  }
}

export async function voteAll(pages: Page[], vote: "JA" | "NEIN") {
  const snapshot = await ownState(pages[0]);
  for (const player of snapshot.players.filter(
    (candidate) => candidate.isAlive,
  )) {
    const page = await actorPage(pages, player.id);
    await page
      .getByRole("button", {
        name: vote === "JA" ? "JA — Đồng ý" : "NEIN — Phản đối",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Đã gửi thao tác. Đang chờ bàn chơi cập nhật…", {
        exact: true,
      }),
    ).toHaveCount(0);
  }
}
