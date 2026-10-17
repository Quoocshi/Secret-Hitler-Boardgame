import type { PlayerView } from "@/lib/game/types";

export function legacyView(overrides: Record<string, unknown> = {}) {
  return {
    roomCode: "ABC234",
    currentPhase: "LOBBY",
    enactedLiberalPolicies: 0,
    enactedFascistPolicies: 0,
    electionTracker: 0,
    drawDeckSize: 0,
    discardDeckSize: 0,
    currentPresidentId: null,
    currentChancellorId: null,
    nominatedChancellorId: null,
    lastElectedPresidentId: null,
    lastElectedChancellorId: null,
    pendingExecutiveAction: "NONE",
    winner: "NONE",
    winReason: null,
    players: [
      {
        id: "p1",
        nickname: "Người chơi",
        isAlive: true,
        isHost: true,
        isConnected: true,
        isInvestigated: false,
        hasVoted: false,
        lastRevealedVote: null,
      },
    ],
    gameLogs: [],
    myPlayerId: "p1",
    myRole: null,
    knownAllyIds: [],
    handCards: [],
    investigatedPartyMembership: null,
    ...overrides,
  } as PlayerView;
}
