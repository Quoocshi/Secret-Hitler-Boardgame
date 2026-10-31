import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

test("FE mock: unconfirmed leave retains identity, closes private data, and never replays", async ({
  page,
}) => {
  const room = await openMockRoom(
    page,
    mockView({
      currentPhase: "LEGISLATIVE_PRESIDENT",
      handCards: ["LIBERAL", "FASCIST", "FASCIST"],
    }),
  );
  await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
  await page.getByRole("button", { name: "Rời phòng", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(page.getByTestId("connection")).toHaveText("Cần kiểm tra", {
    timeout: 10000,
  });
  await expect(
    page.getByText(
      "Chưa xác nhận được đã rời phòng. Phiên vẫn được giữ; hãy kết nối lại để kiểm tra. Yêu cầu không tự gửi lại.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => localStorage.getItem("hboardgame.identity") !== null,
    ),
  ).toBe(true);
  await expect(page.getByTestId("private-info")).toHaveCount(0);
  await expect(page.getByTestId("hand-card")).toHaveCount(0);
  expect(room.sentActions).toEqual(["/app/room/ABC234/leave"]);
});
