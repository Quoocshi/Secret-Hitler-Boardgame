import type { Action, PlayerView } from "@/lib/game/types";
import { PhaseSummary } from "./PhaseSummary";
import { PolicyBoard } from "./PolicyBoard";
import { PlayerList } from "./PlayerList";
import { PrivateInfoPanel } from "./PrivateInfoPanel";
import { GameLog } from "./GameLog";
import { PhaseActions } from "./PhaseActions";
export function GameScreen({
  snapshot,
  online,
  pending,
  onAction,
}: {
  snapshot: PlayerView;
  online: boolean;
  pending: boolean;
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
            key={snapshot.stateVersion + ":" + online}
            snapshot={snapshot}
            online={online}
            pending={pending}
            onAction={onAction}
          />
          <PrivateInfoPanel key={snapshot.roomCode} snapshot={snapshot} />
        </aside>
      </div>
    </>
  );
}
