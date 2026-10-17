import { expect, test } from "@playwright/test";
import { createLobby } from "./support/room";
import { playGame } from "./support/game-driver";

for (const count of [5, 10]) {
  test(`real BE: complete a ${count}-player game using only public actions`, async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240000);
    const group = await createLobby(browser, count);
    try {
      const coverage = await playGame(group.pages);
      for (const page of group.pages) {
        await expect(page.getByTestId("game-result")).toBeVisible();
        await expect(
          page.getByTestId("revealed-roles").locator("li"),
        ).toHaveCount(count);
      }
      await testInfo.attach("public-action-coverage", {
        body: JSON.stringify({ players: count, ...coverage }),
        contentType: "application/json",
      });
    } finally {
      await group.close();
    }
  });
}
