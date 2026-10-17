import {
  actions,
  executives,
  phases,
  roomCodePattern,
  uuidPattern,
  type CommandResult,
  type PlayerView,
  type RoomResponse,
} from "@/lib/game/types";
export class SchemaError extends Error {
  constructor() {
    super(
      "Dữ liệu phòng không hợp lệ. Hãy đồng bộ lại hoặc cập nhật ứng dụng.",
    );
  }
}
function assert(value: unknown): asserts value {
  if (!value) {
    throw new SchemaError();
  }
}
function object(v: unknown): Record<string, unknown> {
  assert(v !== null && typeof v === "object" && !Array.isArray(v));
  return v as Record<string, unknown>;
}
const text = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const nullableText = (v: unknown) => v === null || text(v);
const one = (v: unknown, options: readonly string[]) =>
  typeof v === "string" && options.includes(v);
const count = (v: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= max;
const array = (v: unknown, test: (v: unknown) => boolean): v is unknown[] =>
  Array.isArray(v) && v.every(test);
export function decodePlayerView(input: unknown): PlayerView {
  const v = object(input);
  assert(typeof v.roomCode === "string" && roomCodePattern.test(v.roomCode));
  assert(
    count(v.stateVersion) &&
      one(v.currentPhase, phases) &&
      one(v.pendingExecutiveAction, executives),
  );
  assert(
    count(v.enactedLiberalPolicies, 5) &&
      count(v.enactedFascistPolicies, 6) &&
      count(v.electionTracker, 3) &&
      count(v.drawDeckSize, 17) &&
      count(v.discardDeckSize, 17),
  );
  assert(
    one(v.winner, ["NONE", "LIBERAL", "FASCIST"]) && nullableText(v.winReason),
  );
  assert(
    Array.isArray(v.players) && v.players.length >= 1 && v.players.length <= 10,
  );
  const players = v.players.map(object);
  const ids = new Set(players.map((p) => p.id));
  assert(ids.size === players.length);
  for (const p of players) {
    assert(
      Object.keys(p).every((k) =>
        [
          "id",
          "nickname",
          "isAlive",
          "isHost",
          "isConnected",
          "isInvestigated",
          "hasVoted",
          "lastRevealedVote",
        ].includes(k),
      ),
    );
    assert(
      text(p.id) &&
        text(p.nickname) &&
        !("role" in p) &&
        !("sessionToken" in p) &&
        !("partyMembership" in p),
    );
    for (const key of [
      "isAlive",
      "isHost",
      "isConnected",
      "isInvestigated",
      "hasVoted",
    ]) {
      assert(typeof p[key] === "boolean");
    }
    assert(
      p.lastRevealedVote === null || one(p.lastRevealedVote, ["JA", "NEIN"]),
    );
  }
  assert(text(v.myPlayerId) && ids.has(v.myPlayerId));
  for (const key of [
    "currentPresidentId",
    "currentChancellorId",
    "nominatedChancellorId",
    "lastElectedPresidentId",
    "lastElectedChancellorId",
  ]) {
    assert(v[key] === null || (text(v[key]) && ids.has(v[key])));
  }
  assert(v.myRole === null || one(v.myRole, ["LIBERAL", "FASCIST", "HITLER"]));
  assert(array(v.knownAllyIds, (x) => text(x) && ids.has(x)));
  assert(
    array(v.handCards, (x) => one(x, ["LIBERAL", "FASCIST"])) &&
      v.handCards.length <= 3,
  );
  const expectedHand =
    v.currentPhase === "LEGISLATIVE_PRESIDENT" &&
    v.myPlayerId === v.currentPresidentId
      ? 3
      : v.currentPhase === "LEGISLATIVE_CHANCELLOR" &&
          v.myPlayerId === v.currentChancellorId
        ? 2
        : v.currentPhase === "EXECUTIVE_ACTION" &&
            v.pendingExecutiveAction === "POLICY_PEEK" &&
            v.myPlayerId === v.currentPresidentId
          ? 3
          : 0;
  assert(v.handCards.length === expectedHand);
  assert(
    v.investigatedPartyMembership === null ||
      one(v.investigatedPartyMembership, ["LIBERAL", "FASCIST"]),
  );
  assert(
    typeof v.vetoRequestedThisRound === "boolean" &&
      array(v.gameLogs, (x) => typeof x === "string"),
  );
  assert(Array.isArray(v.investigationResults));
  for (const entry of v.investigationResults) {
    const r = object(entry);
    assert(
      text(r.investigationId) &&
        uuidPattern.test(r.investigationId) &&
        text(r.targetPlayerId) &&
        ids.has(r.targetPlayerId) &&
        one(r.partyMembership, ["LIBERAL", "FASCIST"]) &&
        !("investigatorPlayerId" in r) &&
        !("role" in r),
    );
  }
  // Keep only the documented DTO; unknown root fields cannot propagate secrets.
  const keys = [
    "roomCode",
    "stateVersion",
    "currentPhase",
    "enactedLiberalPolicies",
    "enactedFascistPolicies",
    "electionTracker",
    "drawDeckSize",
    "discardDeckSize",
    "currentPresidentId",
    "currentChancellorId",
    "nominatedChancellorId",
    "lastElectedPresidentId",
    "lastElectedChancellorId",
    "pendingExecutiveAction",
    "winner",
    "winReason",
    "players",
    "gameLogs",
    "myPlayerId",
    "myRole",
    "knownAllyIds",
    "handCards",
    "investigatedPartyMembership",
    "vetoRequestedThisRound",
    "investigationResults",
  ];
  return Object.fromEntries(
    keys.map((k) => [k, v[k]]),
  ) as unknown as PlayerView;
}
export function decodeResult(input: unknown): CommandResult {
  const v = object(input);
  assert(
    text(v.actionId) &&
      uuidPattern.test(v.actionId) &&
      one(v.action, actions) &&
      one(v.status, ["ACCEPTED", "REJECTED"]) &&
      nullableText(v.code) &&
      nullableText(v.message) &&
      count(v.stateVersion),
  );
  return {
    actionId: v.actionId,
    action: v.action,
    status: v.status,
    code: v.code,
    message: v.message,
    stateVersion: v.stateVersion,
  } as CommandResult;
}
export function decodeRoomResponse(input: unknown): RoomResponse {
  const v = object(input);
  const gameState = decodePlayerView(v.gameState);
  assert(v.roomCode === gameState.roomCode);
  return { roomCode: gameState.roomCode, gameState };
}
