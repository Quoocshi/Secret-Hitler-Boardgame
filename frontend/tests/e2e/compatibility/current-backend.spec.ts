import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

test("current BE mock: investigation stays private and finishes through end-action", async ({
  page,
}) => {
  const room = await openMockRoom(
    page,
    mockView({
      currentPhase: "EXECUTIVE_ACTION",
      pendingExecutiveAction: "INVESTIGATE_LOYALTY",
      investigatedPlayerId: "p2",
      investigatedPartyMembership: "LIBERAL",
    }),
  );
  await expect(page.getByTestId("investigation-result")).toBeVisible();
  await page
    .getByRole("button", { name: "Đã xem kết quả", exact: true })
    .click();
  expect(room.sentActions).toEqual(["/app/room/ABC234/end-action"]);
});

test("current BE mock: supplied public roles appear at game over", async ({
  page,
}) => {
  const snapshot = mockView({
    currentPhase: "GAME_OVER",
    winner: "FASCIST",
    winReason: "Ván đã kết thúc",
  });
  snapshot.players = snapshot.players.map((player) => ({
    ...player,
    revealedRole: "LIBERAL",
  }));
  await openMockRoom(page, snapshot);
  await expect(page.getByTestId("revealed-roles").locator("li")).toHaveCount(5);
  await expect(page.getByTestId("private-info")).toHaveCount(0);
});

test("React SPA: direct room URL and reload preserve routing", async ({
  page,
}) => {
  await openMockRoom(page);
  await page.goto("/room/abc234");
  await page.reload();
  await expect(page.getByTestId("room-code")).toHaveText("ABC234");
  await expect(page.getByTestId("connection")).toHaveText("Đã đồng bộ");
});
