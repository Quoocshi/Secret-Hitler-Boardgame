import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test(`FE mock: keyboard confirmation and layout at ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openMockRoom(page, mockView({ currentPhase: "NOMINATION" }));
    const target = page.getByLabel("Ứng viên Thủ tướng");
    await target.focus();
    await target.selectOption("p3");
    const nominate = page.getByRole("button", { name: "Đề cử", exact: true });
    await nominate.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
