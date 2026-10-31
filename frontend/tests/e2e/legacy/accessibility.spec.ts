import { expect, test } from "@playwright/test";
import { independentPlayers } from "./support/players";
import { waitOnline } from "./support/room";

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test(`real BE: lobby and leave confirmation use keyboard at ${viewport.width}`, async ({
    browser,
  }) => {
    const group = await independentPlayers(browser, 2);
    try {
      const page = group.pages[0];
      await page.setViewportSize(viewport);
      await page.goto("/");
      const nickname = page.getByLabel("Tên của bạn");
      await nickname.fill("Bàn phím 1");
      await nickname.press("Enter");
      await waitOnline(page);
      const roomCode = await page.getByTestId("room-code").innerText();
      const guest = group.pages[1];
      await guest.setViewportSize(viewport);
      await guest.goto("/");
      await guest.getByLabel("Tên của bạn").fill("Bàn phím 2");
      const codeInput = guest.getByLabel("Mã phòng");
      await codeInput.fill(roomCode);
      await codeInput.press("Enter");
      await waitOnline(guest);
      await expect(page.getByTestId("member-count")).toHaveText("2/10");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const settings = page.getByRole("button", {
        name: "Cài đặt",
        exact: true,
      });
      await settings.focus();
      await page.keyboard.press("Enter");
      const leave = page.getByRole("button", {
        name: "Rời phòng",
        exact: true,
      });
      await leave.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(settings).toBeFocused();
      await page.keyboard.press("Enter");
      await leave.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("button", { name: "Tạo phòng", exact: true }),
      ).toBeVisible();
    } finally {
      await group.close();
    }
  });
}
