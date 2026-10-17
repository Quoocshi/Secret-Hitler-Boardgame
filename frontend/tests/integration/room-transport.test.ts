import { expect, it } from "vitest";
import { initialRoomState, roomReducer } from "@/lib/realtime/room-reducer";
import { prepareCommand } from "@/lib/realtime/commands";
import { view } from "../support/view";

it("ignores obsolete generations and identical polls do not advance local revision", () => {
  const snapshot = view();
  const state = roomReducer(initialRoomState, {
    type: "snapshot",
    snapshot,
    generation: 0,
  });
  expect(
    roomReducer(state, { type: "snapshot", snapshot, generation: 5 }),
  ).toBe(state);
  expect(
    roomReducer(state, { type: "snapshot", snapshot, generation: 0 })
      .viewRevision,
  ).toBe(1);
});

it("does not treat unrelated membership changes as a command acknowledgement", () => {
  const snapshot = view({ currentPhase: "VOTING" });
  let state = roomReducer(initialRoomState, {
    type: "snapshot",
    snapshot,
    generation: 0,
  });
  const pending = prepareCommand(snapshot, "vote");
  state = roomReducer(state, { type: "pending", pending, generation: 0 });
  const changed = view({
    currentPhase: "VOTING",
    gameLogs: ["An unrelated event"],
  });
  state = roomReducer(state, {
    type: "snapshot",
    snapshot: changed,
    generation: 0,
  });
  expect(state.pendingAction).toBe(pending);
  expect(state.notice ?? "").not.toContain("xác nhận");
});

it("removes private data on identity mismatch", () => {
  const state = roomReducer(initialRoomState, {
    type: "snapshot",
    snapshot: view(),
    generation: 0,
  });
  const result = roomReducer(state, {
    type: "snapshot",
    snapshot: view({ myPlayerId: "other" }),
    generation: 0,
  });
  expect(result.snapshot).toBeNull();
  expect(result.connection).toBe("error");
});
