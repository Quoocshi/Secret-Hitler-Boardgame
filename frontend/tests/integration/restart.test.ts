import { afterEach, expect, it, vi } from "vitest";
import { actionPermission } from "@/lib/game/permissions";
import { onlineRoom } from "../support/transport-harness";
import { view } from "../support/view";

afterEach(() => vi.useRealTimers());

it("allows only the connected host to reopen a finished room, including an eliminated host", () => {
  const finished = view({ currentPhase: "GAME_OVER" });
  finished.players[0].isAlive = false;
  expect(actionPermission(finished, "restart", true, false).allowed).toBe(true);
  expect(actionPermission(finished, "restart", false, false).allowed).toBe(
    false,
  );
  expect(actionPermission(finished, "restart", true, true).allowed).toBe(false);
  expect(
    actionPermission(
      { ...finished, currentPhase: "LOBBY" },
      "restart",
      true,
      false,
    ).allowed,
  ).toBe(false);
  finished.players[0].isHost = false;
  expect(actionPermission(finished, "restart", true, false).allowed).toBe(
    false,
  );
});

it("waits for the server lobby snapshot before completing restart", async () => {
  vi.useFakeTimers();
  const finished = view({ currentPhase: "GAME_OVER" });
  const room = await onlineRoom(finished);
  try {
    room.client.send("restart");
    expect(room.state().snapshot?.currentPhase).toBe("GAME_OVER");
    expect(room.state().pendingAction?.action).toBe("restart");
    room.push({ ...finished, winReason: "Updated result" });
    expect(room.state().pendingAction?.action).toBe("restart");
    room.push({ ...finished, currentPhase: "LOBBY" });
    expect(room.state().pendingAction).toBeNull();
    expect(room.state().snapshot?.roomCode).toBe(finished.roomCode);
  } finally {
    await room.client.stop();
  }
});
