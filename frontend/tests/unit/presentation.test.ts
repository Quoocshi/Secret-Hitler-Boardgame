import { expect, it } from "vitest";
import { awaitingPlayerIds } from "@/lib/game/presentation";
import type { Phase } from "@/lib/game/types";
import { view } from "../support/view";

const players = [
  view().players[0],
  { ...view().players[0], id: "p2", isHost: false },
  { ...view().players[0], id: "p3", isHost: false, isAlive: false },
];

it.each<[Phase, string[]]>([
  ["NOMINATION", ["p1"]],
  ["LEGISLATIVE_PRESIDENT", ["p1"]],
  ["LEGISLATIVE_CHANCELLOR", ["p2"]],
  ["VETO_CONFIRMATION", ["p1"]],
  ["EXECUTIVE_ACTION", ["p1"]],
  ["LOBBY", []],
  ["GAME_OVER", []],
])("marks the correct public actor during %s", (currentPhase, expected) => {
  expect(
    awaitingPlayerIds(
      view({
        players,
        currentPhase,
        currentPresidentId: "p1",
        currentChancellorId: "p2",
        pendingExecutiveAction: "EXECUTION",
      }),
    ),
  ).toEqual(expected);
});

it("waits only for living players who have not voted, including disconnected members", () => {
  const snapshot = view({
    currentPhase: "VOTING",
    players: players.map((player) => ({
      ...player,
      hasVoted: player.id === "p1",
      isConnected: player.id !== "p2",
    })),
  });
  expect(awaitingPlayerIds(snapshot)).toEqual(["p2"]);
});

it("does not mark departed, eliminated or absent actors", () => {
  for (const currentPresidentId of ["outsider", "p3", null]) {
    expect(
      awaitingPlayerIds(
        view({ players, currentPhase: "NOMINATION", currentPresidentId }),
      ),
    ).toEqual([]);
  }
  expect(
    awaitingPlayerIds(
      view({
        players,
        currentPhase: "EXECUTIVE_ACTION",
        currentPresidentId: "p1",
        pendingExecutiveAction: "NONE",
      }),
    ),
  ).toEqual([]);
});
