import { expect, test } from "@playwright/test";
import { fixtureGroup, seed, confirm } from "./support/fixtures";
import { ownState, syncGroup } from "./support/room";
for (const count of [5, 6, 7, 10])
  {test("recipient privacy matrix " + count, async ({ browser, request }) => {
    const group = await fixtureGroup(browser, request, "nomination", count);
    try {
      const views = await Promise.all(group.pages.map(ownState));
      const fascists = views
        .filter((s) => s.myRole === "FASCIST")
        .map((s) => s.myPlayerId);
      const hitler = views.find((s) => s.myRole === "HITLER")!.myPlayerId;
      for (let i = 0; i < count; i++) {
        const s = views[i];
        expect(
          s.players.every(
            (p) =>
              !Object.hasOwn(p, "role") &&
              !Object.hasOwn(p, "sessionToken") &&
              !Object.hasOwn(p, "partyMembership"),
          ),
        ).toBe(true);
        const expected =
          s.myRole === "FASCIST" || (s.myRole === "HITLER" && count <= 6)
            ? [...fascists, hitler]
            : [];
        expect([...s.knownAllyIds].sort()).toEqual(expected.sort());
        expect(s.handCards).toHaveLength(0);
        expect(s.investigationResults).toHaveLength(0);
        await expect(
          group.pages[i].getByText("Vai trò của bạn:", { exact: false }),
        ).toHaveCount(0);
      }
      for (const scenario of [
        "legislative-president",
        "legislative-chancellor",
        "policy-peek",
      ]) {
        await seed(request, group.roomCode, scenario);
        await syncGroup(group.pages);
        for (let i = 0; i < count; i++) {
          const actor = scenario === "legislative-chancellor" ? 1 : 0;
          expect((await ownState(group.pages[i])).handCards).toHaveLength(
            i === actor ? (scenario === "legislative-chancellor" ? 2 : 3) : 0,
          );
          await expect(group.pages[i].getByTestId("hand-card")).toHaveCount(
            i === actor ? (scenario === "legislative-chancellor" ? 2 : 3) : 0,
          );
        }
      }
      await seed(request, group.roomCode, "investigation");
      await syncGroup(group.pages);
      await group.pages[0]
        .getByLabel("Mục tiêu quyền lực")
        .selectOption(hitler);
      await confirm(group.pages[0], "Điều tra đảng phái");
      await syncGroup(group.pages);
      for (let i = 0; i < count; i++) {
        const s = await ownState(group.pages[i]);
        expect(s.investigationResults).toHaveLength(i === 0 ? 1 : 0);
        if (i === 0)
          {expect(s.investigationResults[0].partyMembership).toBe("FASCIST");}
        else
          {await expect(
            group.pages[i].getByTestId("investigations"),
          ).toHaveCount(0);}
      }
    } finally {
      await group.close();
    }
  });}
