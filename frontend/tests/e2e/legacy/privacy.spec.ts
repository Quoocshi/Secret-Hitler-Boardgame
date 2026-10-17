import { expect, test } from "@playwright/test";
import { createLobby, ownState, startGame } from "./support/room";

for (const count of [5, 6, 7, 10]) {
  test(`real BE: ${count} own views keep private information off public UI and storage`, async ({
    browser,
  }) => {
    const group = await createLobby(browser, count);
    try {
      await startGame(group.pages);
      for (const page of group.pages) {
        const snapshot = await ownState(page);
        expect(
          snapshot.players.every(
            (player) => !("role" in player) && !("sessionToken" in player),
          ),
        ).toBe(true);
        await expect(page.locator("#private-role")).toHaveCount(0);
        await expect(page.getByTestId("hand-card")).toHaveCount(0);
        const persisted = await page.evaluate(() =>
          Object.values(localStorage).join(" "),
        );
        expect(/handCards|myRole|investigationResults/.test(persisted)).toBe(
          false,
        );
      }
    } finally {
      await group.close();
    }
  });
}
