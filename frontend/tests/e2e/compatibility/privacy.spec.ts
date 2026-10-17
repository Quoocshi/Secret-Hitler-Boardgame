import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

test("FE mock: stale executive cards are removed before UI and storage", async ({
  page,
}) => {
  await openMockRoom(
    page,
    mockView({
      currentPhase: "EXECUTIVE_ACTION",
      pendingExecutiveAction: "EXECUTION",
      handCards: ["LIBERAL", "FASCIST", "LIBERAL"],
      myRole: "FASCIST",
    }),
  );
  await expect(page.getByTestId("hand-card")).toHaveCount(0);
  await expect(page.locator("#private-role")).toHaveCount(0);
  const stored = await page.evaluate(() =>
    Object.values(localStorage).join(" "),
  );
  expect(/handCards|myRole|investigationResults/.test(stored)).toBe(false);
});

test("FE mock: a stale confirmation closes when its action context changes", async ({
  page,
}) => {
  const room = await openMockRoom(
    page,
    mockView({ currentPhase: "NOMINATION" }),
  );
  await page.getByLabel("Ứng viên Thủ tướng").selectOption("p3");
  await page.getByRole("button", { name: "Đề cử", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  room.update(
    mockView({ currentPhase: "VOTING", nominatedChancellorId: "p3" }),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 5000 });
  expect(room.sentActions).toHaveLength(0);
});
