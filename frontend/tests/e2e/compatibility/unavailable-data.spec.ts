import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

test("FE mock: no supplemental fields are needed to render the room", async ({
  page,
}) => {
  await openMockRoom(page);
  await expect(page.getByTestId("member-count")).toHaveText("5/10");
});

test("FE mock: an investigation action explains that no private result is supplied", async ({
  page,
}) => {
  await openMockRoom(
    page,
    mockView({
      currentPhase: "EXECUTIVE_ACTION",
      pendingExecutiveAction: "INVESTIGATE_LOYALTY",
      // A legacy party value has no target/history binding and must not become a result panel.
      investigatedPartyMembership: "FASCIST",
    }),
  );
  await expect(
    page.getByText("Chưa có kết quả điều tra trong lượt này.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("investigations")).toHaveCount(0);
});

for (const winner of ["LIBERAL", "FASCIST"]) {
  test(`FE mock: ${winner} result does not invent full roles`, async ({
    page,
  }) => {
    await openMockRoom(
      page,
      mockView({
        currentPhase: "GAME_OVER",
        winner,
        winReason: "Kết thúc ván thử",
      }),
    );
    await expect(page.getByTestId("game-result")).toBeVisible();
    await expect(
      page.getByText("Hệ thống hiện chưa cung cấp danh sách vai trò cuối ván."),
    ).toBeVisible();
    await expect(page.getByTestId("private-info")).toHaveCount(0);
  });
}

test("FE mock: timeout never claims an unrelated snapshot acknowledged the action", async ({
  page,
}) => {
  const room = await openMockRoom(page, mockView({ currentPhase: "VOTING" }));
  const startedAt = Date.now();
  await page.getByRole("button", { name: "JA — Đồng ý", exact: true }).click();
  await expect(
    page.getByText("Chưa xác định được kết quả.", { exact: false }),
  ).toBeVisible({ timeout: 8000 });
  expect(Date.now() - startedAt).toBeLessThanOrEqual(8000);
  expect(room.sentActions).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "Đồng bộ trạng thái" }),
  ).toBeVisible();
});

test("FE mock: veto availability stays unknown after reload, not persisted", async ({
  page,
}) => {
  await openMockRoom(
    page,
    mockView({
      currentPhase: "LEGISLATIVE_CHANCELLOR",
      currentChancellorId: "p1",
      enactedFascistPolicies: 5,
      handCards: ["LIBERAL", "FASCIST"],
    }),
  );
  const veto = page.getByRole("button", { name: "Yêu cầu veto", exact: true });
  await expect(veto).toBeEnabled();
  await expect(
    page.getByText("Máy chủ quyết định veto còn khả dụng hay không", {
      exact: false,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("connection")).toHaveText("Đã đồng bộ");
  await expect(veto).toBeEnabled();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) =>
        /veto|snapshot|role|hand/i.test(key),
      ),
    ),
  ).toBe(false);
});

test("FE mock: an observed veto request prevents a second request after rejection", async ({
  page,
}) => {
  const room = await openMockRoom(
    page,
    mockView({
      currentPhase: "VETO_CONFIRMATION",
      currentChancellorId: "p1",
      enactedFascistPolicies: 5,
    }),
  );
  room.update(
    mockView({
      currentPhase: "LEGISLATIVE_CHANCELLOR",
      currentChancellorId: "p1",
      enactedFascistPolicies: 5,
      handCards: ["LIBERAL", "FASCIST"],
    }),
  );
  await expect(
    page.getByRole("button", { name: "Yêu cầu veto", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("Đã quan sát yêu cầu veto trong lượt này.", {
      exact: false,
    }),
  ).toBeVisible();
});

test("FE mock: missing legislative cards keep the room visible with actions disabled", async ({
  page,
}) => {
  await openMockRoom(
    page,
    mockView({ currentPhase: "LEGISLATIVE_PRESIDENT", handCards: [] }),
  );
  await expect(page.getByTestId("room-screen")).toBeVisible();
  await expect(
    page.getByText("Chưa nhận đủ lá bài.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bỏ lá đã chọn", exact: true }),
  ).toBeDisabled();
});
