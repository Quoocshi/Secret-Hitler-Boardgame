import { expect, it } from "vitest";
import { initialRoomState, roomReducer } from "@/lib/realtime/room-reducer";
import { prepareCommand } from "@/lib/realtime/commands";
import { view } from "../support/view";

it("observing the requested phase does not claim per-command success", () => {
  const snapshot = view({
    currentPhase: "NOMINATION",
    currentPresidentId: "p1",
  });
  let state = roomReducer(initialRoomState, {
    type: "snapshot",
    snapshot,
    generation: 0,
  });
  state = roomReducer(state, {
    type: "pending",
    pending: prepareCommand(snapshot, "nominate"),
    generation: 0,
  });
  state = roomReducer(state, {
    type: "snapshot",
    snapshot: view({ currentPhase: "VOTING", nominatedChancellorId: "p1" }),
    generation: 0,
  });
  expect(state.pendingAction).toBeNull();
  expect(state.notice).toBe("Bàn chơi đã cập nhật.");
});

it("tracks an observed veto but resets knowledge when the next government starts", () => {
  let state = roomReducer(initialRoomState, {
    type: "snapshot",
    snapshot: view({ currentPhase: "VETO_CONFIRMATION" }),
    generation: 0,
  });
  expect(state.vetoKnowledge).toBe("observed-requested");
  state = roomReducer(state, {
    type: "snapshot",
    snapshot: view({ currentPhase: "LEGISLATIVE_CHANCELLOR" }),
    generation: 0,
  });
  expect(state.vetoKnowledge).toBe("observed-requested");
  state = roomReducer(state, {
    type: "snapshot",
    snapshot: view({ currentPhase: "NOMINATION" }),
    generation: 0,
  });
  expect(state.vetoKnowledge).toBe("unknown");
});

it("forgets veto observations when reconnecting may have missed a government", () => {
  const state = roomReducer(
    { ...initialRoomState, vetoKnowledge: "observed-requested" },
    {
      type: "connection",
      connection: "reconnecting",
      generation: 0,
    },
  );
  expect(state.vetoKnowledge).toBe("unknown");
});
