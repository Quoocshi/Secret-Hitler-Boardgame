export const phases = ["LOBBY","NOMINATION","VOTING","LEGISLATIVE_PRESIDENT","LEGISLATIVE_CHANCELLOR","VETO_CONFIRMATION","EXECUTIVE_ACTION","GAME_OVER"] as const;
export const executives = ["NONE","INVESTIGATE_LOYALTY","SPECIAL_ELECTION","POLICY_PEEK","EXECUTION"] as const;
export const actions = ["start","nominate","vote","discard","enact","veto/request","veto/response","execute","investigate","special-election","end-action"] as const;
export type Phase = typeof phases[number];
export type ExecutiveAction = typeof executives[number];
export type Action = typeof actions[number];
export type Policy = "LIBERAL" | "FASCIST";
export type Role = Policy | "HITLER";
export type Vote = "JA" | "NEIN";
export interface PublicPlayer { id:string; nickname:string; isAlive:boolean; isHost:boolean; isConnected:boolean; isInvestigated:boolean; hasVoted:boolean; lastRevealedVote:Vote|null; }
export interface InvestigationResult { investigationId:string; targetPlayerId:string; partyMembership:Policy; }
export interface PlayerView {
 roomCode:string; stateVersion:number; currentPhase:Phase;
 enactedLiberalPolicies:number; enactedFascistPolicies:number; electionTracker:number; drawDeckSize:number; discardDeckSize:number;
 currentPresidentId:string|null; currentChancellorId:string|null; nominatedChancellorId:string|null; lastElectedPresidentId:string|null; lastElectedChancellorId:string|null;
 pendingExecutiveAction:ExecutiveAction; winner:Policy|"NONE"; winReason:string|null; players:PublicPlayer[]; gameLogs:string[];
 myPlayerId:string; myRole:Role|null; knownAllyIds:string[]; handCards:Policy[]; investigatedPartyMembership:Policy|null; vetoRequestedThisRound:boolean; investigationResults:InvestigationResult[];
}
export interface CommandResult { actionId:string; action:Action; status:"ACCEPTED"|"REJECTED"; code:string|null; message:string|null; stateVersion:number; }
export interface RoomResponse { roomCode:string; gameState:PlayerView; }
export interface SessionIdentity { schemaVersion:1; sessionToken:string; roomCode:string; nickname:string; }
export const roomCodePattern = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
