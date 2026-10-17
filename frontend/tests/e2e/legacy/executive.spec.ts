import { expect, test } from "@playwright/test";
import { createLobby } from "./support/room";
import { playGame } from "./support/game-driver";

test("real BE: powers and rejected veto are exercised without state seeding", async ({
  browser,
}, testInfo) => {
  test.setTimeout(360000);
  const coverage = new Set<string>();
  const decisions: (boolean | null)[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const group = await createLobby(browser, 10);
    try {
      const result = await playGame(group.pages, false);
      result.actions.forEach((action) => coverage.add(action));
      decisions.push(result.vetoDecision);
    } finally {
      await group.close();
    }
    if (
      [
        "investigate",
        "special-election",
        "execute",
        "veto/request",
        "veto/response",
      ].every((action) => coverage.has(action)) &&
      decisions.includes(false)
    ) {
      break;
    }
  }
  await testInfo.attach("public-power-coverage", {
    body: JSON.stringify({
      actions: [...coverage],
      rejectedVetoObserved: decisions.includes(false),
    }),
    contentType: "application/json",
  });
  expect([...coverage]).toEqual(
    expect.arrayContaining([
      "investigate",
      "special-election",
      "execute",
      "veto/request",
      "veto/response",
    ]),
  );
  expect(decisions.includes(false)).toBe(true);
});
