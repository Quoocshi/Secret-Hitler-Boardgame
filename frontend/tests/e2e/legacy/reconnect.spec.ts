import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { PlayerView } from "../../../src/lib/game/types";
import {
  actorPage,
  createLobby,
  installNetworkFaults,
  nominate,
  ownState,
  startGame,
  voteAll,
  waitOnline,
} from "./support/room";

async function expectRecoveredControls(page: Page, snapshot: PlayerView) {
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Rời phòng", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  if (snapshot.currentPhase === "VOTING") {
    await expect(
      page.getByRole("button", { name: "JA — Đồng ý", exact: true }),
    ).toBeEnabled();
  } else if (snapshot.currentPhase === "LEGISLATIVE_PRESIDENT") {
    await expect(page.getByTestId("hand-card")).toHaveCount(3);
    await page.getByTestId("hand-card").first().click();
    await expect(
      page.getByRole("button", { name: "Bỏ lá đã chọn", exact: true }),
    ).toBeEnabled();
  }
}

for (const phase of ["LOBBY", "VOTING", "LEGISLATIVE_PRESIDENT"]) {
  test(`real BE: reload preserves identity and presence in ${phase}`, async ({
    browser,
  }, testInfo) => {
    const group = await createLobby(browser, 5);
    try {
      if (phase !== "LOBBY") {
        await startGame(group.pages);
        await nominate(group.pages);
      }
      if (phase === "LEGISLATIVE_PRESIDENT") {
        await voteAll(group.pages, "JA");
      }
      const page =
        phase === "LEGISLATIVE_PRESIDENT"
          ? await actorPage(
              group.pages,
              (await ownState(group.pages[0])).currentPresidentId,
            )
          : group.pages[0];
      const before = await ownState(page);
      const startedAt = Date.now();
      await page.reload();
      await waitOnline(page);
      const after = await ownState(page);
      expect(after.myPlayerId === before.myPlayerId).toBe(true);
      expect(after.players.length).toBe(before.players.length);
      expect(
        after.players.find((player) => player.id === after.myPlayerId)
          ?.isConnected,
      ).toBe(true);
      await expectRecoveredControls(page, after);
      const recoveryMs = Date.now() - startedAt;
      expect(recoveryMs).toBeLessThanOrEqual(10000);
      await testInfo.attach("reload-ms", {
        body: String(recoveryMs),
        contentType: "text/plain",
      });
    } finally {
      await group.close();
    }
  });
}

for (const phase of ["LOBBY", "VOTING", "LEGISLATIVE_PRESIDENT"]) {
  test(`real BE: network recovery preserves membership in ${phase}`, async ({
    browser,
  }, testInfo) => {
    const group = await createLobby(browser, 5, installNetworkFaults);
    try {
      if (phase !== "LOBBY") {
        await startGame(group.pages);
        await nominate(group.pages);
      }
      if (phase === "LEGISLATIVE_PRESIDENT") {
        await voteAll(group.pages, "JA");
      }
      const page =
        phase === "LEGISLATIVE_PRESIDENT"
          ? await actorPage(
              group.pages,
              (await ownState(group.pages[0])).currentPresidentId,
            )
          : group.pages[0];
      const context = group.contexts[group.pages.indexOf(page)];
      const before = await ownState(page);
      await context.setOffline(true);
      await page.evaluate(() =>
        (
          window as unknown as { closeTestSockets: () => void }
        ).closeTestSockets(),
      );
      await expect(page.getByTestId("connection")).toHaveText(
        "Đang kết nối lại",
      );
      const startedAt = Date.now();
      await context.setOffline(false);
      await waitOnline(page);
      const after = await ownState(page);
      expect(after.myPlayerId === before.myPlayerId).toBe(true);
      expect(after.players.length).toBe(before.players.length);
      expect(
        after.players.find((player) => player.id === after.myPlayerId)
          ?.isConnected,
      ).toBe(true);
      await expectRecoveredControls(page, after);
      const recoveryMs = Date.now() - startedAt;
      expect(recoveryMs).toBeLessThanOrEqual(10000);
      await testInfo.attach("network-recovery-ms", {
        body: String(recoveryMs),
        contentType: "text/plain",
      });
    } finally {
      await group.close();
    }
  });
}
