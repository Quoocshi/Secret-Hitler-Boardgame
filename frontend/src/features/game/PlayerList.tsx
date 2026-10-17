import type { PlayerView } from "@/lib/game/types";

export function PlayerList({ snapshot }: { snapshot: PlayerView }) {
  const isVoting = snapshot.currentPhase === "VOTING";
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
        {snapshot.players.map((player, index) => (
          <li
            key={player.id}
            className={!player.isAlive ? "eliminated" : ""}
            data-player-id={player.id}
          >
            <span className="seat-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>
                {player.nickname}
                {player.id === snapshot.myPlayerId ? " (Bạn)" : ""}
              </strong>
              <div className="player-badges">
                {player.id === snapshot.currentPresidentId && (
                  <span className="badge">Tổng thống</span>
                )}
                {player.id === snapshot.currentChancellorId && (
                  <span className="badge">Thủ tướng</span>
                )}
                {player.id === snapshot.nominatedChancellorId && (
                  <span className="badge">Ứng viên</span>
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
              {player.lastRevealedVote && (
                <small>
                  {voteRoundLabel}: {player.lastRevealedVote} —{" "}
                  {player.lastRevealedVote === "JA" ? "Đồng ý" : "Phản đối"}
                </small>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
