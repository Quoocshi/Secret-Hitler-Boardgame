import { expect, test } from "@playwright/test";
test("browser Back offers resume or explicit leave for an active room", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Tên của bạn").fill("Navigation");
  await page.getByRole("button", { name: "Tạo phòng", exact: true }).click();
  await expect(page.getByTestId("connection")).toHaveText("Đã đồng bộ");
  const code = await page.getByTestId("room-code").innerText();
  await page.goBack();
  await expect(
    page.getByRole("link", { name: "Quay lại phòng", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tạo phòng", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Quay lại phòng", exact: true }).click();
  await expect(page.getByTestId("room-code")).toHaveText(code);
  await page.goBack();
  await page.getByRole("button", { name: "Rời phòng", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tạo phòng", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("hboardgame.identity")),
  ).toBeNull();
});
