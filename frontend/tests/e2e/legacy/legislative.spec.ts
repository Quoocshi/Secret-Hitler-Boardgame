import { expect, test } from "@playwright/test";
import {
  actorPage,
  confirm,
  createLobby,
  nominate,
  ownState,
  startGame,
  voteAll,
} from "./support/room";

test("real BE: president discards one indexed card and chancellor enacts", async ({
  browser,
}) => {
  const group = await createLobby(browser, 5);
  try {
    await startGame(group.pages);
    await nominate(group.pages);
    await voteAll(group.pages, "JA");
    await expect(group.pages[0].getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "LEGISLATIVE_PRESIDENT",
    );
    const snapshot = await ownState(group.pages[0]);
    const president = await actorPage(group.pages, snapshot.currentPresidentId);
    await expect(president.getByTestId("hand-card")).toHaveCount(3);
    await president.getByTestId("hand-card").nth(1).click();
    await confirm(president, "Bỏ lá đã chọn");
    const chancellor = await actorPage(
      group.pages,
      snapshot.currentChancellorId,
    );
    await expect(chancellor.getByTestId("hand-card")).toHaveCount(2);
    await chancellor.getByTestId("hand-card").first().click();
    await confirm(chancellor, "Ban hành lá đã chọn");
    await expect
      .poll(async () => {
        const updated = await ownState(chancellor);
        return updated.enactedLiberalPolicies + updated.enactedFascistPolicies;
      })
      .toBe(1);
    await expect(president.getByTestId("hand-card")).toHaveCount(0);
  } finally {
    await group.close();
  }
});
