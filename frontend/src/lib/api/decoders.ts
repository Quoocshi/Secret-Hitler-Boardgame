import {
  executives,
  phases,
  roomCodePattern,
  type PlayerView,
  type PublicPlayer,
  type RoomResponse,
} from "@/lib/game/types";

export class SchemaError extends Error {
  constructor() {
    super(
      "Dữ liệu phòng không hợp lệ. Hãy đồng bộ lại hoặc cập nhật ứng dụng.",
    );
  }
}

function assert(condition: unknown): asserts condition {
  if (!condition) {
    throw new SchemaError();
  }
}

function record(value: unknown): Record<string, unknown> {
  assert(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}

const isText = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;
const isMember = (value: unknown, choices: readonly string[]) =>
  typeof value === "string" && choices.includes(value);
const isCount = (value: unknown, maximum: number) =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= maximum;

function decodePlayer(input: unknown, gameOver: boolean): PublicPlayer {
  const player = record(input);
  const publicKeys = [
    "id",
    "nickname",
    "isAlive",
    "isHost",
    "isConnected",
    "isInvestigated",
    "hasVoted",
    "lastRevealedVote",
    "revealedRole",
  ];
  assert(Object.keys(player).every((key) => publicKeys.includes(key)));
  assert(isText(player.id) && isText(player.nickname));
  for (const key of [
    "isAlive",
    "isHost",
    "isConnected",
    "isInvestigated",
    "hasVoted",
  ]) {
    assert(typeof player[key] === "boolean");
  }
  assert(
    player.lastRevealedVote === null ||
      isMember(player.lastRevealedVote, ["JA", "NEIN"]),
  );
  const revealedRole = player.revealedRole ?? null;
  assert(
    revealedRole === null ||
      (gameOver && isMember(revealedRole, ["LIBERAL", "FASCIST", "HITLER"])),
  );
  return Object.fromEntries(
    publicKeys.map((key) => [key, player[key]]),
  ) as unknown as PublicPlayer;
}

export function decodePlayerView(input: unknown): PlayerView {
  const view = record(input);
  assert(
    typeof view.roomCode === "string" && roomCodePattern.test(view.roomCode),
  );
  assert(
    isMember(view.currentPhase, phases) &&
      isMember(view.pendingExecutiveAction, executives),
  );
  for (const [key, maximum] of Object.entries({
    enactedLiberalPolicies: 5,
    enactedFascistPolicies: 6,
    electionTracker: 3,
    drawDeckSize: 17,
    discardDeckSize: 17,
  })) {
    assert(isCount(view[key], maximum));
  }
  assert(isMember(view.winner, ["NONE", "LIBERAL", "FASCIST"]));
  assert(view.winReason === null || isText(view.winReason));
  assert(
    Array.isArray(view.players) &&
      view.players.length >= 1 &&
      view.players.length <= 10,
  );
  const players = view.players.map((player) =>
    decodePlayer(player, view.currentPhase === "GAME_OVER"),
  );
  const playerIds = new Set(players.map((player) => player.id));
  assert(
    playerIds.size === players.length &&
      isText(view.myPlayerId) &&
      playerIds.has(view.myPlayerId),
  );
  if (view.eligibleChancellorIds !== undefined) {
    assert(
      Array.isArray(view.eligibleChancellorIds) &&
        view.eligibleChancellorIds.every(
          (id) => isText(id) && playerIds.has(id),
        ),
    );
  }
  const suppliedInvestigationTarget = view.investigatedPlayerId ?? null;
  assert(
    suppliedInvestigationTarget === null || isText(suppliedInvestigationTarget),
  );
  const investigatedPlayerId =
    suppliedInvestigationTarget !== null &&
    playerIds.has(suppliedInvestigationTarget)
      ? suppliedInvestigationTarget
      : null;
  for (const key of [
    "currentPresidentId",
    "currentChancellorId",
    "nominatedChancellorId",
    "lastElectedPresidentId",
    "lastElectedChancellorId",
  ]) {
    // BE retains office references when a member leaves, including in an aborted game.
    // Keep the identifiers without treating a removed office holder as an active player.
    assert(view[key] === null || isText(view[key]));
  }
  assert(
    view.myRole === null ||
      isMember(view.myRole, ["LIBERAL", "FASCIST", "HITLER"]),
  );
  assert(
    Array.isArray(view.knownAllyIds) &&
      view.knownAllyIds.every((id) => isText(id) && playerIds.has(id)),
  );
  assert(
    Array.isArray(view.handCards) &&
      view.handCards.length <= 3 &&
      view.handCards.every((card) => isMember(card, ["LIBERAL", "FASCIST"])),
  );
  assert(
    view.investigatedPartyMembership === null ||
      isMember(view.investigatedPartyMembership, ["LIBERAL", "FASCIST"]),
  );
  assert(
    Array.isArray(view.gameLogs) &&
      view.gameLogs.every((entry) => typeof entry === "string"),
  );

  const presidentCanSee =
    view.myPlayerId === view.currentPresidentId &&
    (view.currentPhase === "LEGISLATIVE_PRESIDENT" ||
      (view.currentPhase === "EXECUTIVE_ACTION" &&
        view.pendingExecutiveAction === "POLICY_PEEK"));
  const chancellorCanSee =
    view.myPlayerId === view.currentChancellorId &&
    view.currentPhase === "LEGISLATIVE_CHANCELLOR";
  const ownPlayerIsAlive =
    players.find((player) => player.id === view.myPlayerId)?.isAlive === true;
  const keys = [
    "roomCode",
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
    "eligibleChancellorIds",
    "pendingExecutiveAction",
    "winner",
    "winReason",
    "gameLogs",
    "myPlayerId",
    "myRole",
  ];
  const canSeeInvestigation =
    ownPlayerIsAlive &&
    view.myPlayerId === view.currentPresidentId &&
    view.currentPhase === "EXECUTIVE_ACTION" &&
    view.pendingExecutiveAction === "INVESTIGATE_LOYALTY" &&
    investigatedPlayerId !== null;
  // Ignore unknown root fields. In particular, stale executive cards never enter UI state.
  return {
    ...Object.fromEntries(keys.map((key) => [key, view[key]])),
    // Hitler knows teammates only at tables with at most six players.
    // Eliminated players still count toward the table size.
    knownAllyIds:
      view.myRole === "HITLER" && players.length >= 7
        ? []
        : [...(view.knownAllyIds as string[])],
    players,
    investigatedPlayerId: canSeeInvestigation ? investigatedPlayerId : null,
    investigatedPartyMembership: canSeeInvestigation
      ? view.investigatedPartyMembership
      : null,
    handCards:
      ownPlayerIsAlive && (presidentCanSee || chancellorCanSee)
        ? [...view.handCards]
        : [],
  } as unknown as PlayerView;
}

export function decodeRoomResponse(input: unknown): RoomResponse {
  const response = record(input);
  const gameState = decodePlayerView(response.gameState);
  assert(response.roomCode === gameState.roomCode);
  return { roomCode: gameState.roomCode, gameState };
}
