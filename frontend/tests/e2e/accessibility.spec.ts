import { expect, test, type Page } from "@playwright/test";
import { fixtureGroup, seed, confirm } from "./support/fixtures";
import { syncGroup } from "./support/room";
async function layout(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("main button")
      .evaluateAll((buttons) =>
        buttons.every(
          (button) =>
            !!(button.textContent?.trim() || button.getAttribute("aria-label")),
        ),
      ),
  ).toBe(true);
  expect(
    await page
      .locator("main input:not([readonly]),main select")
      .evaluateAll((fields) =>
        fields.every(
          (field) =>
            !!field.id && !!document.querySelector(`label[for="${field.id}"]`),
        ),
      ),
  ).toBe(true);
}
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
])
  {test(
    "keyboard, focus and every-phase layout " + viewport.width,
    async ({ browser, request }) => {
      const entry = await browser.newContext({ viewport });
      const page = await entry.newPage();
      await page.goto("/");
      await layout(page);
      await page.getByLabel("Tên của bạn").focus();
      await page.keyboard.type("Keyboard");
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() => document.activeElement?.tagName),
      ).not.toBe("BODY");
      await entry.close();
      const group = await fixtureGroup(browser, request, "deterministic-lobby");
      try {
        for (const p of group.pages) {await p.setViewportSize(viewport);}
        await syncGroup(group.pages);
        await layout(group.pages[0]);
        for (const scenario of [
          "nomination",
          "legislative-president",
          "legislative-chancellor",
          "veto-confirmation",
          "investigation",
          "policy-peek",
          "special-election",
          "execution",
        ]) {
          await seed(request, group.roomCode, scenario);
          await syncGroup(group.pages);
          for (const p of group.pages) {await layout(p);}
          expect(
            await group.pages[0].getByTestId("phase").innerText(),
          ).toContain("Đang chờ");
          expect(
            await group.pages[0]
              .getByTestId("private-info")
              .locator('[role="status"],[aria-live]')
              .count(),
          ).toBe(0);
        }
        const president = group.pages[0];
        await president
          .getByLabel("Mục tiêu quyền lực")
          .selectOption(group.players[1].playerId);
        const trigger = president.getByRole("button", {
          name: "Xử bắn",
          exact: true,
        });
        await trigger.focus();
        await president.keyboard.press("Enter");
        const dialog = president.getByRole("dialog", {
          name: "Xác nhận xử bắn",
        });
        await expect(dialog).toBeVisible();
        await expect(
          dialog.getByRole("button", { name: "Hủy", exact: true }),
        ).toBeFocused();
        await president.keyboard.press("Shift+Tab");
        await expect(
          dialog.getByRole("button", { name: "Xác nhận", exact: true }),
        ).toBeFocused();
        await president.keyboard.press("Tab");
        await expect(
          dialog.getByRole("button", { name: "Hủy", exact: true }),
        ).toBeFocused();
        await president.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await seed(request, group.roomCode, "nomination");
        await syncGroup(group.pages);
        await president
          .getByLabel("Ứng viên Thủ tướng")
          .selectOption(group.players[1].playerId);
        await confirm(president, "Đề cử");
        await syncGroup(group.pages);
        for (const p of group.pages) {await layout(p);}
        await seed(request, group.roomCode, "near-liberal-win");
        await syncGroup(group.pages);
        await group.pages[1]
          .getByRole("button", { name: "Lá 2 — Tự do", exact: true })
          .click();
        await confirm(group.pages[1], "Ban hành lá đã chọn");
        await syncGroup(group.pages);
        for (const p of group.pages) {
          await expect(p.getByTestId("game-result")).toBeVisible();
          await layout(p);
        }
      } finally {
        await group.close();
      }
    },
  );}
