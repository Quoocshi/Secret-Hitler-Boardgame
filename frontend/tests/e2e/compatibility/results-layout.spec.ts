import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

function finishedRoom() {
  const snapshot = mockView({
    currentPhase: "GAME_OVER",
    winner: "LIBERAL",
    winReason: "Phe Tự do đã ban hành đủ 5 chính sách.",
    enactedLiberalPolicies: 5,
    enactedFascistPolicies: 3,
  });
  snapshot.players = snapshot.players.map((player, index) => ({
    ...player,
    nickname: ["Minh Anh", "Quốc Huy", "Thanh Vũ", "Linh", "Hoàng Nam"][index],
    revealedRole: (
      ["LIBERAL", "FASCIST", "LIBERAL", "HITLER", "LIBERAL"] as const
    )[index],
  }));
  return snapshot;
}

test("public results: roles, rematch and history have distinct sections", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openMockRoom(page, finishedRoom());
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Phe Tự do chiến thắng",
  );
  await expect(page.getByTestId("revealed-roles").locator("li")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "Trở lại phòng chờ", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "Nhật ký công khai" }),
  ).not.toBeVisible();
  await page
    .getByText("Xem bàn chính sách và nhật ký ván đấu", { exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nhật ký công khai" }),
  ).toBeVisible();
  await expect(page.getByTestId("private-info")).toHaveCount(0);
});

test("public results: aborted games do not imply a winning faction or invented roles", async ({
  page,
}) => {
  await openMockRoom(
    page,
    mockView({
      currentPhase: "GAME_OVER",
      winner: "NONE",
      winReason: "Ván dừng do còn 4 người.",
    }),
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Ván đã dừng",
  );
  await expect(page.getByTestId("win-reason")).toHaveText(
    "Ván dừng do còn 4 người.",
  );
  await expect(page.getByTestId("revealed-roles")).toHaveCount(0);
  await expect(
    page.getByText("Hệ thống hiện chưa cung cấp danh sách vai trò cuối ván."),
  ).toBeVisible();
});

test("public results: ten long names fit a narrower window without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 900 });
  const snapshot = finishedRoom();
  snapshot.players = Array.from({ length: 10 }, (_, index) => ({
    ...snapshot.players[index % 5],
    id: "p" + (index + 1),
    isHost: index === 0,
    nickname: "Tênngườichơirấtdàikhôngcódấucách" + index,
  }));
  await openMockRoom(page, snapshot);
  await expect(page.getByTestId("revealed-roles").locator("li")).toHaveCount(
    10,
  );
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
  await expect(
    page.getByRole("button", { name: "Trở lại phòng chờ", exact: true }),
  ).toBeEnabled();
});
