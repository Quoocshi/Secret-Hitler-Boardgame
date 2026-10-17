import { expect, test } from "@playwright/test";
import { createLobby, ownState, startGame, waitOnline } from "./support/room";

for (const count of [5, 10]) {
  test(`real BE: ${count} members appear without game actions`, async ({
    browser,
  }, testInfo) => {
    const group = await createLobby(browser, count);
    try {
      expect(Math.max(...group.membershipTimings)).toBeLessThanOrEqual(5000);
      await expect(
        group.pages[0].getByRole("button", {
          name: "Bắt đầu ván",
          exact: true,
        }),
      ).toBeEnabled();
      await testInfo.attach("membership-timing", {
        body: JSON.stringify(group.membershipTimings),
        contentType: "application/json",
      });
      if (count === 10) {
        const outsiderContext = await browser.newContext();
        try {
          const outsider = await outsiderContext.newPage();
          await outsider.goto("/");
          await outsider.getByLabel("Tên của bạn").fill("P11");
          await outsider.getByLabel("Mã phòng").fill(group.roomCode);
          await outsider
            .getByRole("button", { name: "Vào phòng", exact: true })
            .click();
          await expect(
            outsider.getByText("Phòng đã đủ 10 người.", { exact: true }),
          ).toBeVisible();
          await expect(outsider.getByLabel("Tên của bạn")).toHaveValue("P11");
          await startGame(group.pages);
          await outsider
            .getByRole("button", { name: "Vào phòng", exact: true })
            .click();
          await expect(
            outsider.getByText(
              "Phòng đã bắt đầu hoặc kết thúc ván nên chưa nhận người tham gia mới. Hãy nhờ chủ phòng chọn Trở lại phòng chờ sau khi ván kết thúc, rồi vào lại bằng mã phòng cũ.",
              { exact: true },
            ),
          ).toBeVisible();
        } finally {
          await outsiderContext.close();
        }
      }
    } finally {
      await group.close();
    }
  });
}

test("real BE: duplicate nickname keeps form input and returns a readable error", async ({
  browser,
}) => {
  const group = await createLobby(browser, 1);
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto("/");
    await page.getByLabel("Tên của bạn").fill("P1");
    await page.getByLabel("Mã phòng").fill(group.roomCode);
    await page.getByRole("button", { name: "Vào phòng", exact: true }).click();
    await expect(
      page.getByText("Tên này đã có trong phòng.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Tên của bạn")).toHaveValue("P1");
  } finally {
    await context.close();
    await group.close();
  }
});

test("real BE: the lobby reflects host transfer after a disconnect", async ({
  browser,
}) => {
  const group = await createLobby(browser, 2);
  try {
    await group.contexts[0].close();
    await expect(
      group.pages[1].getByRole("button", { name: "Bắt đầu ván", exact: true }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      group.pages[1].getByText("Chủ phòng", { exact: true }),
    ).toBeVisible();
  } finally {
    await group.close();
  }
});

test("real BE: reloading the sole host shows the missing-host recovery notice", async ({
  browser,
}) => {
  const group = await createLobby(browser, 1);
  try {
    const page = group.pages[0];
    await expect(page.getByTestId("room-host")).toHaveText(
      "Chủ phòng: P1 (Bạn)",
    );
    await page.reload();
    await waitOnline(page);

    const snapshot = await ownState(page);
    expect(snapshot.players.filter((player) => player.isHost).length).toBe(0);
    await expect(page.getByTestId("missing-host-notice")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bắt đầu ván", exact: true }),
    ).toHaveCount(0);
  } finally {
    await group.close();
  }
});

test("real BE: an unknown room returns a readable error without dropping input", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Tên của bạn").fill("Khách mới");
  await page.getByLabel("Mã phòng").fill("ZZZ999");
  await page.getByRole("button", { name: "Vào phòng", exact: true }).click();
  await expect(
    page.getByText("Phòng không còn tồn tại. Hãy tạo hoặc vào phòng mới.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Mã phòng")).toHaveValue("ZZZ999");
});
