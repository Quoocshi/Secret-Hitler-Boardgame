import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

test("chancellor picker: names, eligibility and selection remain separate from nomination", async ({
  page,
}) => {
  const snapshot = mockView({
    currentPhase: "NOMINATION",
    lastElectedChancellorId: "p2",
    eligibleChancellorIds: ["p3", "p5"],
  });
  snapshot.players[3].isAlive = false;
  const room = await openMockRoom(page, snapshot);
  const picker = page.getByRole("combobox", { name: "Ứng viên Thủ tướng" });
  await picker.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(page.getByRole("option")).toHaveCount(5);
  await expect(
    page.locator('[role="option"][data-player-id="p1"]'),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(
    page.locator('[role="option"][data-player-id="p1"]'),
  ).toContainText("Tổng thống hiện tại");
  await expect(
    page.locator('[role="option"][data-player-id="p2"]'),
  ).toContainText("Thủ tướng lượt trước");
  await expect(
    page.locator('[role="option"][data-player-id="p4"]'),
  ).toContainText("đã bị loại");
  await expect(page.getByRole("option").first()).toHaveAttribute(
    "data-player-id",
    "p3",
  );
  await page.locator('[role="option"][data-player-id="p3"]').click();
  await expect(picker).toContainText("P3");
  await expect(picker).toHaveAttribute("aria-expanded", "false");
  expect(room.sentActions).toEqual([]);
  await page.getByRole("button", { name: "Đề cử", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("P3");
  expect(room.sentActions).toEqual([]);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  expect(room.sentActions).toEqual(["/app/room/ABC234/nominate"]);
});

test("chancellor picker: keyboard navigation, dismissal and trigger toggle", async ({
  page,
}) => {
  await openMockRoom(page, mockView({ currentPhase: "NOMINATION" }));
  const picker = page.getByRole("combobox", { name: "Ứng viên Thủ tướng" });
  await picker.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(picker).toContainText("P3");
  await expect(picker).toBeFocused();
  await picker.click();
  await expect(
    page.locator('[aria-selected="true"][role="option"]'),
  ).toHaveAttribute("data-player-id", "p3");
  await page.keyboard.press("Escape");
  await expect(picker).toHaveAttribute("aria-expanded", "false");
  await picker.click();
  await picker.click();
  await expect(picker).toHaveAttribute("aria-expanded", "false");
  await picker.click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(picker).toHaveAttribute("aria-expanded", "false");
});

test("chancellor picker: ten long names stay attached to the trigger inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const snapshot = mockView({ currentPhase: "NOMINATION" });
  snapshot.players = Array.from({ length: 10 }, (_, index) => ({
    ...snapshot.players[index % 5],
    id: "p" + (index + 1),
    isHost: index === 0,
    nickname: "Người chơi có tên dài Nguyễn Minh Anh " + index,
  }));
  await openMockRoom(page, snapshot);
  const picker = page.getByRole("combobox", { name: "Ứng viên Thủ tướng" });
  await picker.click();
  async function checkBounds() {
    const popup = await page.locator(".candidate-popover").boundingBox();
    const trigger = await picker.boundingBox();
    expect(popup).not.toBeNull();
    expect(trigger).not.toBeNull();
    expect(popup!.x).toBeGreaterThanOrEqual(0);
    expect(popup!.y).toBeGreaterThanOrEqual(0);
    const size = page.viewportSize()!;
    expect(popup!.x + popup!.width).toBeLessThanOrEqual(size.width);
    expect(popup!.y + popup!.height).toBeLessThanOrEqual(size.height);
    const distance = Math.min(
      Math.abs(popup!.y - trigger!.y - trigger!.height),
      Math.abs(trigger!.y - popup!.y - popup!.height),
    );
    expect(distance).toBeLessThanOrEqual(8);
  }
  await checkBounds();
  await page.setViewportSize({ width: 1100, height: 650 });
  await expect(checkBounds).toPass({ timeout: 3000 });
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(picker).toContainText("Người chơi có tên dài");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight + 1,
    ),
  ).toBe(true);
});

test("chancellor picker: no candidate can be chosen when the server supplies an empty eligible list", async ({
  page,
}) => {
  const room = await openMockRoom(
    page,
    mockView({ currentPhase: "NOMINATION", eligibleChancellorIds: [] }),
  );
  const picker = page.getByRole("combobox", { name: "Ứng viên Thủ tướng" });
  await picker.click();
  await expect(
    page.locator('[role="option"][aria-disabled="true"]'),
  ).toHaveCount(5);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Đề cử", exact: true }),
  ).toBeDisabled();
  expect(room.sentActions).toEqual([]);
});
