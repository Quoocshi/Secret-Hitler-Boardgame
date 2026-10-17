import { expect, test } from "@playwright/test";
import {
  createGroup,
  ownState,
  syncGroup,
  actorPage,
  nominate,
  voteAll,
} from "./support/room";
test.setTimeout(180000);
test("only president nominates; votes stay secret until the round closes", async ({
  browser,
}) => {
  const group = await createGroup(browser);
  try {
    const s = await syncGroup(group.pages);
      const actor = await actorPage(group.pages, s.currentPresidentId);
    for (const p of group.pages) {
      const mine = await ownState(p);
      await expect(p.getByTestId("private-info")).not.toContainText(
        mine.myRole!,
      );
      await p.getByRole("button", { name: "Xem vai trò riêng" }).click();
      await expect(p.getByTestId("private-info")).toContainText(
        mine.myRole === "HITLER"
          ? "Hitler"
          : mine.myRole === "FASCIST"
            ? "Phát xít"
            : "Tự do",
      );
      if (p !== actor)
        {await expect(
          p.getByRole("button", { name: "Đề cử", exact: true }),
        ).toHaveCount(0);}
    }
    await nominate(group.pages);
    await group.pages[0]
      .getByRole("button", { name: "JA — Đồng ý", exact: true })
      .click();
    await syncGroup(group.pages);
    for (const p of group.pages)
      {await expect(p.getByTestId("players")).not.toContainText("Vòng vừa chốt");}
    await group.pages[0]
      .getByRole("button", { name: "NEIN — Phản đối", exact: true })
      .click();
    await syncGroup(group.pages);
    for (let i = 1; i < 5; i++) {
      await syncGroup(group.pages);
      await group.pages[i]
        .getByRole("button", { name: "JA — Đồng ý", exact: true })
        .click();
    }
    for (const p of group.pages)
      {await expect(p.getByTestId("phase")).toHaveAttribute(
        "data-phase",
        "LEGISLATIVE_PRESIDENT",
      );}
    await expect(group.pages[0].getByTestId("players")).toContainText("NEIN");
  } finally {
    await group.close();
  }
});
test("three failed governments reset tracker and enact exactly one chaos policy", async ({
  browser,
}) => {
  const group = await createGroup(browser);
  try {
    for (let round = 0; round < 3; round++) {
      await nominate(group.pages);
      await voteAll(group.pages, "NEIN");
      for (const p of group.pages)
        {await expect(p.getByTestId("phase")).toHaveAttribute(
          "data-phase",
          "NOMINATION",
        );}
    }
    const s = await ownState(group.pages[0]);
    expect(s.electionTracker).toBe(0);
    expect(s.enactedLiberalPolicies + s.enactedFascistPolicies).toBe(1);
    expect(s.pendingExecutiveAction).toBe("NONE");
  } finally {
    await group.close();
  }
});
test("a lagging voter gets STALE_STATE and must explicitly vote again", async ({
  browser,
}) => {
  let dropState = false;
  const group = await createGroup(browser, 5, async (context, index) => {
    if (index !== 1) {return;}
    await context.routeWebSocket("**/ws/**", (route) => {
      const server = route.connectToServer();
      server.onMessage((message) => {
        if (dropState && String(message).includes("/state")) {return;}
        route.send(message);
      });
    });
  });
  try {
    await nominate(group.pages);
    const before = await ownState(group.pages[0]);
    dropState = true;
    await group.pages[0]
      .getByRole("button", { name: "JA — Đồng ý", exact: true })
      .click();
    await expect(group.pages[0].getByTestId("room-screen")).not.toHaveAttribute(
      "data-state-version",
      String(before.stateVersion),
    );
    await expect(group.pages[1].getByTestId("room-screen")).toHaveAttribute(
      "data-state-version",
      String(before.stateVersion),
    );
    dropState = false;
    await group.pages[1]
      .getByRole("button", { name: "JA — Đồng ý", exact: true })
      .click();
    await expect(
      group.pages[1].getByText(
        "Phòng vừa thay đổi. Hãy kiểm tra và xác nhận lại thao tác.",
        { exact: true },
      ),
    ).toBeVisible();
    let mine = await ownState(group.pages[1]);
    expect(mine.players.find((p) => p.id === mine.myPlayerId)?.hasVoted).toBe(
      false,
    );
    await syncGroup(group.pages);
    await group.pages[1]
      .getByRole("button", { name: "JA — Đồng ý", exact: true })
      .click();
    await expect(
      group.pages[1].getByText("Thao tác đã được máy chủ xác nhận.", {
        exact: true,
      }),
    ).toBeVisible();
    mine = await ownState(group.pages[1]);
    expect(mine.players.find((p) => p.id === mine.myPlayerId)?.hasVoted).toBe(
      true,
    );
  } finally {
    dropState = false;
    await group.close();
  }
});
