import { describe, expect, it } from "vitest";
import {
  initialRoomState,
  type ClientRoomState,
} from "@/lib/realtime/room-reducer";
import { roomSoundEvent } from "@/lib/audio/room-sound-events";
import { view } from "../support/view";
import type { PlayerView } from "@/lib/game/types";

function state(
  snapshot: Partial<PlayerView> = {},
  overrides: Partial<ClientRoomState> = {},
): ClientRoomState {
  return {
    ...initialRoomState,
    connection: "online",
    snapshot: view(snapshot),
    ...overrides,
  };
}

describe("room audio transitions", () => {
  it("uses first snapshots, generations and resyncs as silent baselines", () => {
    expect(roomSoundEvent(state({}, { snapshot: null }), state())).toBeNull();
    expect(
      roomSoundEvent(
        state(),
        state({ currentPhase: "GAME_OVER" }, { generation: 1 }),
      ),
    ).toBeNull();
    expect(
      roomSoundEvent(
        state({}, { connection: "syncing" }),
        state({ currentPhase: "GAME_OVER" }, { connection: "syncing" }),
      ),
    ).toBeNull();
    expect(roomSoundEvent(state(), state())).toBeNull();
    expect(
      roomSoundEvent(state(), state({ gameLogs: ["updated"] })),
    ).toBeNull();
  });

  it("plays start once and shares policy sounds across parties", () => {
    expect(
      roomSoundEvent(
        state(),
        state({ currentPhase: "NOMINATION", currentPresidentId: "p1" }),
      ),
    ).toBe("start");
    for (const policy of [
      "enactedLiberalPolicies",
      "enactedFascistPolicies",
    ] as const) {
      expect(
        roomSoundEvent(
          state({ currentPhase: "LEGISLATIVE_CHANCELLOR" }),
          state({ currentPhase: "NOMINATION", [policy]: 1 }),
        ),
      ).toBe("gavel");
    }
  });

  it("signals consecutive turns even when the same player acts in both phases", () => {
    expect(
      roomSoundEvent(
        state({ currentPhase: "NOMINATION", currentPresidentId: "p1" }),
        state({
          currentPhase: "VOTING",
          currentPresidentId: "p1",
          nominatedChancellorId: "p2",
        }),
      ),
    ).toBe("notify");
    const voting = state({ currentPhase: "VOTING" });
    const update = state({
      currentPhase: "VOTING",
      players: [{ ...view().players[0], hasVoted: true }],
    });
    expect(roomSoundEvent(voting, update)).toBeNull();
  });

  it("uses the same deal sound regardless of card contents and ignores rerenders", () => {
    const previous = state({ currentPhase: "VOTING" });
    for (const card of ["LIBERAL", "FASCIST"] as const) {
      const next = state({
        currentPhase: "LEGISLATIVE_PRESIDENT",
        currentPresidentId: "p1",
        handCards: [card, card, card],
      });
      expect(roomSoundEvent(previous, next)).toBe("policies");
      expect(roomSoundEvent(next, { ...next, viewRevision: 100 })).toBeNull();
    }
    expect(
      roomSoundEvent(
        previous,
        state({
          currentPhase: "LEGISLATIVE_CHANCELLOR",
          handCards: ["LIBERAL", "FASCIST"],
        }),
      ),
    ).toBe("paper");
    expect(
      roomSoundEvent(
        previous,
        state({
          currentPhase: "EXECUTIVE_ACTION",
          pendingExecutiveAction: "POLICY_PEEK",
          handCards: ["LIBERAL", "LIBERAL", "FASCIST"],
        }),
      ),
    ).toBe("policies");
  });

  it("does not confuse membership removal with execution; execution beats game over", () => {
    const previous = state({
      currentPhase: "EXECUTIVE_ACTION",
      pendingExecutiveAction: "EXECUTION",
    });
    expect(
      roomSoundEvent(
        previous,
        state({
          currentPhase: "GAME_OVER",
          players: [{ ...view().players[0], isAlive: false }],
        }),
      ),
    ).toBe("gunshot");
    expect(
      roomSoundEvent(
        previous,
        state({ currentPhase: "NOMINATION", players: [] }),
      ),
    ).toBe("knock");
    expect(roomSoundEvent(previous, state({ currentPhase: "GAME_OVER" }))).toBe(
      "gavel",
    );
  });

  it("announces newly received investigation results only once", () => {
    const previous = state({
      currentPhase: "EXECUTIVE_ACTION",
      pendingExecutiveAction: "INVESTIGATE_LOYALTY",
    });
    const result = {
      ...previous,
      privateInvestigations: { p2: "LIBERAL" as const },
    };
    expect(roomSoundEvent(previous, result)).toBe("paper");
    expect(roomSoundEvent(result, { ...result })).toBeNull();
  });

  it("reveals votes only on leaving voting and alerts once per connection transition", () => {
    const revealed = [
      { ...view().players[0], lastRevealedVote: "JA" as const },
    ];
    expect(
      roomSoundEvent(
        state({ currentPhase: "VOTING" }),
        state({ currentPhase: "LEGISLATIVE_PRESIDENT", players: revealed }),
      ),
    ).toBe("card");
    expect(
      roomSoundEvent(
        state({ currentPhase: "NOMINATION", players: revealed }),
        state({ currentPhase: "NOMINATION", players: revealed }),
      ),
    ).toBeNull();
    expect(
      roomSoundEvent(state(), state({}, { connection: "reconnecting" })),
    ).toBe("error");
    expect(
      roomSoundEvent(
        state({}, { connection: "reconnecting" }),
        state({}, { connection: "reconnecting" }),
      ),
    ).toBeNull();
    expect(
      roomSoundEvent(
        state({}, { connection: "syncing" }),
        state({ currentPhase: "GAME_OVER" }),
      ),
    ).toBe("notify");
  });
});
