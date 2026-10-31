import { expect, test, type Page, type Locator } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

const desktopWindows = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

function crowdedRoom(overrides: Record<string, unknown> = {}) {
  const snapshot = mockView(overrides);
  snapshot.players = Array.from({ length: 10 }, (_, index) => ({
    ...snapshot.players[index % 5],
    id: "p" + (index + 1),
    nickname:
      index === 0 ? "Chủ phòng Nguyễn Minh Anh" : "Người chơi " + (index + 1),
    isHost: index === 0,
  }));
  return snapshot;
}

async function expectNoPageScroll(page: Page) {
  const dimensions = await page.evaluate(() => ({
    pageHeight: document.documentElement.scrollHeight,
    pageWidth: document.documentElement.scrollWidth,
    height: window.innerHeight,
    width: window.innerWidth,
  }));
  expect(dimensions.pageHeight).toBeLessThanOrEqual(dimensions.height + 1);
  expect(dimensions.pageWidth).toBeLessThanOrEqual(dimensions.width + 1);
  const content = page.locator(".room-content");
  if (await content.count()) {
    expect(
      await content.evaluate(
        (element) => element.scrollHeight - element.clientHeight,
      ),
    ).toBeLessThanOrEqual(1);
  }
}

async function expectFullyVisible(locator: Locator) {
  await expect(locator).toBeVisible();
  const visible = await locator.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const center = document.elementFromPoint(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    return (
      bounds.top >= 0 &&
      bounds.left >= 0 &&
      bounds.bottom <= innerHeight + 1 &&
      bounds.right <= innerWidth + 1 &&
      element.contains(center)
    );
  });
  expect(visible).toBe(true);
}

for (const viewport of desktopWindows) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test("viewport layout: home fits with both entry buttons visible", async ({
      page,
    }) => {
      await page.goto("/");
      await expectFullyVisible(
        page.getByRole("button", { name: "Tạo phòng", exact: true }),
      );
      await expectFullyVisible(
        page.getByRole("button", { name: "Vào phòng", exact: true }),
      );
      await expectNoPageScroll(page);
    });

    test("viewport layout: ten-member lobby keeps start and room code visible", async ({
      page,
    }) => {
      await openMockRoom(page, crowdedRoom({ currentPhase: "LOBBY" }));
      await expect(page.locator(".lobby-players li")).toHaveCount(10);
      await expectFullyVisible(
        page.getByRole("button", { name: "Bắt đầu ván", exact: true }),
      );
      await expectFullyVisible(
        page.getByRole("button", { name: "Sao chép mã", exact: true }),
      );
      await expectNoPageScroll(page);
    });

    test("viewport layout: table and long member list stay inside the window", async ({
      page,
    }) => {
      await openMockRoom(page, crowdedRoom({ currentPhase: "NOMINATION" }));
      await expectFullyVisible(page.getByTestId("phase"));
      await expectFullyVisible(page.locator(".policy-board"));
      await expectFullyVisible(page.locator(".deck-counts"));
      await expectFullyVisible(page.locator(".action-panel"));
      await expectNoPageScroll(page);
      await page.locator(".game-players li").last().scrollIntoViewIfNeeded();
      await expectNoPageScroll(page);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });

    test("viewport layout: game results retain rematch controls with ten roles", async ({
      page,
    }) => {
      const snapshot = crowdedRoom({
        currentPhase: "GAME_OVER",
        winner: "LIBERAL",
        winReason: "Phe Tự do đã ban hành đủ 5 chính sách.",
        enactedLiberalPolicies: 5,
      });
      snapshot.players = snapshot.players.map((player) => ({
        ...player,
        revealedRole: "LIBERAL",
      }));
      await openMockRoom(page, snapshot);
      await expectFullyVisible(
        page.getByRole("button", { name: "Trở lại phòng chờ", exact: true }),
      );
      await expectFullyVisible(
        page.getByRole("button", { name: "Cài đặt", exact: true }),
      );
      await expectNoPageScroll(page);
      await page
        .getByTestId("revealed-roles")
        .locator("li")
        .last()
        .scrollIntoViewIfNeeded();
      await expectNoPageScroll(page);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await page
        .getByText("Xem bàn chính sách và nhật ký ván đấu", { exact: true })
        .click();
      await expectNoPageScroll(page);
    });
  });
}

test("viewport layout: all five public roles fit without scrolling their roster", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const snapshot = mockView({
    currentPhase: "GAME_OVER",
    winner: "LIBERAL",
    winReason: "Phe Tự do đã ban hành đủ 5 chính sách.",
  });
  snapshot.players = snapshot.players.map((player) => ({
    ...player,
    revealedRole: "LIBERAL",
  }));
  await openMockRoom(page, snapshot);
  const roster = page.getByTestId("revealed-roles");
  await expectFullyVisible(roster.locator("li").last());
  expect(
    await roster.evaluate(
      (element) => element.scrollHeight - element.clientHeight,
    ),
  ).toBeLessThanOrEqual(1);
  await expectNoPageScroll(page);
});

test("viewport layout: private role and long public log scroll inside the table", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openMockRoom(
    page,
    crowdedRoom({
      currentPhase: "LEGISLATIVE_PRESIDENT",
      handCards: ["LIBERAL", "FASCIST", "FASCIST"],
      gameLogs: Array.from(
        { length: 100 },
        (_, index) => `Sự kiện công khai ${index + 1}`,
      ),
    }),
  );
  await page
    .getByRole("button", { name: "Xem vai trò riêng", exact: true })
    .click();
  await page.locator(".log-panel summary").click();
  await expect(page.getByTestId("hand-card")).toHaveCount(3);
  await expectNoPageScroll(page);
  await page.locator(".game-log li").last().scrollIntoViewIfNeeded();
  await expectNoPageScroll(page);
  await page
    .getByRole("button", { name: "Ẩn vai trò riêng", exact: true })
    .scrollIntoViewIfNeeded();
  await expectNoPageScroll(page);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
