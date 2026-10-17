import type { PlayerView } from "@/lib/game/types";
import { phaseLabels, executiveLabels } from "@/lib/game/labels";
import { awaitingPlayerIds, gameAssets } from "@/lib/game/presentation";

function playerName(snapshot: PlayerView, playerId: string | null): string {
  if (!playerId) {
    return "Chưa có";
  }
  return (
    snapshot.players.find((player) => player.id === playerId)?.nickname ??
    "Đã rời phòng"
  );
}

function waitingMessage(snapshot: PlayerView): string {
  if (snapshot.currentPhase === "VOTING") {
    return "Đang chờ mọi người còn sống bỏ phiếu.";
  }
  if (snapshot.currentPhase === "GAME_OVER") {
    return "Ván đã kết thúc.";
  }

  const actingPlayerId = awaitingPlayerIds(snapshot)[0];
  if (!actingPlayerId) {
    return "Đang chờ máy chủ cập nhật giai đoạn tiếp theo.";
  }
  const actionLabel =
    snapshot.currentPhase === "EXECUTIVE_ACTION"
      ? executiveLabels[snapshot.pendingExecutiveAction]
      : phaseLabels[snapshot.currentPhase].toLowerCase();

  return `Đang chờ ${playerName(snapshot, actingPlayerId)}: ${actionLabel}.`;
}

export function PhaseSummary({ snapshot }: { snapshot: PlayerView }) {
  const chancellorId =
    snapshot.nominatedChancellorId ?? snapshot.currentChancellorId;
  const awaitingPlayers = awaitingPlayerIds(snapshot);

  return (
    <section
      className="phase-summary"
      data-testid="phase"
      data-phase={snapshot.currentPhase}
    >
      <p className="eyebrow">GIAI ĐOẠN HIỆN TẠI</p>
      <h1>{phaseLabels[snapshot.currentPhase]}</h1>
      <p className="turn-summary" role="status">
        {awaitingPlayers.includes(snapshot.myPlayerId) && (
          <strong>Đến lượt bạn. </strong>
        )}
        {waitingMessage(snapshot)}
      </p>
      <div className="office-summary">
        <div
          className="office-holder"
          data-awaiting-action={awaitingPlayers.includes(
            snapshot.currentPresidentId ?? "",
          )}
        >
          <img src={gameAssets.president} alt="" width="36" height="36" />
          <span>
            <span className="office-label">Tổng thống</span>
            <strong>{playerName(snapshot, snapshot.currentPresidentId)}</strong>
          </span>
        </div>
        <div
          className="office-holder"
          data-awaiting-action={awaitingPlayers.includes(chancellorId ?? "")}
        >
          <img src={gameAssets.chancellor} alt="" width="36" height="36" />
          <span>
            <span className="office-label">
              Thủ tướng{snapshot.currentPhase === "VOTING" ? " được đề cử" : ""}
            </span>
            <strong>{playerName(snapshot, chancellorId)}</strong>
          </span>
        </div>
      </div>
    </section>
  );
}
