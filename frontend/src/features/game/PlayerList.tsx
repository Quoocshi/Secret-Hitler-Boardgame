import type { PlayerView, PrivateInvestigations } from "@/lib/game/types";
import { policyLabels } from "@/lib/game/labels";
import { KickPlayerButton } from "@/features/room/KickPlayerButton";
import {
  awaitingPlayerIds,
  gameAssets,
  playerOffice,
} from "@/lib/game/presentation";

export function PlayerList({
  snapshot,
  privateInvestigations,
}: {
  snapshot: PlayerView;
  privateInvestigations: PrivateInvestigations;
}) {
  const isVoting = snapshot.currentPhase === "VOTING";
  const awaitingPlayers = awaitingPlayerIds(snapshot);
  const voteRoundLabel =
    isVoting || snapshot.currentPhase === "NOMINATION"
      ? "Vòng trước"
      : "Vòng vừa chốt";

  return (
    <section className="panel player-panel" data-testid="players">
      <div className="section-heading">
        <h2>Người chơi</h2>
        <span data-testid="member-count">{snapshot.players.length}/10</span>
      </div>
      <ul className="game-players">
        {snapshot.players.map((player, index) => {
          const investigation = privateInvestigations[player.id];
          return (
            <li
              key={player.id}
              className={!player.isAlive ? "eliminated" : ""}
              data-player-id={player.id}
              data-awaiting-action={awaitingPlayers.includes(player.id)}
              data-office={playerOffice(snapshot, player.id)}
            >
              <span className="seat-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="player-details">
                <strong className="player-name">
                  {player.nickname}
                  {player.id === snapshot.myPlayerId ? " (Bạn)" : ""}
                </strong>
                {awaitingPlayers.includes(player.id) && (
                  <span className="player-turn">
                    {isVoting ? "Chờ bỏ phiếu" : "Đang tới lượt"}
                    {!isVoting &&
                      player.id === snapshot.myPlayerId &&
                      " của bạn"}
                  </span>
                )}
                <div className="player-badges">
                  {player.isHost && <span className="badge">Chủ phòng</span>}
                  {player.id === snapshot.currentPresidentId && (
                    <span className="badge office-badge president-badge">
                      <img
                        src={gameAssets.president}
                        alt=""
                        width="20"
                        height="20"
                      />
                      Tổng thống
                    </span>
                  )}
                  {player.id === snapshot.currentChancellorId && (
                    <span className="badge office-badge chancellor-badge">
                      <img
                        src={gameAssets.chancellor}
                        alt=""
                        width="20"
                        height="20"
                      />
                      Thủ tướng
                    </span>
                  )}
                  {player.id === snapshot.nominatedChancellorId && (
                    <span className="badge candidate-badge">
                      Ứng viên Thủ tướng
                    </span>
                  )}
                  {!player.isAlive && <span className="badge">Đã bị loại</span>}
                  {!player.isConnected && (
                    <span className="badge">Mất kết nối</span>
                  )}
                  {isVoting && player.isAlive && (
                    <span className="badge">
                      {player.hasVoted ? "Đã bỏ phiếu" : "Chưa bỏ phiếu"}
                    </span>
                  )}
                </div>
                {investigation && (
                  <div
                    className="player-investigation"
                    data-testid="investigation-result"
                  >
                    <span>Điều tra riêng · Chỉ bạn thấy</span>
                    <strong>Đảng phái: {policyLabels[investigation]}</strong>
                  </div>
                )}
                {player.lastRevealedVote && (
                  <small>
                    {voteRoundLabel}: {player.lastRevealedVote} —{" "}
                    {player.lastRevealedVote === "JA" ? "Đồng ý" : "Phản đối"}
                  </small>
                )}
                <KickPlayerButton playerId={player.id} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
