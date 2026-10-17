import {
  expect,
  type Browser,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import { players } from "./players";
import type { PlayerView, SessionIdentity } from "../../../src/lib/game/types";
export async function ownState(page: Page): Promise<PlayerView> {
  const identity = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("hboardgame.identity")!,
      ) as SessionIdentity,
  );
  const response = await page.request.get(
    (process.env.E2E_API_URL ?? "http://localhost:8081") +
      "/api/rooms/" +
      identity.roomCode +
      "/state",
    { headers: { "X-Session-Token": identity.sessionToken } },
  );
  expect(response.ok()).toBe(true);
  return response.json();
}
export async function syncGroup(pages: Page[]) {
  const s = await ownState(pages[0]);
  for (const page of pages)
    {await expect(page.getByTestId("room-screen")).toHaveAttribute(
      "data-state-version",
      String(s.stateVersion),
    );}
  return s;
}
export async function createGroup(
  browser: Browser,
  count: 5 | 10 = 5,
  setup?: (context: BrowserContext, index: number) => Promise<void>,
) {
  const group = await players(browser, count);
  if (setup) {for (let i = 0; i < count; i++) {await setup(group.contexts[i], i);}}
  await group.pages[0].goto("/");
  await group.pages[0].getByLabel("Tên của bạn").fill("P1");
  await group.pages[0]
    .getByRole("button", { name: "Tạo phòng", exact: true })
    .click();
  await expect(group.pages[0].getByTestId("connection")).toHaveText(
    "Đã đồng bộ",
    { timeout: 15000 },
  );
  const code = await group.pages[0].getByTestId("room-code").innerText();
  for (let i = 1; i < count; i++) {
    const p = group.pages[i];
    await p.goto("/");
    await p.getByLabel("Tên của bạn").fill("P" + (i + 1));
    await p.getByLabel("Mã phòng").fill(code);
    await p.getByRole("button", { name: "Vào phòng", exact: true }).click();
    await expect(p.getByTestId("connection")).toHaveText("Đã đồng bộ", {
      timeout: 15000,
    });
  }
  await syncGroup(group.pages);
  await group.pages[0].getByRole("button", { name: "Bắt đầu ván" }).click();
  for (const p of group.pages)
    {await expect(p.getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "NOMINATION",
    );}
  await syncGroup(group.pages);
  return { ...group, code };
}
export async function actorPage(pages: Page[], id: string | null) {
  for (const p of pages) {if ((await ownState(p)).myPlayerId === id) {return p;}}
  throw new Error("Actor page not found");
}
export async function nominate(pages: Page[]) {
  const s = await syncGroup(pages);
  const president = await actorPage(pages, s.currentPresidentId);
  const candidates = president.getByLabel("Ứng viên Thủ tướng");
  const value = await candidates
    .locator("option:enabled")
    .nth(1)
    .getAttribute("value");
  await candidates.selectOption(value!);
  await president.getByRole("button", { name: "Đề cử", exact: true }).click();
  await president
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận", exact: true })
    .click();
  for (const p of pages)
    {await expect(p.getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "VOTING",
    );}
  await syncGroup(pages);
}
export async function voteAll(pages: Page[], vote: "JA" | "NEIN") {
  for (const p of pages) {
    await syncGroup(pages);
    await p
      .getByRole("button", {
        name: vote === "JA" ? "JA — Đồng ý" : "NEIN — Phản đối",
        exact: true,
      })
      .click();
    await expect(
      p.getByText("Đang chờ máy chủ xác nhận…", { exact: true }),
    ).toHaveCount(0);
  }
  await syncGroup(pages);
}
