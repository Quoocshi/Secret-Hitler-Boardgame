import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  actionPermission,
  kickTargetEligibility,
} from "@/lib/game/permissions";
import { decodePlayerView } from "@/lib/api/decoders";
import {
  onlineRoom,
  transport,
  flushTransport,
} from "../support/transport-harness";
import { view } from "../support/view";
import { RoomClient } from "@/lib/realtime/room-client";
import { initialRoomState, roomReducer } from "@/lib/realtime/room-reducer";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

function roomWithGuests() {
  const snapshot = view({ currentPhase: "LOBBY" });
  snapshot.players.push(
    { ...snapshot.players[0], id: "p2", nickname: "Guest", isHost: false },
    { ...snapshot.players[0], id: "p3", nickname: "Other", isHost: false },
  );
  return snapshot;
}

it("discards a removed membership before opening a socket or joining during restoration", async () => {
  const previous = await onlineRoom(roomWithGuests());
  await previous.client.stop();
  transport.get.mockRejectedValue(
    new ApiError("INVALID_SESSION", "Invalid", 400),
  );
  let state = { ...initialRoomState };
  const client = new RoomClient(
    previous.identity,
    0,
    (event) => {
      state = roomReducer(state, event);
    },
    () => state,
  );
  await client.start();
  expect(state.connection).toBe("removed");
  expect(state.snapshot).toBeNull();
  expect(transport.join).toHaveBeenCalledOnce();
  expect(transport.FakeClient.instances.at(-1)?.active).toBe(false);
});

it("permits room management for an eliminated host, but never for guests or self targets", () => {
  const snapshot = roomWithGuests();
  snapshot.currentPhase = "GAME_OVER";
  snapshot.players[0].isAlive = false;
  expect(actionPermission(snapshot, "kick", true, false).allowed).toBe(true);
  expect(kickTargetEligibility(snapshot, "p1").allowed).toBe(false);
  expect(kickTargetEligibility(snapshot, "missing").allowed).toBe(false);
  snapshot.players[0].isHost = false;
  expect(actionPermission(snapshot, "kick", true, false).allowed).toBe(false);
});

it("sends kick once with the session header and waits for the selected member to disappear", async () => {
  const snapshot = roomWithGuests();
  const room = await onlineRoom(snapshot);
  room.client.send("kick", { targetPlayerId: "p2" });
  const frame = room.socket.publish.mock.calls[0][0];
  expect(frame.destination).toBe("/app/room/ABC234/kick");
  expect(JSON.parse(frame.body)).toEqual({ targetPlayerId: "p2" });
  expect(frame.headers["X-Session-Token"] === room.identity.sessionToken).toBe(
    true,
  );
  expect(() => room.client.send("kick", { targetPlayerId: "p2" })).toThrow();
  room.push({
    ...snapshot,
    players: snapshot.players.filter((player) => player.id !== "p3"),
  });
  expect(room.state().pendingAction).not.toBeNull();
  room.push({
    ...snapshot,
    players: snapshot.players.filter((player) => player.id !== "p2"),
  });
  expect(room.state().pendingAction).toBeNull();
  expect(room.socket.publish).toHaveBeenCalledOnce();
  await room.client.stop();
});

it("never publishes kick for self or an unknown target", async () => {
  const room = await onlineRoom(roomWithGuests());
  for (const targetPlayerId of ["p1", "missing"]) {
    expect(() => room.client.send("kick", { targetPlayerId })).toThrow();
  }
  expect(room.socket.publish).not.toHaveBeenCalled();
  await room.client.stop();
});

it("confirms voluntary leave only when membership is gone, without restoring presence", async () => {
  const room = await onlineRoom(roomWithGuests());
  transport.get
    .mockResolvedValueOnce(roomWithGuests())
    .mockRejectedValue(new ApiError("INVALID_SESSION", "Invalid", 400));
  const leaving = room.client.leave();
  await flushTransport();
  expect(room.state().connection).toBe("leaving");
  await expect(room.client.leave()).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(250);
  await leaving;
  const frame = room.socket.publish.mock.calls[0][0];
  expect(frame.destination).toBe("/app/room/ABC234/leave");
  expect(frame.headers["X-Session-Token"] === room.identity.sessionToken).toBe(
    true,
  );
  expect(room.socket.publish).toHaveBeenCalledOnce();
  expect(transport.join).toHaveBeenCalledOnce();
  expect(room.socket.active).toBe(false);
  room.socket.onConnect?.();
  await flushTransport();
  expect(transport.join).toHaveBeenCalledOnce();
});

it("reports an unconfirmed leave instead of claiming success or replaying it", async () => {
  const room = await onlineRoom(roomWithGuests());
  transport.get.mockRejectedValue(new ApiError("NETWORK_ERROR", "Offline", 0));
  await expect(room.client.leave()).rejects.toThrow("Chưa xác nhận");
  expect(room.state().snapshot).not.toBeNull();
  expect(room.socket.publish).toHaveBeenCalledOnce();
  expect(transport.join).toHaveBeenCalledOnce();
  expect(room.socket.active).toBe(false);
});

it("accepts the BE abort snapshot with references to a removed office holder", () => {
  const snapshot = roomWithGuests();
  const decoded = decodePlayerView({
    ...snapshot,
    currentPhase: "GAME_OVER",
    winner: "NONE",
    winReason: "Too few players",
    currentPresidentId: "removed-president",
    nominatedChancellorId: "removed-nominee",
  });
  expect(decoded.currentPhase).toBe("GAME_OVER");
  expect(decoded.handCards).toEqual([]);
});

it("drops investigation details when the investigated member has left", () => {
  const decoded = decodePlayerView({
    ...roomWithGuests(),
    currentPhase: "EXECUTIVE_ACTION",
    currentPresidentId: "p1",
    pendingExecutiveAction: "INVESTIGATE_LOYALTY",
    investigatedPlayerId: "removed-target",
    investigatedPartyMembership: "FASCIST",
  });
  expect(decoded.investigatedPlayerId).toBeNull();
  expect(decoded.investigatedPartyMembership).toBeNull();
});
