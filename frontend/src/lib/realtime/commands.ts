import type { Action, PlayerView } from "@/lib/game/types";

export const ACTION_DEADLINE_MS = 8000;
const NOTICE_RENDER_BUDGET_MS = 1000;
// Leave browser scheduling/rendering time so the notice appears within the eight-second ceiling.
export const ACTION_TIMEOUT_MS = ACTION_DEADLINE_MS - NOTICE_RENDER_BUDGET_MS;

/** A local selection boundary, not an authoritative server version. */
export function actionContext(snapshot: PlayerView): string {
  return JSON.stringify([
    snapshot.currentPhase,
    snapshot.currentPresidentId,
    snapshot.currentChancellorId,
    snapshot.nominatedChancellorId,
    snapshot.pendingExecutiveAction,
    snapshot.handCards,
    snapshot.lastElectedPresidentId,
    snapshot.lastElectedChancellorId,
    snapshot.eligibleChancellorIds,
    snapshot.investigatedPlayerId,
    snapshot.investigatedPartyMembership,
    snapshot.players.map((player) => [
      player.id,
      player.isAlive,
      player.isInvestigated,
      player.hasVoted,
    ]),
  ]);
}

export interface PendingAction {
  localId: string;
  action: Action;
  startedAt: number;
  context: string;
  targetPlayerId?: string;
}

export function prepareCommand(
  snapshot: PlayerView,
  action: Action,
  payload: Record<string, unknown> = {},
): PendingAction {
  return {
    localId: crypto.randomUUID(),
    action,
    startedAt: Date.now(),
    context: actionContext(snapshot),
    targetPlayerId:
      action === "kick" ? String(payload.targetPlayerId) : undefined,
  };
}

export function actionContextEnded(
  snapshot: PlayerView,
  action: Action,
  targetPlayerId?: string,
): boolean {
  const ownPlayer = snapshot.players.find(
    (player) => player.id === snapshot.myPlayerId,
  );
  switch (action) {
    case "kick":
      return (
        !!targetPlayerId &&
        !snapshot.players.some((player) => player.id === targetPlayerId)
      );
    case "start":
      return snapshot.currentPhase !== "LOBBY";
    case "nominate":
      return snapshot.currentPhase !== "NOMINATION";
    case "vote":
      return snapshot.currentPhase !== "VOTING" || ownPlayer?.hasVoted === true;
    case "discard":
      return snapshot.currentPhase !== "LEGISLATIVE_PRESIDENT";
    case "enact":
      return snapshot.currentPhase !== "LEGISLATIVE_CHANCELLOR";
    case "veto/request":
      return snapshot.currentPhase !== "LEGISLATIVE_CHANCELLOR";
    case "veto/response":
      return snapshot.currentPhase !== "VETO_CONFIRMATION";
    case "investigate":
      return (
        snapshot.currentPhase !== "EXECUTIVE_ACTION" ||
        !!(
          snapshot.investigatedPlayerId && snapshot.investigatedPartyMembership
        )
      );
    default:
      return snapshot.currentPhase !== "EXECUTIVE_ACTION";
  }
}
