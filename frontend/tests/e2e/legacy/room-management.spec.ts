import { expect, test, type Page } from "@playwright/test";
import {
  actorPage,
  confirm,
  createLobby,
  nominate,
  ownState,
  startGame,
} from "./support/room";

async function leaveRoom(page: Page) {
  await confirm(page, "Rời phòng");
  await expect(page.locator("#nickname")).toBeVisible();
  expect(
    await page.evaluate(
      () => localStorage.getItem("hboardgame.identity") === null,
    ),
  ).toBe(true);
}

test("real BE: a kicked tab can create another room without reloading", async ({
  browser,
}) => {
  const group = await createLobby(browser, 2);
  try {
    const guest = group.pages[1];
    await confirm(group.pages[0], "Mời P2 rời phòng");
    await expect(guest.getByTestId("connection")).toHaveText("Đã rời phòng");
    await guest.goBack();
    await expect(guest.locator("#nickname")).toBeVisible();
    await guest.getByRole("button", { name: "Tạo phòng", exact: true }).click();
    await expect(guest.getByTestId("room-code")).not.toHaveText(group.roomCode);
    await expect(guest.getByTestId("room-host")).toHaveText(
      "Chủ phòng: P2 (Bạn)",
    );
    await expect(
      guest.getByText(
        "Bạn không còn là thành viên của phòng. Hãy về trang đầu để tiếp tục.",
        { exact: true },
      ),
    ).toHaveCount(0);
    await expect(group.pages[0].getByTestId("member-count")).toHaveText("1/10");
  } finally {
    await group.close();
  }
});

test("real BE: only the host can kick, cancellation is safe, and the removed guest cannot auto-rejoin", async ({
  browser,
}) => {
  const group = await createLobby(browser, 3);
  try {
    const [host, guest] = group.pages;
    await expect(
      host.getByRole("button", { name: /^Mời .+ rời phòng$/ }),
    ).toHaveCount(2);
    await expect(
      guest.getByRole("button", { name: /^Mời .+ rời phòng$/ }),
    ).toHaveCount(0);
    await host
      .getByRole("button", { name: "Mời P2 rời phòng", exact: true })
      .click();
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "Hủy", exact: true })
      .click();
    await expect(host.getByTestId("member-count")).toHaveText("3/10");
    await confirm(host, "Mời P2 rời phòng");
    await expect(host.getByTestId("member-count")).toHaveText("2/10");
    await expect(guest.getByTestId("connection")).toHaveText("Đã rời phòng");
    expect(
      await guest.evaluate(
        () => localStorage.getItem("hboardgame.identity") === null,
      ),
    ).toBe(true);
    await guest.reload();
    await expect(guest.locator("#nickname")).toBeVisible();
    await expect(host.getByTestId("member-count")).toHaveText("2/10");
  } finally {
    await group.close();
  }
});

test("real BE: a guest kicked while their tab is closed discards the old identity on return", async ({
  browser,
}) => {
  const group = await createLobby(browser, 2);
  try {
    await group.pages[1].close();
    await confirm(group.pages[0], "Mời P2 rời phòng");
    const returningGuest = await group.contexts[1].newPage();
    await returningGuest.goto("/room/" + group.roomCode);
    await expect(returningGuest.getByTestId("connection")).toHaveText(
      "Đã rời phòng",
    );
    expect(
      await returningGuest.evaluate(
        () => localStorage.getItem("hboardgame.identity") === null,
      ),
    ).toBe(true);
    await expect(group.pages[0].getByTestId("member-count")).toHaveText("1/10");
  } finally {
    await group.close();
  }
});

test("real BE: a guest voluntarily leaves and can rejoin with a new identity", async ({
  browser,
}) => {
  const group = await createLobby(browser, 3);
  try {
    const guest = group.pages[1];
    const formerPlayerId = (await ownState(guest)).myPlayerId;
    await leaveRoom(guest);
    await expect(group.pages[0].getByTestId("member-count")).toHaveText("2/10");
    await guest.getByLabel("Tên của bạn").fill("P2");
    await guest.getByLabel("Mã phòng").fill(group.roomCode);
    await guest.getByRole("button", { name: "Vào phòng", exact: true }).click();
    await expect(group.pages[0].getByTestId("member-count")).toHaveText("3/10");
    expect((await ownState(guest)).myPlayerId !== formerPlayerId).toBe(true);
  } finally {
    await group.close();
  }
});

test("real BE: a host's voluntary leave transfers room ownership", async ({
  browser,
}) => {
  const group = await createLobby(browser, 3);
  try {
    await leaveRoom(group.pages[0]);
    await expect(group.pages[1].getByTestId("room-host")).toHaveText(
      "Chủ phòng: P2 (Bạn)",
    );
    await expect(group.pages[1].getByTestId("member-count")).toHaveText("2/10");
    await expect(
      group.pages[1].getByRole("button", {
        name: "Mời P3 rời phòng",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await group.close();
  }
});

test("real BE: kicking a nominee aborts a five-player game and closes the guest's private view", async ({
  browser,
}) => {
  const group = await createLobby(browser, 5);
  try {
    await startGame(group.pages);
    const snapshot = await ownState(group.pages[0]);
    const target = snapshot.players.find(
      (player) => !player.isHost && player.id !== snapshot.currentPresidentId,
    )!;
    await nominate(group.pages, target.id);
    const guest = await actorPage(group.pages, target.id);
    await guest
      .getByRole("button", { name: "Xem vai trò riêng", exact: true })
      .click();
    const host = group.pages[0];
    await host
      .getByRole("button", {
        name: `Mời ${target.nickname} rời phòng`,
        exact: true,
      })
      .click();
    await expect(host.getByRole("dialog")).toContainText(
      "Nếu còn dưới 5 thành viên",
    );
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "Xác nhận", exact: true })
      .click();
    for (const page of group.pages.filter((page) => page !== guest)) {
      await expect(page.getByTestId("game-result")).toContainText(
        "Ván đã dừng",
      );
      await expect(page.getByTestId("win-reason")).toContainText("4");
    }
    await expect(guest.getByTestId("connection")).toHaveText("Đã rời phòng");
    await expect(guest.getByTestId("private-info")).toHaveCount(0);
  } finally {
    await group.close();
  }
});

test("real BE: a president's voluntary leave aborts the game without rejecting stale office references", async ({
  browser,
}) => {
  const group = await createLobby(browser, 5);
  try {
    await startGame(group.pages);
    const snapshot = await ownState(group.pages[0]);
    const president = await actorPage(group.pages, snapshot.currentPresidentId);
    await leaveRoom(president);
    for (const page of group.pages.filter((page) => page !== president)) {
      await expect(page.getByTestId("game-result")).toContainText(
        "Ván đã dừng",
      );
      await expect(page.getByTestId("win-reason")).toContainText("4");
    }
  } finally {
    await group.close();
  }
});

test("real BE: removing one of six members keeps a five-player game running", async ({
  browser,
}) => {
  const group = await createLobby(browser, 6);
  try {
    await startGame(group.pages);
    const snapshot = await ownState(group.pages[0]);
    const target = snapshot.players.find(
      (player) => !player.isHost && player.id !== snapshot.currentPresidentId,
    )!;
    await confirm(group.pages[0], `Mời ${target.nickname} rời phòng`);
    await expect(group.pages[0].getByTestId("member-count")).toHaveText("5/10");
    await expect(group.pages[0].getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "NOMINATION",
    );
    await expect(group.pages[0].getByTestId("game-result")).toHaveCount(0);
  } finally {
    await group.close();
  }
});
