import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

test("FE mock: guests see the named host and the player badge", async ({
  page,
}) => {
  const snapshot = mockView({ myPlayerId: "p2" });
  await openMockRoom(page, snapshot);

  await expect(page.getByTestId("room-host")).toHaveText("Chủ phòng: P1");
  await expect(
    page.locator(".lobby-players .badge").filter({ hasText: /^Chủ phòng$/ }),
  ).toHaveCount(1);
  await expect(
    page.getByText("Đang chờ P1 (chủ phòng) bắt đầu ván."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bắt đầu ván", exact: true }),
  ).toHaveCount(0);
});

test("FE mock: a room without a host explains why it cannot start", async ({
  page,
}) => {
  const snapshot = mockView();
  snapshot.players = snapshot.players.map((player) => ({
    ...player,
    isHost: false,
  }));
  await openMockRoom(page, snapshot);

  await expect(page.getByTestId("missing-host-notice")).toHaveText(
    "Phòng hiện không có chủ phòng nên chưa thể bắt đầu ván. Hãy rời phòng và tạo phòng mới.",
  );
  await expect(page.getByTestId("room-host")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Bắt đầu ván", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Đang chờ chủ phòng bắt đầu ván.", { exact: true }),
  ).toHaveCount(0);
});

test("FE mock: the host summary and start control follow a host transfer", async ({
  page,
}) => {
  const snapshot = mockView();
  const room = await openMockRoom(page, snapshot);
  await expect(page.getByTestId("room-host")).toHaveText("Chủ phòng: P1 (Bạn)");
  await expect(
    page.getByRole("button", { name: "Bắt đầu ván", exact: true }),
  ).toBeEnabled();

  room.update({
    ...snapshot,
    players: snapshot.players.map((player) => ({
      ...player,
      isHost: player.id === "p2",
    })),
  });

  await expect(page.getByTestId("room-host")).toHaveText("Chủ phòng: P2");
  await expect(
    page.getByRole("button", { name: "Bắt đầu ván", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Đang chờ P2 (chủ phòng) bắt đầu ván."),
  ).toBeVisible();
});
