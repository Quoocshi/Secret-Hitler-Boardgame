import type { PlayerView } from "@/lib/game/types";
import { phaseLabels, executiveLabels } from "@/lib/game/labels";
function playerName(snapshot: PlayerView, playerId: string | null): string {
  return (
    snapshot.players.find((player) => player.id === playerId)?.nickname ??
    "Chưa có"
  );
}

function waitingMessage(snapshot: PlayerView): string {
  if (snapshot.currentPhase === "VOTING") {
    return "Đang chờ mọi người còn sống bỏ phiếu.";
  }
  if (snapshot.currentPhase === "GAME_OVER") {
    return "Ván đã kết thúc.";
  }

  const actingPlayerId =
    snapshot.currentPhase === "LEGISLATIVE_CHANCELLOR"
      ? snapshot.currentChancellorId
      : snapshot.currentPresidentId;
  const actionLabel =
    snapshot.currentPhase === "EXECUTIVE_ACTION"
      ? executiveLabels[snapshot.pendingExecutiveAction]
      : phaseLabels[snapshot.currentPhase].toLowerCase();

  return `Đang chờ ${playerName(snapshot, actingPlayerId)}: ${actionLabel}.`;
}

export function PhaseSummary({ snapshot }: { snapshot: PlayerView }) {
  const chancellorId =
    snapshot.nominatedChancellorId ?? snapshot.currentChancellorId;

  return (
    <section
      className="phase-summary"
      data-testid="phase"
      data-phase={snapshot.currentPhase}
    >
      <p className="eyebrow">GIAI ĐOẠN HIỆN TẠI</p>
      <h1>{phaseLabels[snapshot.currentPhase]}</h1>
      <p>{waitingMessage(snapshot)}</p>
      <div className="office-summary">
        <span>
          Tổng thống:{" "}
          <strong>{playerName(snapshot, snapshot.currentPresidentId)}</strong>
        </span>
        <span>
          Thủ tướng{snapshot.currentPhase === "VOTING" ? " được đề cử" : ""}:{" "}
          <strong>{playerName(snapshot, chancellorId)}</strong>
        </span>
      </div>
    </section>
  );
}
