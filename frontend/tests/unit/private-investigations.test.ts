import { expect, it } from "vitest";
import { rememberPrivateInvestigations } from "@/lib/game/investigations";
import { initialRoomState, roomReducer } from "@/lib/realtime/room-reducer";
import { view } from "../support/view";

function investigationView() {
  const snapshot = view({
    currentPhase: "EXECUTIVE_ACTION",
    pendingExecutiveAction: "INVESTIGATE_LOYALTY",
    currentPresidentId: "p1",
    investigatedPlayerId: "p2",
    investigatedPartyMembership: "LIBERAL",
  });
  snapshot.players.push({
    ...snapshot.players[0],
    id: "p2",
    isHost: false,
    isInvestigated: true,
  });
  return snapshot;
}

it("keeps only received results for the investigator across later turns", () => {
  const snapshot = investigationView();
  const results = rememberPrivateInvestigations({}, snapshot);
  expect(results).toEqual({ p2: "LIBERAL" });
  expect(
    rememberPrivateInvestigations(results, {
      ...snapshot,
      currentPhase: "NOMINATION",
      currentPresidentId: "p2",
      investigatedPlayerId: null,
      investigatedPartyMembership: null,
    }),
  ).toEqual(results);
});

it("does not infer a party from public flags or accept another recipient's result", () => {
  const snapshot = investigationView();
  expect(
    rememberPrivateInvestigations({}, { ...snapshot, myPlayerId: "p2" }),
  ).toEqual({});
  expect(
    rememberPrivateInvestigations(
      {},
      {
        ...snapshot,
        investigatedPartyMembership: null,
      },
    ),
  ).toEqual({});
  expect(
    rememberPrivateInvestigations(
      {},
      {
        ...snapshot,
        currentPhase: "VOTING",
      },
    ),
  ).toEqual({});
});

it("clears results for removed members and new games, and on session or identity reset", () => {
  const snapshot = investigationView();
  const state = roomReducer(initialRoomState, {
    type: "snapshot",
    snapshot,
    generation: 0,
  });
  expect(state.privateInvestigations).toEqual({ p2: "LIBERAL" });
  for (const phase of ["LOBBY", "GAME_OVER"] as const) {
    expect(
      rememberPrivateInvestigations(state.privateInvestigations, {
        ...snapshot,
        currentPhase: phase,
      }),
    ).toEqual({});
  }
  expect(
    rememberPrivateInvestigations(state.privateInvestigations, {
      ...snapshot,
      players: snapshot.players.filter((player) => player.id !== "p2"),
    }),
  ).toEqual({});
  expect(
    roomReducer(state, { type: "reset", generation: 1 }).privateInvestigations,
  ).toEqual({});
  expect(
    roomReducer(state, {
      type: "snapshot",
      snapshot: { ...snapshot, myPlayerId: "p2" },
      generation: 0,
    }).privateInvestigations,
  ).toEqual({});
});
