import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { onlineRoom } from "../support/transport-harness";
import { view } from "../support/view";
import { ACTION_DEADLINE_MS, ACTION_TIMEOUT_MS } from "@/lib/realtime/commands";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

it("locks synchronously against double clicks and sends the session header", async () => {
  const room = await onlineRoom();
  room.client.send("vote", { vote: "JA" });
  expect(() => room.client.send("vote", { vote: "NEIN" })).toThrow();
  expect(room.socket.publish).toHaveBeenCalledOnce();
  const frame = room.socket.publish.mock.calls[0][0];
  expect(frame.headers["X-Session-Token"] === room.identity.sessionToken).toBe(
    true,
  );
  expect(frame.headers).not.toHaveProperty("X-Expected-Version");
  expect(frame.headers).not.toHaveProperty("X-Action-Id");
  await room.client.stop();
});

it("treats a local publish exception as uncertain without retrying", async () => {
  const room = await onlineRoom();
  room.socket.publish.mockImplementationOnce(() => {
    throw new Error("Transport closed");
  });
  expect(() => room.client.send("vote", { vote: "JA" })).toThrow(
    "Chưa xác định",
  );
  expect(room.state().uncertainAction).not.toBeNull();
  await vi.advanceTimersByTimeAsync(8000);
  expect(room.socket.publish).toHaveBeenCalledOnce();
  await room.client.stop();
});

it("does not correlate a broker ERROR with a command rejection", async () => {
  const room = await onlineRoom();
  room.client.send("vote", { vote: "JA" });
  room.socket.onStompError?.();
  expect(room.state().uncertainAction).not.toBeNull();
  expect(room.state().connection).toBe("reconnecting");
  expect(room.state().notice).not.toContain("bị từ chối");
  expect(room.socket.publish).toHaveBeenCalledOnce();
  await room.client.stop();
});

it("keeps its notice deadline and render budget despite unrelated polls", async () => {
  const room = await onlineRoom();
  room.client.send("vote", { vote: "JA" });
  await vi.advanceTimersByTimeAsync(ACTION_TIMEOUT_MS - 1);
  room.push(
    view({ currentPhase: "VOTING", gameLogs: ["Another player connected"] }),
  );
  expect(room.state().pendingAction).not.toBeNull();
  await vi.advanceTimersByTimeAsync(1);
  expect(room.state().uncertainAction).not.toBeNull();
  expect(ACTION_TIMEOUT_MS).toBeLessThan(ACTION_DEADLINE_MS);
  expect(room.socket.publish).toHaveBeenCalledOnce();
  await room.client.stop();
});

it.each(Array.from({ length: 10 }, (_, index) => index))(
  "never replays an unresolved action, interruption case %i",
  async (caseIndex) => {
    const room = await onlineRoom();
    room.client.send("vote", { vote: "JA" });
    if (caseIndex % 2) {
      room.socket.forceDisconnect();
    } else {
      room.push(
        view({ currentPhase: "VOTING", gameLogs: ["Unrelated change"] }),
      );
    }
    await vi.advanceTimersByTimeAsync(8000);
    expect(room.state().uncertainAction).not.toBeNull();
    expect(room.socket.publish).toHaveBeenCalledOnce();
    expect(room.state().notice).not.toContain("máy chủ xác nhận");
    await room.client.stop();
  },
);
