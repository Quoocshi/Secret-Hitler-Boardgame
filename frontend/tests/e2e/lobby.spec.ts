import { expect, test } from "@playwright/test";
import { players } from "./support/players";
test.setTimeout(180000);
async function ownState(page: import("@playwright/test").Page) {
  const identity = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hboardgame.identity")!),
  );
  const response = await page.request.get(
    (process.env.E2E_API_URL ?? "http://localhost:8081") +
      "/api/rooms/" +
      identity.roomCode +
      "/state",
    { headers: { "X-Session-Token": identity.sessionToken } },
  );
  return response.json();
}
async function enter(
  page: import("@playwright/test").Page,
  name: string,
  code?: string,
) {
  await page.goto("/");
  await page.getByLabel("Tên của bạn").fill(name);
  if (code) {
    await page.getByLabel("Mã phòng").fill(code);
    await page.getByRole("button", { name: "Vào phòng", exact: true }).click();
  } else
    {await page.getByRole("button", { name: "Tạo phòng", exact: true }).click();}
  await expect(page.getByTestId("connection")).toHaveText("Đã đồng bộ", {
    timeout: 15000,
  });
}
for (const count of [5, 10] as const)
  {test(`${count} members create/join/start and reload without a new identity`, async ({
    browser,
  }) => {
    const group = await players(browser, count);
    try {
      await enter(group.pages[0], "Bạn 1");
      const code = await group.pages[0].getByTestId("room-code").innerText();
      await expect(
        group.pages[0].getByRole("button", { name: "Bắt đầu ván" }),
      ).toBeDisabled();
      await group.pages[0].evaluate(() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: () => Promise.reject(new Error("unavailable")) },
        });
      });
      await group.pages[0].getByRole("button", { name: "Sao chép mã" }).click();
      await expect(group.pages[0].getByRole("status")).toContainText("Ctrl+C");
      for (let i = 1; i < count; i++)
        {await enter(group.pages[i], `Bạn ${i + 1}`, code.toLowerCase());}
      for (const page of group.pages)
        {await expect(page.getByTestId("member-count")).toHaveText(
          `${count}/10`,
        );}
      const outsider = await browser.newContext();
      const extra = await outsider.newPage();
      await extra.goto("/");
      await extra
        .getByLabel("Tên của bạn")
        .fill(count === 10 ? "Người 11" : "bạn 1");
      await extra.getByLabel("Mã phòng").fill(code);
      await extra
        .getByRole("button", { name: "Vào phòng", exact: true })
        .click();
      await expect(extra.locator("main").getByRole("alert")).toContainText(
        count === 10 ? "đủ 10" : "đã có",
      );
      await expect(extra.getByLabel("Tên của bạn")).toHaveValue(
        count === 10 ? "Người 11" : "bạn 1",
      );
      await outsider.close();
      const identity = await group.pages[0].evaluate(() =>
        localStorage.getItem("hboardgame.identity"),
      );
      await group.pages[0].reload();
      await expect(group.pages[0].getByTestId("connection")).toHaveText(
        "Đã đồng bộ",
        { timeout: 15000 },
      );
      expect(
        await group.pages[0].evaluate(() =>
          localStorage.getItem("hboardgame.identity"),
        ),
      ).toBe(identity);
      await expect(
        group.pages[0].getByRole("button", { name: "Bắt đầu ván" }),
      ).toHaveCount(0);
      const host = (
        await Promise.all(
          group.pages.map(async (page) =>
            (await page.getByRole("button", { name: "Bắt đầu ván" }).count())
              ? page
              : null,
          ),
        )
      ).find(Boolean)!;
      await host.getByRole("button", { name: "Bắt đầu ván" }).click();
      for (const page of group.pages)
        {await expect(page.getByTestId("phase")).toHaveAttribute(
          "data-phase",
          "NOMINATION",
        );}
      const before = await group.pages[0]
        .getByTestId("room-screen")
        .getAttribute("data-player-id");
      const role = (await ownState(group.pages[0])).myRole;
      await group.pages[0].reload();
      await expect(group.pages[0].getByTestId("connection")).toHaveText(
        "Đã đồng bộ",
        { timeout: 15000 },
      );
      await expect(group.pages[0].getByTestId("room-screen")).toHaveAttribute(
        "data-player-id",
        before!,
      );
      await expect(group.pages[0].getByTestId("member-count")).toHaveText(
        `${count}/10`,
      );
      expect((await ownState(group.pages[0])).myRole).toBe(role);
      const lateContext = await browser.newContext();
      const late = await lateContext.newPage();
      await late.goto("/");
      await late.getByLabel("Tên của bạn").fill("Người đến muộn");
      await late.getByLabel("Mã phòng").fill(code);
      await late
        .getByRole("button", { name: "Vào phòng", exact: true })
        .click();
      await expect(late.locator("main").getByRole("alert")).toContainText(
        "đã bắt đầu",
      );
      await lateContext.close();
    } finally {
      await group.close();
    }
  });}
test("entry errors retain input, direct room URL does not silently join", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tạo phòng", exact: true }).click();
  await expect(page.getByLabel("Tên của bạn")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Tên của bạn").fill("Giữ tên");
  await page.getByLabel("Mã phòng").fill("XX");
  await page.getByRole("button", { name: "Vào phòng", exact: true }).click();
  await expect(page.getByLabel("Mã phòng")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("Mã phòng").fill("ABC234");
  await page.getByRole("button", { name: "Vào phòng", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("Phòng");
  await expect(page.getByLabel("Tên của bạn")).toHaveValue("Giữ tên");
  await page.goto("/room/ABC234");
  await expect(page.getByLabel("Mã phòng")).toHaveValue("ABC234");
});
test("duplicate tab is blocked before membership mutation", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await enter(page, "Một phiên");
    const code = await page.getByTestId("room-code").innerText();
    const other = await context.newPage();
    await other.goto("/room/" + code);
    await expect(other.locator("main").getByRole("alert")).toContainText(
      "tab khác",
    );
    await expect(page.getByTestId("member-count")).toHaveText("1/10");
  } finally {
    await context.close();
  }
});
