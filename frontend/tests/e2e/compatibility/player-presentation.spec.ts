import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";
import type { Role } from "../../../src/lib/game/types";

test("player presentation: offices and current actor follow the public phase", async ({
  page,
}) => {
  const snapshot = mockView({ currentPhase: "NOMINATION" });
  const room = await openMockRoom(page, snapshot);
  const president = page.locator('.game-players [data-player-id="p1"]');
  const chancellor = page.locator('.game-players [data-player-id="p2"]');
  await expect(president).toHaveAttribute("data-office", "president");
  await expect(president).toHaveAttribute("data-awaiting-action", "true");
  await expect(chancellor).toHaveAttribute("data-office", "chancellor");
  await expect(
    president.getByText("Tổng thống", { exact: true }),
  ).toBeVisible();
  await expect(
    chancellor.getByText("Thủ tướng", { exact: true }),
  ).toBeVisible();
  room.update({ ...snapshot, currentPhase: "LEGISLATIVE_CHANCELLOR" });
  await expect(chancellor).toHaveAttribute("data-awaiting-action", "true");
  await expect(president).toHaveAttribute("data-awaiting-action", "false");
  await expect(page.locator(".action-panel .eyebrow")).toHaveText(
    "THEO DÕI LƯỢT CHƠI",
  );
});

test("player presentation: voting marks only living members without a vote", async ({
  page,
}) => {
  const snapshot = mockView({ currentPhase: "VOTING" });
  snapshot.players[0].hasVoted = true;
  snapshot.players[2].isAlive = false;
  await openMockRoom(page, snapshot);
  await expect(
    page.locator('.game-players [data-awaiting-action="true"]'),
  ).toHaveCount(3);
  await expect(
    page.locator('.game-players [data-player-id="p1"]'),
  ).toHaveAttribute("data-awaiting-action", "false");
  await expect(
    page.locator('.game-players [data-player-id="p3"]'),
  ).toHaveAttribute("data-awaiting-action", "false");
  await expect(page.locator(".vote-ja img")).toHaveAttribute(
    "src",
    "/images/vote-ja.svg",
  );
});

test("player presentation: role artwork stays private until explicitly opened", async ({
  page,
}) => {
  await openMockRoom(
    page,
    mockView({ currentPhase: "NOMINATION", myRole: "HITLER" }),
  );
  await expect(page.locator('img[src*="role-hitler"]')).toHaveCount(0);
  await expect(page.locator(".role-card-back")).toBeVisible();
  await page
    .getByRole("button", { name: "Xem vai trò riêng", exact: true })
    .click();
  await expect(page.locator(".private-role-art")).toHaveAttribute(
    "src",
    "/images/role-hitler.webp",
  );
  await expect(page.locator(".game-players img[src*=role-]")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ẩn vai trò riêng", exact: true })
    .click();
  await expect(page.locator(".private-role-art")).toHaveCount(0);
  await expect(page.locator("#private-role")).toHaveCount(0);
});

test("player presentation: asset paths load and long names stay within the desktop window", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const snapshot = mockView({ currentPhase: "NOMINATION" });
  snapshot.players[0].nickname =
    "Tênngườichơidàikhôngcódấucáchđểkiểmtragiaodiện";
  await openMockRoom(page, snapshot);
  await expect(page.locator(".game-players")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  for (const image of await page
    .locator(
      ".office-holder img, .office-badge img, .track-heading img, .role-card-back",
    )
    .all()) {
    await expect(image).toHaveJSProperty("complete", true);
    expect(
      await image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    ).toBeGreaterThan(0);
  }
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  for (const role of ["LIBERAL", "FASCIST", "HITLER"] as Role[]) {
    test(`role frame: ${role} keeps the same face and back size at ${viewport.width}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openMockRoom(
        page,
        mockView({ currentPhase: "NOMINATION", myRole: role }),
      );
      const back = page.locator(".role-card-back");
      await expect(back).toBeVisible();
      const initialBounds = await back.boundingBox();
      expect(initialBounds).not.toBeNull();
      const reveal = page.getByRole("button", {
        name: "Xem vai trò riêng",
        exact: true,
      });
      await reveal.click();
      const face = page.locator(".private-role-art");
      await expect(face).toBeVisible();
      await expect(face).toHaveJSProperty("complete", true);
      await expect.poll(() => face.boundingBox()).toEqual(initialBounds);
      expect(
        await face.evaluate((element) => getComputedStyle(element).objectFit),
      ).toBe("contain");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight + 1,
        ),
      ).toBe(true);
      await page
        .getByRole("button", { name: "Ẩn vai trò riêng", exact: true })
        .click();
      await expect(page.locator(".private-role-art")).toHaveCount(0);
      await expect
        .poll(() => page.locator(".role-card-back").boundingBox())
        .toEqual(initialBounds);
    });
  }
}

test("role flip: the card toggles by mouse and keyboard and clears private content immediately", async ({
  page,
}) => {
  await openMockRoom(
    page,
    mockView({ currentPhase: "NOMINATION", myRole: "HITLER" }),
  );
  await expect(page.locator(".private-role-art")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Lật thẻ vai trò", exact: true })
    .click();
  await expect(page.locator(".private-role-flipper")).toHaveAttribute(
    "data-revealed",
    "true",
  );
  await expect(page.locator(".private-role-art")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Úp thẻ vai trò", exact: true })
    .click();
  await expect(page.locator(".private-role-art")).toHaveCount(0);
  await expect(page.locator("#private-role")).toHaveCount(0);
  const card = page.getByRole("button", {
    name: "Lật thẻ vai trò",
    exact: true,
  });
  await card.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".private-role-flipper")).toHaveAttribute(
    "data-revealed",
    "true",
  );
  await page.keyboard.press("Space");
  await expect(page.locator(".private-role-art")).toHaveCount(0);
  await expect(page.locator(".private-role-flipper")).toHaveAttribute(
    "data-revealed",
    "false",
  );
});

test("role flip: respects reduced motion without changing card controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openMockRoom(
    page,
    mockView({ currentPhase: "NOMINATION", myRole: "LIBERAL" }),
  );
  expect(
    await page
      .locator(".private-role-flipper")
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe("0s");
  await page
    .getByRole("button", { name: "Lật thẻ vai trò", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ẩn vai trò riêng", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page
    .getByRole("button", { name: "Ẩn vai trò riêng", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lật thẻ vai trò", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
});
