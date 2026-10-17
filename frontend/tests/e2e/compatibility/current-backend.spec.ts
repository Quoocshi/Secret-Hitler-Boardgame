import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

test("current BE mock: investigation stays private and finishes through end-action", async ({
  page,
}) => {
  const snapshot = mockView({
    currentPhase: "EXECUTIVE_ACTION",
    pendingExecutiveAction: "INVESTIGATE_LOYALTY",
    investigatedPlayerId: "p2",
    investigatedPartyMembership: "LIBERAL",
  });
  snapshot.players[1].isInvestigated = true;
  const room = await openMockRoom(page, snapshot);
  const result = page.locator(
    '.game-players [data-player-id="p2"] [data-testid="investigation-result"]',
  );
  await expect(result).toContainText("Chỉ bạn thấy");
  await expect(result).toContainText("Đảng phái: Tự do");
  await expect(page.locator(".action-panel .player-investigation")).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Đã xem kết quả", exact: true })
    .click();
  expect(room.sentActions).toEqual(["/app/room/ABC234/end-action"]);
  room.update({
    ...snapshot,
    currentPhase: "NOMINATION",
    currentPresidentId: "p3",
    pendingExecutiveAction: "NONE",
    investigatedPlayerId: null,
    investigatedPartyMembership: null,
  });
  await expect(
    page.getByRole("button", { name: "Đã xem kết quả" }),
  ).toHaveCount(0);
  await expect(result).toBeVisible();
  expect(
    await page.evaluate(() =>
      [...Object.values(localStorage), ...Object.values(sessionStorage)].join(
        " ",
      ),
    ),
  ).not.toMatch(/privateInvestigations|investigatedPartyMembership/);
  await page.reload();
  await expect(page.getByTestId("connection")).toHaveText("Đã đồng bộ");
  await expect(result).toHaveCount(0);
});

test("current BE mock: other members cannot see a private investigation from public flags", async ({
  page,
}) => {
  const snapshot = mockView({
    currentPhase: "EXECUTIVE_ACTION",
    pendingExecutiveAction: "INVESTIGATE_LOYALTY",
    myPlayerId: "p3",
    investigatedPlayerId: "p2",
    investigatedPartyMembership: "LIBERAL",
  });
  snapshot.players[1].isInvestigated = true;
  await openMockRoom(page, snapshot);
  await expect(page.getByTestId("investigation-result")).toHaveCount(0);
  await expect(page.locator(".game-players")).not.toContainText("Đảng phái:");
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
