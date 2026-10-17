import type {
  Action,
  ExecutiveAction,
  PlayerView,
  VetoKnowledge,
} from "@/lib/game/types";
import { actionPermission } from "@/lib/game/permissions";
import { NominationActions } from "./NominationActions";
import { VotingActions } from "./VotingActions";
import { LegislativeActions } from "./LegislativeActions";
import { VetoActions } from "./VetoActions";
import { ExecutiveActions } from "./ExecutiveActions";
import { awaitingPlayerIds } from "@/lib/game/presentation";

const executiveCommands: Record<Exclude<ExecutiveAction, "NONE">, Action> = {
  POLICY_PEEK: "end-action",
  EXECUTION: "execute",
  SPECIAL_ELECTION: "special-election",
  INVESTIGATE_LOYALTY: "investigate",
};

export function PhaseActions({
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
  if (snapshot.currentPhase === "GAME_OVER") {
    return null;
  }
  const currentPlayer = snapshot.players.find(
    (player) => player.id === snapshot.myPlayerId,
  )!;
  const isActionEnabled = (action: Action) =>
    actionPermission(snapshot, action, online, pending, vetoKnowledge).allowed;
  const isPresident = snapshot.myPlayerId === snapshot.currentPresidentId;
  const isChancellor = snapshot.myPlayerId === snapshot.currentChancellorId;
  let content: React.ReactNode = (
    <p>Đang chờ người được chỉ định hoàn thành hành động.</p>
  );
  if (!currentPlayer.isAlive) {
    content = <p>Bạn đã bị loại. Bạn có thể tiếp tục theo dõi bàn chơi.</p>;
  } else if (snapshot.currentPhase === "NOMINATION" && isPresident) {
    content = (
      <NominationActions
        snapshot={snapshot}
        enabled={isActionEnabled("nominate")}
        onNominate={(playerId) =>
          onAction("nominate", { targetPlayerId: playerId })
        }
      />
    );
  } else if (snapshot.currentPhase === "VOTING") {
    content = (
      <VotingActions
        snapshot={snapshot}
        enabled={isActionEnabled("vote")}
        onVote={(vote) => onAction("vote", { vote })}
      />
    );
  } else if (snapshot.currentPhase === "LEGISLATIVE_PRESIDENT" && isPresident) {
    content = (
      <LegislativeActions
        snapshot={snapshot}
        enabled={isActionEnabled("discard")}
        onAction={onAction}
      />
    );
  } else if (
    snapshot.currentPhase === "LEGISLATIVE_CHANCELLOR" &&
    isChancellor
  ) {
    content = (
      <>
        <LegislativeActions
          snapshot={snapshot}
          enabled={isActionEnabled("enact")}
          onAction={onAction}
        />
        <VetoActions
          snapshot={snapshot}
          enabled={isActionEnabled("veto/request")}
          knowledge={vetoKnowledge}
          onAction={onAction}
        />
      </>
    );
  } else if (snapshot.currentPhase === "VETO_CONFIRMATION" && isPresident) {
    content = (
      <VetoActions
        snapshot={snapshot}
        enabled={isActionEnabled("veto/response")}
        knowledge={vetoKnowledge}
        onAction={onAction}
      />
    );
  } else if (
    snapshot.currentPhase === "EXECUTIVE_ACTION" &&
    isPresident &&
    snapshot.pendingExecutiveAction !== "NONE"
  ) {
    const action = executiveCommands[snapshot.pendingExecutiveAction];
    content = (
      <ExecutiveActions
        snapshot={snapshot}
        enabled={isActionEnabled(action)}
        completionEnabled={isActionEnabled("end-action")}
        onAction={onAction}
      />
    );
  }
  return (
    <section
      className="panel action-panel"
      data-your-turn={awaitingPlayerIds(snapshot).includes(snapshot.myPlayerId)}
    >
      <p className="eyebrow">
        {awaitingPlayerIds(snapshot).includes(snapshot.myPlayerId)
          ? "ĐẾN LƯỢT BẠN"
          : "THEO DÕI LƯỢT CHƠI"}
      </p>
      <h2>Hành động</h2>
      {content}
    </section>
  );
}
