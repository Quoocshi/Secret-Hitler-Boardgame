import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

test("settings groups sound and leave behind the supplied icon, preserving confirmation", async ({
  page,
}) => {
  const room = await openMockRoom(
    page,
    mockView({ currentPhase: "NOMINATION" }),
  );
  const trigger = page.getByRole("button", { name: "Cài đặt", exact: true });
  await expect(trigger.locator("img")).toHaveAttribute(
    "src",
    "/images/settings.svg",
  );
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Rời phòng", exact: true }),
  ).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press("Enter");
  const settings = page.getByRole("dialog", { name: "Cài đặt", exact: true });
  await expect(settings).toBeVisible();
  await expect(
    settings.getByRole("slider", { name: "Âm lượng hiệu ứng" }),
  ).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await settings
    .getByRole("button", { name: "Rời phòng", exact: true })
    .click();
  await expect(settings).not.toBeVisible();
  const confirmation = page.getByRole("dialog", {
    name: "Rời bàn chơi?",
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  expect(room.sentActions).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(confirmation).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(room.sentActions).toEqual([]);
});

test("settings stays within narrow screens, closes outside and hides leave without a session", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Cài đặt", exact: true });
  await trigger.click();
  const settings = page.getByRole("dialog", { name: "Cài đặt", exact: true });
  await expect(settings).toBeVisible();
  expect(
    await settings.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        bounds.left >= 0 &&
        bounds.right <= innerWidth &&
        bounds.top >= 0 &&
        bounds.bottom <= innerHeight
      );
    }),
  ).toBe(true);
  await expect(
    settings.getByRole("button", { name: "Rời phòng", exact: true }),
  ).toHaveCount(0);
  await page.locator("h1").click();
  await expect(settings).not.toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await page.getByRole("button", { name: "Đóng cài đặt", exact: true }).click();
  await expect(settings).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
