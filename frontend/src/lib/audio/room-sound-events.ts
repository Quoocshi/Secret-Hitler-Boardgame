import type { ClientRoomState } from "@/lib/realtime/room-reducer";
import { awaitingPlayerIds } from "@/lib/game/presentation";
import type { SoundId } from "./sounds";

const ERROR_CONNECTIONS = [
  "error",
  "expired",
  "removed",
  "duplicate",
  "reconnecting",
];

/** One sound per accepted transition; first/resynchronized views are baselines. */
export function roomSoundEvent(
  previous: ClientRoomState,
  next: ClientRoomState,
): SoundId | null {
  if (previous.generation !== next.generation) {
    return null;
  }
  if (previous.connection !== next.connection) {
    if (ERROR_CONNECTIONS.includes(next.connection)) {
      return "error";
    }
    if (next.connection === "online") {
      return "notify";
    }
  }
  if (previous.connection !== "online" || next.connection !== "online") {
    return null;
  }
  const before = previous.snapshot;
  const after = next.snapshot;
  if (
    !before ||
    !after ||
    before.roomCode !== after.roomCode ||
    before.myPlayerId !== after.myPlayerId
  ) {
    return null;
  }

  if (
    after.players.some(
      (player) =>
        !player.isAlive &&
        before.players.some((old) => old.id === player.id && old.isAlive),
    )
  ) {
    return "gunshot";
  }
  if (
    before.currentPhase !== "GAME_OVER" &&
    after.currentPhase === "GAME_OVER"
  ) {
    return "gavel";
  }
  if (before.currentPhase === "LOBBY" && after.currentPhase !== "LOBBY") {
    return "start";
  }
  if (
    after.enactedLiberalPolicies > before.enactedLiberalPolicies ||
    after.enactedFascistPolicies > before.enactedFascistPolicies
  ) {
    return "gavel";
  }

  const phaseChanged = before.currentPhase !== after.currentPhase;
  // Dealing the private hand also signals the owner's turn; do not stack a chime.
  const newHand =
    phaseChanged ||
    before.pendingExecutiveAction !== after.pendingExecutiveAction ||
    before.handCards.length !== after.handCards.length;
  if (newHand && after.handCards.length) {
    return after.handCards.length === 3 ? "policies" : "paper";
  }
  const newTurn =
    phaseChanged ||
    before.currentPresidentId !== after.currentPresidentId ||
    before.currentChancellorId !== after.currentChancellorId ||
    before.nominatedChancellorId !== after.nominatedChancellorId ||
    before.pendingExecutiveAction !== after.pendingExecutiveAction;
  if (newTurn && awaitingPlayerIds(after).includes(after.myPlayerId)) {
    return "notify";
  }

  if (
    Object.keys(next.privateInvestigations).some(
      (id) => !previous.privateInvestigations[id],
    )
  ) {
    return "paper";
  }
  if (before.currentPhase === "NOMINATION" && after.currentPhase === "VOTING") {
    return "gavel";
  }
  if (
    before.currentPhase === "VOTING" &&
    phaseChanged &&
    after.players.some((player) => player.lastRevealedVote)
  ) {
    return "card";
  }
  if (
    before.currentPhase === "LEGISLATIVE_PRESIDENT" &&
    after.currentPhase === "LEGISLATIVE_CHANCELLOR"
  ) {
    return "paper";
  }
  if (
    before.currentPhase === "EXECUTIVE_ACTION" &&
    before.pendingExecutiveAction === "SPECIAL_ELECTION" &&
    after.currentPhase === "NOMINATION" &&
    before.currentPresidentId !== after.currentPresidentId
  ) {
    return "gavel";
  }
  if (before.currentPhase === "GAME_OVER" && after.currentPhase === "LOBBY") {
    return "notify";
  }
  if (
    after.electionTracker > before.electionTracker ||
    before.players.length !== after.players.length ||
    after.players.some((player) =>
      before.players.some(
        (old) => old.id === player.id && old.isConnected !== player.isConnected,
      ),
    )
  ) {
    return "knock";
  }
  return null;
}
