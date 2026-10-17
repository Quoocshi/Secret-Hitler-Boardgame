import { expect, type Page } from "@playwright/test";
import {
  actorPage,
  confirm,
  nominate,
  ownState,
  startGame,
  voteAll,
} from "./room";
import type { Action, PlayerView } from "../../../../src/lib/game/types";

export interface GameCoverage {
  actions: Action[];
  steps: number;
  vetoDecision: boolean | null;
}

/** Each browser reads only its own legitimate private view. Nothing is injected into BE. */
export async function playGame(
  pages: Page[],
  approveFirstVeto = true,
): Promise<GameCoverage> {
  await startGame(pages);
  const actions = new Set<Action>(["start"]);
  const roles = new Map<string, string | null>();
  for (const page of pages) {
    const own = await ownState(page);
    roles.set(own.myPlayerId, own.myRole);
  }
  let vetoDecision: boolean | null = null;
  let vetoUsed = false;

  for (let step = 0; step < 100; step++) {
    const snapshot = await ownState(pages[0]);
    if (snapshot.currentPhase === "GAME_OVER") {
      return { actions: [...actions], steps: step, vetoDecision };
    }
    const president = await actorPage(pages, snapshot.currentPresidentId);
    await expect(president.getByTestId("phase")).toHaveAttribute(
      "data-phase",
      snapshot.currentPhase,
    );

    switch (snapshot.currentPhase) {
      case "NOMINATION": {
        const candidates = snapshot.players.filter((player) => {
          const aliveCount = snapshot.players.filter(
            (candidate) => candidate.isAlive,
          ).length;
          return (
            player.isAlive &&
            player.id !== snapshot.currentPresidentId &&
            player.id !== snapshot.lastElectedChancellorId &&
            (aliveCount <= 5 || player.id !== snapshot.lastElectedPresidentId)
          );
        });
        const nominee =
          candidates.find((player) => roles.get(player.id) !== "HITLER") ??
          candidates[0];
        await nominate(pages, nominee.id);
        actions.add("nominate");
        break;
      }
      case "VOTING":
        await voteAll(pages, "JA");
        actions.add("vote");
        break;
      case "LEGISLATIVE_PRESIDENT": {
        const own = await ownState(president);
        const liberalIndex = own.handCards.indexOf("LIBERAL");
        await president
          .getByTestId("hand-card")
          .nth(Math.max(0, liberalIndex))
          .click();
        await confirm(president, "Bỏ lá đã chọn");
        actions.add("discard");
        break;
      }
      case "LEGISLATIVE_CHANCELLOR": {
        const chancellor = await actorPage(pages, snapshot.currentChancellorId);
        await expect(chancellor.getByTestId("phase")).toHaveAttribute(
          "data-phase",
          snapshot.currentPhase,
        );
        if (!vetoUsed && snapshot.enactedFascistPolicies >= 5) {
          await confirm(chancellor, "Yêu cầu veto");
          vetoUsed = true;
          actions.add("veto/request");
        } else {
          const own = await ownState(chancellor);
          const fascistIndex = own.handCards.indexOf("FASCIST");
          await chancellor
            .getByTestId("hand-card")
            .nth(Math.max(0, fascistIndex))
            .click();
          await confirm(chancellor, "Ban hành lá đã chọn");
          actions.add("enact");
        }
        break;
      }
      case "VETO_CONFIRMATION":
        await confirm(
          president,
          approveFirstVeto ? "Đồng ý veto" : "Từ chối veto",
        );
        vetoDecision = approveFirstVeto;
        actions.add("veto/response");
        break;
      case "EXECUTIVE_ACTION":
        await executiveAction(pages, snapshot, president, roles, actions);
        break;
      default:
        throw new Error("Unexpected game phase in the public-action driver.");
    }
    await expect
      .poll(async () => (await ownState(pages[0])).currentPhase, {
        timeout: 10000,
      })
      .not.toBe(snapshot.currentPhase);
  }
  throw new Error(
    "Public-action game exceeded the finite 100-step budget; no BE fixture was used.",
  );
}

async function executiveAction(
  pages: Page[],
  snapshot: PlayerView,
  president: Page,
  roles: Map<string, string | null>,
  actions: Set<Action>,
) {
  if (snapshot.pendingExecutiveAction === "POLICY_PEEK") {
    await expect(president.getByTestId("hand-card")).toHaveCount(3);
    await president
      .getByRole("button", { name: "Đã xem", exact: true })
      .click();
    actions.add("end-action");
    return;
  }
  const candidates = snapshot.players.filter(
    (player) =>
      player.isAlive &&
      player.id !== snapshot.currentPresidentId &&
      (snapshot.pendingExecutiveAction !== "INVESTIGATE_LOYALTY" ||
        !player.isInvestigated),
  );
  const target =
    candidates.find((player) => roles.get(player.id) !== "HITLER") ??
    candidates[0];
  await president.getByLabel("Mục tiêu quyền lực").selectOption(target.id);
  const power = snapshot.pendingExecutiveAction;
  const labels = {
    INVESTIGATE_LOYALTY: "Điều tra đảng phái",
    SPECIAL_ELECTION: "Bầu cử đặc biệt",
    EXECUTION: "Xử bắn",
  };
  if (power === "NONE") {
    throw new Error("Executive phase without a supported power.");
  }
  await confirm(president, labels[power]);
  const powerActions = {
    INVESTIGATE_LOYALTY: "investigate",
    SPECIAL_ELECTION: "special-election",
    EXECUTION: "execute",
  } as const;
  const action = powerActions[power];
  actions.add(action);
  if (action === "investigate") {
    const resultSelector = `.game-players [data-player-id="${target.id}"] [data-testid="investigation-result"]`;
    await expect(president.locator(resultSelector)).toBeVisible();
    expect(
      (await ownState(pages[0])).players.find(
        (player) => player.id === target.id,
      )?.isInvestigated,
    ).toBe(true);
    for (const page of pages.filter((page) => page !== president)) {
      await expect(page.locator(resultSelector)).toHaveCount(0);
    }
    await president
      .getByRole("button", { name: "Đã xem kết quả", exact: true })
      .click();
    actions.add("end-action");
  }
}
