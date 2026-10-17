import type {
  Action,
  PlayerView,
  PrivateInvestigations,
  VetoKnowledge,
} from "@/lib/game/types";
import { actionContext } from "@/lib/realtime/commands";
import { PhaseSummary } from "./PhaseSummary";
import { PlayerList } from "./PlayerList";
import { PolicyBoard } from "./PolicyBoard";
import { GameLog } from "./GameLog";
import { PhaseActions } from "./PhaseActions";
import { PrivateInfoPanel } from "./PrivateInfoPanel";

export function GameScreen({
  snapshot,
  privateInvestigations,
  online,
  pending,
  vetoKnowledge,
  onAction,
}: {
  snapshot: PlayerView;
  privateInvestigations: PrivateInvestigations;
  online: boolean;
  pending: boolean;
  vetoKnowledge: VetoKnowledge;
  onAction: (action: Action, payload?: Record<string, unknown>) => void;
}) {
  // Votes arriving from other members must not remount the action panel and
  // erase this player's local choice. Reset it when the voting round changes.
  const actionPanelKey =
    snapshot.currentPhase === "VOTING"
      ? JSON.stringify([
          snapshot.roomCode,
          snapshot.myPlayerId,
          snapshot.currentPhase,
          snapshot.currentPresidentId,
          snapshot.nominatedChancellorId,
          snapshot.electionTracker,
          snapshot.enactedLiberalPolicies,
          snapshot.enactedFascistPolicies,
        ])
      : actionContext(snapshot) + online;

  return (
    <div className="game-screen">
      <PhaseSummary snapshot={snapshot} />
      <div className="game-grid">
        <aside className="players-column">
          <PlayerList
            snapshot={snapshot}
            privateInvestigations={privateInvestigations}
          />
        </aside>
        <div className="board-column">
          <PolicyBoard snapshot={snapshot} />
          <GameLog snapshot={snapshot} collapsible />
        </div>
        <aside className="action-column">
          <PhaseActions
            key={actionPanelKey}
            snapshot={snapshot}
            online={online}
            pending={pending}
            vetoKnowledge={vetoKnowledge}
            onAction={onAction}
          />
          <PrivateInfoPanel key={snapshot.roomCode} snapshot={snapshot} />
        </aside>
      </div>
    </div>
  );
}
