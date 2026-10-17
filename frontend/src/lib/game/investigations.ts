import type { PlayerView, PrivateInvestigations } from "./types";

/** Keep only results this recipient actually received, in session memory. */
export function rememberPrivateInvestigations(
  previous: PrivateInvestigations,
  snapshot: PlayerView,
): PrivateInvestigations {
  if (["LOBBY", "GAME_OVER"].includes(snapshot.currentPhase)) {
    return {};
  }

  const results: PrivateInvestigations = {};
  for (const player of snapshot.players) {
    if (player.isInvestigated && previous[player.id]) {
      results[player.id] = previous[player.id];
    }
  }

  const investigator = snapshot.players.find(
    (player) => player.id === snapshot.myPlayerId,
  );
  const target = snapshot.players.find(
    (player) => player.id === snapshot.investigatedPlayerId,
  );
  if (
    snapshot.currentPhase === "EXECUTIVE_ACTION" &&
    snapshot.pendingExecutiveAction === "INVESTIGATE_LOYALTY" &&
    snapshot.myPlayerId === snapshot.currentPresidentId &&
    investigator?.isAlive &&
    target &&
    target.id !== snapshot.myPlayerId &&
    snapshot.investigatedPartyMembership
  ) {
    results[target.id] = snapshot.investigatedPartyMembership;
  }
  return results;
}
