import { expect, test } from "@playwright/test";
import {
  createLobby,
  nominate,
  ownState,
  startGame,
  voteAll,
} from "./support/room";

test("real BE: a rejected government updates the board without command ACK", async ({
  browser,
}) => {
  const group = await createLobby(browser, 5);
  try {
    await startGame(group.pages);
    await nominate(group.pages);
    await voteAll(group.pages, "NEIN");
    for (const page of group.pages) {
      await expect(page.getByTestId("phase")).toHaveAttribute(
        "data-phase",
        "NOMINATION",
      );
      await expect(page.getByTestId("election-count")).toHaveText("1/3");
    }
    expect(
      (await ownState(group.pages[0])).players.filter(
        (player) => player.isAlive,
      ),
    ).toHaveLength(5);
  } finally {
    await group.close();
  }
});
