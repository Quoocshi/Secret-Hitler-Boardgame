import { expect, test } from "@playwright/test";
import {
  createLobby,
  installNetworkFaults,
  nominate,
  ownState,
  startGame,
  waitOnline,
} from "./support/room";

test("real BE: losing transport after vote does not automatically replay SEND", async ({
  browser,
}) => {
  const group = await createLobby(browser, 5, installNetworkFaults);
  try {
    await startGame(group.pages);
    await nominate(group.pages);
    const page = group.pages[0];
    await page
      .getByRole("button", { name: "JA — Đồng ý", exact: true })
      .click();
    const before = await page.evaluate(() =>
      (
        window as unknown as { testActionCount: () => number }
      ).testActionCount(),
    );
    await group.contexts[0].setOffline(true);
    await page.evaluate(() =>
      (
        window as unknown as { closeTestSockets: () => void }
      ).closeTestSockets(),
    );
    await expect(page.getByTestId("connection")).toHaveText("Đang kết nối lại");
    await group.contexts[0].setOffline(false);
    await waitOnline(page);
    const after = await page.evaluate(() =>
      (
        window as unknown as { testActionCount: () => number }
      ).testActionCount(),
    );
    expect(after).toBe(before);
  } finally {
    await group.close();
  }
});

test("real BE: a dropped outgoing vote stays uncertain until manual sync, without replay", async ({
  browser,
}, testInfo) => {
  const group = await createLobby(browser, 5, installNetworkFaults);
  try {
    await startGame(group.pages);
    await nominate(group.pages);
    const page = group.pages[0];
    await page.evaluate(() =>
      (
        window as unknown as { dropNextTestAction: () => void }
      ).dropNextTestAction(),
    );
    const startedAt = Date.now();
    await page
      .getByRole("button", { name: "JA — Đồng ý", exact: true })
      .click();
    await expect(
      page.getByText("Chưa xác định được kết quả.", { exact: false }),
    ).toBeVisible({ timeout: 8000 });
    const noticeMs = Date.now() - startedAt;
    expect(noticeMs).toBeLessThanOrEqual(8000);
    const actionCount = await page.evaluate(() =>
      (
        window as unknown as { testActionCount: () => number }
      ).testActionCount(),
    );
    const snapshot = await ownState(page);
    expect(
      snapshot.players.find((player) => player.id === snapshot.myPlayerId)
        ?.hasVoted,
    ).toBe(false);
    await page
      .getByRole("button", { name: "Đồng bộ trạng thái", exact: true })
      .evaluate((button) => {
        const syncButton = button as HTMLButtonElement;
        syncButton.click();
        syncButton.click();
      });
    await waitOnline(page);
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { testActionCount: () => number }
        ).testActionCount(),
      ),
    ).toBe(actionCount);
    await expect(
      page.getByRole("button", { name: "JA — Đồng ý", exact: true }),
    ).toBeEnabled();
    await testInfo.attach("uncertain-notice-ms", {
      body: String(noticeMs),
      contentType: "text/plain",
    });
  } finally {
    await group.close();
  }
});
