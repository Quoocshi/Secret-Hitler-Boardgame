import type { Action, PlayerView, VetoKnowledge } from "@/lib/game/types";
import { actionContext } from "@/lib/realtime/commands";
import { PhaseSummary } from "./PhaseSummary";
import { PlayerList } from "./PlayerList";
import { PolicyBoard } from "./PolicyBoard";
import { GameLog } from "./GameLog";
import { PhaseActions } from "./PhaseActions";
import { PrivateInfoPanel } from "./PrivateInfoPanel";

export function GameScreen({
  snapshot,
  online,
  pending,
  vetoKnowledge,
  onAction,
}: {
  snapshot: PlayerView;
  online: boolean;
  pending: boolean;
  vetoKnowledge: VetoKnowledge;
  onAction: (action: Action, payload?: Record<string, unknown>) => void;
}) {
  return (
    <>
      <PhaseSummary snapshot={snapshot} />
      <div className="game-grid">
        <aside>
          <PlayerList snapshot={snapshot} />
        </aside>
        <div className="board-column">
          <PolicyBoard snapshot={snapshot} />
          <GameLog snapshot={snapshot} />
        </div>
        <aside className="action-column">
          <PhaseActions
            key={actionContext(snapshot) + online}
            snapshot={snapshot}
            online={online}
            pending={pending}
            vetoKnowledge={vetoKnowledge}
            onAction={onAction}
          />
          <PrivateInfoPanel key={snapshot.roomCode} snapshot={snapshot} />
        </aside>
      </div>
    </>
  );
}
