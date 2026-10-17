import type { PlayerView, Role } from "./types";

export const gameAssets = {
  president: "/images/office-president.svg",
  chancellor: "/images/office-chancellor.svg",
  liberal: "/images/faction-liberal.svg",
  fascist: "/images/faction-fascist.svg.svg",
  voteJa: "/images/vote-ja.svg",
  voteNein: "/images/vote-nein.svg",
  roleBack: "/images/role-back.webp",
  stationery: "/images/item-cluster-1.webp",
  tabletop: "/images/item-cluster-2.webp",
  correspondence: "/images/item-cluster-3.webp",
  seal: "/images/item-red-seal.webp",
  cardStack: "/images/item-stack-card.webp",
} as const;

export function playerOffice(snapshot: PlayerView, playerId: string) {
  if (playerId === snapshot.currentPresidentId) {
    return "president";
  }
  if (playerId === snapshot.currentChancellorId) {
    return "chancellor";
  }
  return undefined;
}

/** Select an illustration consistently; its variation has no gameplay meaning. */
export function roleArtwork(role: Role, playerId: string): string {
  if (role === "HITLER") {
    return "/images/role-hitler.webp";
  }
  const variation =
    (Array.from(playerId).reduce(
      (total, character) => total + character.charCodeAt(0),
      0,
    ) %
      3) +
    1;
  const faction = role === "LIBERAL" ? "liberal" : "fascist";
  return `/images/role-${faction}-${variation}.webp`;
}

/** Players whose input the current phase is waiting for, based on the public DTO. */
export function awaitingPlayerIds(snapshot: PlayerView): string[] {
  const livingPlayers = snapshot.players.filter((player) => player.isAlive);
  if (snapshot.currentPhase === "VOTING") {
    return livingPlayers
      .filter((player) => !player.hasVoted)
      .map((player) => player.id);
  }

  let actingPlayerId: string | null = null;
  switch (snapshot.currentPhase) {
    case "NOMINATION":
    case "LEGISLATIVE_PRESIDENT":
    case "VETO_CONFIRMATION":
      actingPlayerId = snapshot.currentPresidentId;
      break;
    case "LEGISLATIVE_CHANCELLOR":
      actingPlayerId = snapshot.currentChancellorId;
      break;
    case "EXECUTIVE_ACTION":
      if (snapshot.pendingExecutiveAction !== "NONE") {
        actingPlayerId = snapshot.currentPresidentId;
      }
      break;
  }
  return livingPlayers.some((player) => player.id === actingPlayerId)
    ? [actingPlayerId!]
    : [];
}
