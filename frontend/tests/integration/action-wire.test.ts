import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Action, PlayerView } from "@/lib/game/types";
import { onlineRoom } from "../support/transport-harness";
import { view } from "../support/view";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

const players = Array.from({ length: 5 }, (_, index) => ({
  ...view().players[0],
  id: "p" + (index + 1),
  nickname: "Player " + (index + 1),
  isHost: index === 0,
}));
const cases: {
  action: Action;
  phase: PlayerView["currentPhase"];
  payload: Record<string, unknown>;
  extra?: Partial<PlayerView>;
}[] = [
  { action: "start", phase: "LOBBY", payload: {} },
  {
    action: "nominate",
    phase: "NOMINATION",
    payload: { targetPlayerId: "p2" },
  },
  { action: "vote", phase: "VOTING", payload: { vote: "JA" } },
  {
    action: "discard",
    phase: "LEGISLATIVE_PRESIDENT",
    payload: { policyIndex: 1 },
    extra: { handCards: ["LIBERAL", "FASCIST", "FASCIST"] },
  },
  {
    action: "enact",
    phase: "LEGISLATIVE_CHANCELLOR",
    payload: { policyIndex: 0 },
    extra: { handCards: ["LIBERAL", "FASCIST"] },
  },
  {
    action: "veto/request",
    phase: "LEGISLATIVE_CHANCELLOR",
    payload: {},
    extra: { enactedFascistPolicies: 5 },
  },
  {
    action: "veto/response",
    phase: "VETO_CONFIRMATION",
    payload: { approve: false },
  },
  {
    action: "execute",
    phase: "EXECUTIVE_ACTION",
    payload: { targetPlayerId: "p2" },
    extra: { pendingExecutiveAction: "EXECUTION" },
  },
  {
    action: "investigate",
    phase: "EXECUTIVE_ACTION",
    payload: { targetPlayerId: "p2" },
    extra: { pendingExecutiveAction: "INVESTIGATE_LOYALTY" },
  },
  {
    action: "special-election",
    phase: "EXECUTIVE_ACTION",
    payload: { targetPlayerId: "p2" },
    extra: { pendingExecutiveAction: "SPECIAL_ELECTION" },
  },
  {
    action: "end-action",
    phase: "EXECUTIVE_ACTION",
    payload: {},
    extra: {
      pendingExecutiveAction: "POLICY_PEEK",
      handCards: ["LIBERAL", "FASCIST", "LIBERAL"],
    },
  },
];

it.each(cases)(
  "uses the legacy wire contract for $action",
  async ({ action, phase, payload, extra }) => {
    const room = await onlineRoom(
      view({
        players,
        currentPhase: phase,
        currentPresidentId: "p1",
        currentChancellorId: "p1",
        ...extra,
      }),
    );
    room.client.send(action, payload);
    const frame = room.socket.publish.mock.calls[0][0];
    expect(frame.destination).toBe(`/app/room/ABC234/${action}`);
    expect(JSON.parse(frame.body)).toEqual(payload);
    expect(
      frame.headers["X-Session-Token"] === room.identity.sessionToken,
    ).toBe(true);
    await room.client.stop();
  },
);

it.each(cases)(
  "does not publish $action in an unavailable context",
  async ({ action, payload }) => {
    const room = await onlineRoom(
      view({ currentPhase: "GAME_OVER", winner: "LIBERAL" }),
    );
    expect(() => room.client.send(action, payload)).toThrow();
    expect(room.socket.publish).not.toHaveBeenCalled();
    await room.client.stop();
  },
);
