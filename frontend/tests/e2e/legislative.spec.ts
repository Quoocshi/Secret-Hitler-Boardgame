import { expect, test } from "@playwright/test";
import { fixtureGroup, confirm, seed } from "./support/fixtures";
import { ownState, syncGroup } from "./support/room";
test.setTimeout(120000);
test("duplicate policy positions, cancel, stale selection and actor-only cards", async ({
  browser,
  request,
}) => {
  const group = await fixtureGroup(browser, request, "legislative-president");
  try {
    const [president, chancellor, other] = group.pages;
    await syncGroup(group.pages);
    await expect(president.getByTestId("hand-card")).toHaveCount(3);
    await expect(other.getByTestId("hand-card")).toHaveCount(0);
    await president
      .getByRole("button", { name: "Lá 2 — Phát xít", exact: true })
      .click();
    await president
      .getByRole("button", { name: "Bỏ lá đã chọn", exact: true })
      .click();
    await president
      .getByRole("dialog")
      .getByRole("button", { name: "Hủy", exact: true })
      .click();
    expect((await ownState(president)).handCards).toEqual([
      "FASCIST",
      "FASCIST",
      "LIBERAL",
    ]);
    await president
      .getByRole("button", { name: "Bỏ lá đã chọn", exact: true })
      .click();
    await seed(request, group.roomCode, "legislative-president");
    await expect(president.getByRole("dialog")).toHaveCount(0);
    await expect(
      president.getByRole("button", { name: "Bỏ lá đã chọn", exact: true }),
    ).toBeDisabled();
    await president
      .getByRole("button", { name: "Lá 2 — Phát xít", exact: true })
      .click();
    await confirm(president, "Bỏ lá đã chọn");
    await expect(chancellor.getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "LEGISLATIVE_CHANCELLOR",
    );
    expect((await ownState(chancellor)).handCards).toEqual([
      "FASCIST",
      "LIBERAL",
    ]);
    await expect(president.getByTestId("hand-card")).toHaveCount(0);
    await chancellor
      .getByRole("button", { name: "Lá 2 — Tự do", exact: true })
      .click();
    await confirm(chancellor, "Ban hành lá đã chọn");
    for (const p of group.pages)
      {await expect(p.getByTestId("liberal-count")).toHaveText("1/5");}
  } finally {
    await group.close();
  }
});
test("veto rejection survives reload and forbids another request; approval raises tracker", async ({
  browser,
  request,
}) => {
  const group = await fixtureGroup(browser, request, "veto-ready");
  try {
    const [president, chancellor] = group.pages;
    await syncGroup(group.pages);
    await confirm(chancellor, "Yêu cầu veto");
    await expect(president.getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "VETO_CONFIRMATION",
    );
    await confirm(president, "Từ chối veto");
    await expect(chancellor.getByTestId("phase")).toHaveAttribute(
      "data-phase",
      "LEGISLATIVE_CHANCELLOR",
    );
    await chancellor.reload();
    await expect(chancellor.getByTestId("connection")).toHaveText(
      "Đã đồng bộ",
      { timeout: 15000 },
    );
    await expect(
      chancellor.getByRole("button", { name: "Yêu cầu veto", exact: true }),
    ).toBeDisabled();
    await seed(request, group.roomCode, "veto-confirmation");
    await syncGroup(group.pages);
    await confirm(president, "Đồng ý veto");
    for (const p of group.pages)
      {await expect(p.getByTestId("election-count")).toHaveText("2/3");}
    await seed(request, group.roomCode, "veto-chaos");
    await syncGroup(group.pages);
    await confirm(president, "Đồng ý veto");
    for (const p of group.pages)
      {await expect(p.getByTestId("election-count")).toHaveText("0/3");}
    expect((await ownState(president)).enactedLiberalPolicies).toBe(1);
  } finally {
    await group.close();
  }
});
