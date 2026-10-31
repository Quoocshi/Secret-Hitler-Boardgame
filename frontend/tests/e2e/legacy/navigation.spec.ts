import { expect, test } from "@playwright/test";
import { createLobby } from "./support/room";

test("real BE: browser back resumes or leaves the current identity", async ({
  browser,
}) => {
  const group = await createLobby(browser, 1);
  try {
    const page = group.pages[0];
    await page.goBack();
    await expect(
      page.getByRole("link", { name: "Quay lại phòng" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Quay lại phòng" }).click();
    await expect(page.getByTestId("room-code")).toHaveText(group.roomCode);
  } finally {
    await group.close();
  }
});

test("real BE: a second tab cannot acquire the active room lock", async ({
  browser,
}) => {
  const group = await createLobby(browser, 1);
  try {
    const secondTab = await group.contexts[0].newPage();
    await secondTab.goto("/room/" + group.roomCode);
    await expect(
      secondTab.getByText("Phòng đang mở ở tab khác trong trình duyệt này.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      secondTab.getByRole("button", { name: "Bắt đầu ván", exact: true }),
    ).toHaveCount(0);
    await secondTab
      .getByRole("button", { name: "Cài đặt", exact: true })
      .click();
    await secondTab
      .getByRole("button", { name: "Rời phòng", exact: true })
      .click();
    await secondTab
      .getByRole("dialog")
      .getByRole("button", { name: "Xác nhận", exact: true })
      .click();
    expect(
      await group.pages[0].evaluate(
        () => localStorage.getItem("hboardgame.identity") !== null,
      ),
    ).toBe(true);
    await secondTab.close();
    await expect(group.pages[0].getByTestId("connection")).toHaveText(
      "Đã đồng bộ",
    );
  } finally {
    await group.close();
  }
});
