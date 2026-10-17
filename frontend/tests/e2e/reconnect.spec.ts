import { expect, test } from "@playwright/test";
import { apiUrl, fixtureGroup, confirm } from "./support/fixtures";
import { ownState, syncGroup } from "./support/room";
test.setTimeout(180000);
for (const scenario of ["legislative-president", "veto-ready", "investigation"])
  {test(
    "ten reload/network cycles preserve " +
      scenario +
      " identity and private state",
    async ({ browser, request }) => {
      const group = await fixtureGroup(
        browser,
        request,
        scenario,
        scenario === "investigation" ? 7 : 5,
        async (context, index) => {
          if (index === 0)
            {await context.addInitScript(() => {
              const sockets: WebSocket[] = [];
              const NativeWebSocket = window.WebSocket;
              window.WebSocket = class extends NativeWebSocket {
                constructor(url: string | URL, protocols?: string | string[]) {
                  super(url, protocols);
                  sockets.push(this);
                }
              };
              Object.assign(window, {
                closeTestSockets: () =>
                  sockets.forEach((socket) =>
                    socket.close(1000, "test network interruption"),
                  ),
              });
            });}
        },
      );
      try {
        const [page, chancellor] = group.pages;
        await syncGroup(group.pages);
        if (scenario === "veto-ready") {
          await confirm(chancellor, "Yêu cầu veto");
          await expect(page.getByTestId("phase")).toHaveAttribute(
            "data-phase",
            "VETO_CONFIRMATION",
          );
          await confirm(page, "Từ chối veto");
          await expect(chancellor.getByTestId("phase")).toHaveAttribute(
            "data-phase",
            "LEGISLATIVE_CHANCELLOR",
          );
        }
        if (scenario === "investigation") {
          await page
            .getByLabel("Mục tiêu quyền lực")
            .selectOption(group.players[1].playerId);
          await confirm(page, "Điều tra đảng phái");
          await expect(page.getByTestId("investigations")).toContainText(
            "Phát xít",
          );
        }
        const before = await ownState(page);
        const recoveryMs: number[] = [];
        for (let cycle = 0; cycle < 10; cycle++) {
          let started = Date.now();
          if (cycle % 2 === 0) {await page.reload();}
          else {
            await group.contexts[0].setOffline(true);
            await page.evaluate(() =>
              (
                window as unknown as { closeTestSockets: () => void }
              ).closeTestSockets(),
            );
            await expect(page.getByTestId("connection")).not.toHaveText(
              "Đã đồng bộ",
            );
            await expect
              .poll(
                async () =>
                  (await ownState(group.pages[1])).players.find(
                    (p) => p.id === before.myPlayerId,
                  )?.isConnected,
                { timeout: 5000 },
              )
              .toBe(false);
            started = Date.now();
            await group.contexts[0].setOffline(false);
          }
          await expect(page.getByTestId("connection")).toHaveText(
            "Đã đồng bộ",
            { timeout: 10000 },
          );
          const elapsed = Date.now() - started;
          recoveryMs.push(elapsed);
          expect(elapsed).toBeLessThan(10000);
          const after = await ownState(page);
          expect(after.myPlayerId).toBe(before.myPlayerId);
          expect(after.myRole).toBe(before.myRole);
          expect(after.handCards).toEqual(before.handCards);
          expect(after.investigationResults).toEqual(
            before.investigationResults,
          );
          expect(after.players.length).toBe(before.players.length);
          if (scenario === "veto-ready")
            {expect(after.vetoRequestedThisRound).toBe(true);}
        }
        console.log("Recovery timing", scenario, JSON.stringify(recoveryMs));
      } finally {
        await group.close();
      }
    },
  );}
test("lost ACK and push are uncertain after eight seconds, with one SEND only", async ({
  browser,
  request,
}) => {
  let drop = false;
    let sends = 0;
  const group = await fixtureGroup(
    browser,
    request,
    "legislative-president",
    5,
    async (context, index) => {
      if (index !== 0) {return;}
      await context.routeWebSocket("**/ws/**", (route) => {
        const server = route.connectToServer();
        server.onMessage((message) => {
          if (
            drop &&
            (String(message).includes("/state") ||
              String(message).includes("/results"))
          )
            {return;}
          route.send(message);
        });
        route.onMessage((message) => {
          if (String(message).includes("/discard")) {sends++;}
          server.send(message);
        });
      });
    },
  );
  try {
    const page = group.pages[0];
    await syncGroup(group.pages);
    drop = true;
    await page
      .getByRole("button", { name: "Lá 1 — Phát xít", exact: true })
      .click();
    await confirm(page, "Bỏ lá đã chọn");
    await expect(page.getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "LEGISLATIVE_PRESIDENT",
    );
    await expect(
      page.getByText(
        "Chưa rõ kết quả thao tác. Đang đồng bộ; thao tác không được gửi lại tự động.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 12000 });
    await expect(page.getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "LEGISLATIVE_CHANCELLOR",
    );
    expect(sends).toBe(1);
    await expect(
      page.getByText("Thao tác đã được máy chủ xác nhận.", { exact: true }),
    ).toHaveCount(0);
  } finally {
    drop = false;
    await group.close();
  }
});
test("invalid identity and expired rooms never join again and clear private UI", async ({
  browser,
  request,
}) => {
  const group = await fixtureGroup(browser, request, "legislative-president");
  try {
    const page = group.pages[0];
    await page.evaluate(() => {
      const id = JSON.parse(localStorage.getItem("hboardgame.identity")!);
      id.sessionToken = crypto.randomUUID();
      localStorage.setItem("hboardgame.identity", JSON.stringify(id));
    });
    await page.reload();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "Phiên chơi không hợp lệ",
    );
    await expect(page.getByTestId("hand-card")).toHaveCount(0);
    expect((await ownState(group.pages[1])).players.length).toBe(5);
    const expired = await request.post(
      apiUrl + "/__test/expire/" + group.roomCode,
    );
    expect(expired.ok()).toBe(true);
    await group.pages[1].reload();
    await expect(
      group.pages[1].locator("main").getByRole("alert"),
    ).toContainText("Phòng không còn tồn tại");
    await expect(group.pages[1].getByTestId("private-info")).toHaveCount(0);
  } finally {
    await group.close();
  }
});
test("explicit leave confirms and releases profile lock with no private residue", async ({
  browser,
  request,
}) => {
  const group = await fixtureGroup(browser, request, "legislative-president");
  try {
    const page = group.pages[0];
    await page.getByRole("button", { name: "Rời phòng", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Hủy", exact: true })
      .click();
    await expect(page.getByTestId("hand-card")).toHaveCount(3);
    await confirm(page, "Rời phòng");
    await expect(
      page.getByRole("button", { name: "Tạo phòng", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("hboardgame.identity")),
    ).toBeNull();
    await expect(page.getByTestId("hand-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Tạo phòng", exact: true }).click();
    await expect(page.getByTestId("connection")).toHaveText("Đã đồng bộ", {
      timeout: 10000,
    });
    await expect(page.getByTestId("member-count")).toHaveText("1/10");
  } finally {
    await group.close();
  }
});
