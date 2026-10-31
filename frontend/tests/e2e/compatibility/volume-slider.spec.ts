import { expect, test } from "@playwright/test";

for (const width of [360, 1280]) {
  test(`volume defaults to 80 and drags over the full range at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.goto("/");
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    const slider = page.getByRole("slider", { name: "Âm lượng hiệu ứng" });
    await expect(slider).toHaveValue("80");
    await expect(slider).toHaveAttribute("aria-valuetext", "80%");
    const heading = page.locator(".sound-volume-heading");
    const bounds = await slider.boundingBox();
    const headingBounds = await heading.boundingBox();
    expect(bounds).not.toBeNull();
    expect(headingBounds).not.toBeNull();
    expect(Math.abs(bounds!.width - headingBounds!.width)).toBeLessThanOrEqual(
      1,
    );

    const left = bounds!.x + 8;
    const right = bounds!.x + bounds!.width - 8;
    const middle = bounds!.y + bounds!.height / 2;
    await slider.press("Home");
    await expect(slider).toHaveValue("0");
    await page.mouse.move(left, middle);
    await page.mouse.down();
    await page.mouse.move(right, middle, { steps: 16 });
    await page.mouse.up();
    await expect(slider).toHaveValue("100");
    await expect(slider).toHaveAttribute("aria-valuetext", "100%");
    await page.mouse.down();
    await page.mouse.move(left, middle, { steps: 16 });
    await page.mouse.up();
    await expect(slider).toHaveValue("0");
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("hboardgame.sound")!).volume,
      ),
    ).toBe(0);
    await page.reload();
    await page.getByRole("button", { name: "Cài đặt", exact: true }).click();
    await expect(slider).toHaveValue("0");
  });
}
