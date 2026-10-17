import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  onlineRoom,
  transport,
  flushTransport,
} from "../support/transport-harness";
import { view } from "../support/view";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

it("subscribes only to the exact own queue and restores presence without receipts", async () => {
  const room = await onlineRoom();
  expect(room.state().connection).toBe("online");
  expect(
    [...room.socket.callbacks.keys()].map((path) =>
      path.replace(room.identity.sessionToken, "<own>"),
    ),
  ).toEqual(["/queue/room/ABC234/state/<own>"]);
  expect(transport.join).toHaveBeenCalledOnce();
  await room.client.stop();
});

it("removes the private view and never joins again after membership is deleted", async () => {
  const room = await onlineRoom();
  transport.get.mockRejectedValue(
    new ApiError("INVALID_SESSION", "Invalid", 400),
  );
  room.socket.forceDisconnect();
  room.socket.connected = true;
  room.socket.onConnect?.();
  await flushTransport();
  expect(transport.join).toHaveBeenCalledOnce();
  expect(room.state().snapshot).toBeNull();
  expect(room.state().connection).toBe("expired");
});

it("ignores callbacks from a disconnected socket epoch", async () => {
  const room = await onlineRoom();
  const oldCallback = [...room.socket.callbacks.values()][0];
  room.socket.forceDisconnect();
  oldCallback({
    body: JSON.stringify(
      view({ currentPhase: "GAME_OVER", winner: "LIBERAL" }),
    ),
  });
  expect(room.state().snapshot?.currentPhase).toBe("VOTING");
  await room.client.stop();
});

it("discards a GET response that started before a newer push", async () => {
  const room = await onlineRoom();
  let resolveRead!: (value: ReturnType<typeof view>) => void;
  transport.get.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
  );
  await vi.advanceTimersByTimeAsync(2000);
  room.push(view({ currentPhase: "NOMINATION", currentPresidentId: "p1" }));
  resolveRead(view());
  await flushTransport();
  expect(room.state().snapshot?.currentPhase).toBe("NOMINATION");
  await room.client.stop();
});

it("limits presence repair instead of joining forever", async () => {
  const snapshot = view();
  snapshot.players[0].isConnected = false;
  const room = await onlineRoom(snapshot);
  await vi.advanceTimersByTimeAsync(4000);
  expect(transport.join.mock.calls.length).toBe(3);
  expect(room.state().connection).toBe("error");
  expect(room.socket.active).toBe(false);
});

it("stopping cancels polling and action callbacks", async () => {
  const room = await onlineRoom();
  room.client.send("vote", { vote: "JA" });
  await room.client.stop();
  const reads = transport.get.mock.calls.length;
  await vi.advanceTimersByTimeAsync(30000);
  expect(transport.get.mock.calls.length).toBe(reads);
  expect(room.socket.unsubscribe).toHaveBeenCalledOnce();
});

it("ignores an in-flight GET after stop and never starts another poll", async () => {
  const room = await onlineRoom();
  let resolveRead!: (value: ReturnType<typeof view>) => void;
  transport.get.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRead = resolve;
      }),
  );
  await vi.advanceTimersByTimeAsync(2000);
  const reads = transport.get.mock.calls.length;
  await vi.advanceTimersByTimeAsync(6000);
  expect(transport.get.mock.calls.length).toBe(reads);
  await room.client.stop();
  resolveRead(view({ currentPhase: "GAME_OVER" }));
  await flushTransport();
  expect(room.state().snapshot?.currentPhase).toBe("VOTING");
});

it("does not restore presence when the room no longer exists", async () => {
  const room = await onlineRoom();
  transport.get.mockRejectedValue(
    new ApiError("ROOM_NOT_FOUND", "Room expired", 400),
  );
  room.socket.forceDisconnect();
  room.socket.connected = true;
  room.socket.onConnect?.();
  await flushTransport();
  expect(transport.join).toHaveBeenCalledOnce();
  expect(room.state().snapshot).toBeNull();
  expect(room.state().connection).toBe("expired");
});
