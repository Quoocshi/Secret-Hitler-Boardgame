import type { PlayerView, Role } from "@/lib/game/types";
import { PolicyBoard } from "./PolicyBoard";
import { GameLog } from "./GameLog";
import { KickPlayerButton } from "@/features/room/KickPlayerButton";
import { Button } from "@/components/ui/Button";
import { actionPermission } from "@/lib/game/permissions";
import { gameAssets, roleArtwork } from "@/lib/game/presentation";
import { audioManager } from "@/lib/audio/audio-manager";
const roleNames: Record<Role, string> = {
  HITLER: "Hitler",
  LIBERAL: "Tự do",
  FASCIST: "Phát xít",
};
export function GameOverPanel({
  snapshot,
  online,
  pending,
  onRestart,
}: {
  snapshot: PlayerView;
  online: boolean;
  pending: boolean;
  onRestart: () => void;
}) {
  const currentPlayer = snapshot.players.find(
    (player) => player.id === snapshot.myPlayerId,
  );
  const canRestart = actionPermission(
    snapshot,
    "restart",
    online,
    pending,
  ).allowed;
  const resultTitles = {
    LIBERAL: "Phe Tự do chiến thắng",
    FASCIST: "Phe Phát xít chiến thắng",
    NONE: snapshot.winReason ? "Ván đã dừng" : "Đang chờ kết quả",
  };
  const rolesAvailable = snapshot.players.every(
    (player) => player.revealedRole,
  );
  const host = snapshot.players.find((player) => player.isHost);

  return (
    <div className="results-screen" data-testid="phase" data-phase="GAME_OVER">
      <section data-testid="game-result" aria-labelledby="result-title">
        <header className="result-heading" data-winner={snapshot.winner}>
          <div className="result-heading-copy">
            <p className="eyebrow">
              TỔNG KẾT VÁN ĐẤU · PHÒNG{" "}
              <span className="selectable-room-code">{snapshot.roomCode}</span>
            </p>
            <h1 id="result-title">{resultTitles[snapshot.winner]}</h1>
            <p className="result-reason" data-testid="win-reason">
              {snapshot.winReason ??
                "Đang chờ máy chủ cung cấp kết quả ván đấu."}
            </p>
            <dl className="result-stats" aria-label="Thông tin cuối ván">
              <div>
                <dt>Chính sách Tự do</dt>
                <dd>{snapshot.enactedLiberalPolicies} / 5</dd>
              </div>
              <div>
                <dt>Chính sách Phát xít</dt>
                <dd>{snapshot.enactedFascistPolicies} / 6</dd>
              </div>
              <div>
                <dt>Còn trong phòng</dt>
                <dd>{snapshot.players.length} người</dd>
              </div>
            </dl>
          </div>
          <img
            className="result-correspondence"
            src={gameAssets.correspondence}
            alt=""
            width="200"
            height="200"
            loading="lazy"
            draggable={false}
          />
        </header>

        <div className="result-columns">
          <section
            className="panel result-roster"
            aria-labelledby="roles-title"
          >
            <p className="eyebrow">NHỮNG BÍ MẬT ĐƯỢC BẬT MÍ</p>
            <h2 id="roles-title">Vai trò cuối ván</h2>
            <p className="result-caption">
              Vai trò do máy chủ công bố của các thành viên còn trong phòng.
            </p>
            {rolesAvailable ? (
              <ul className="result-players" data-testid="revealed-roles">
                {snapshot.players.map((player) => (
                  <li key={player.id}>
                    <span className="result-player-name">
                      {player.revealedRole && (
                        <img
                          className="result-role-portrait"
                          src={roleArtwork(player.revealedRole, player.id)}
                          alt=""
                          width="44"
                          height="62"
                          loading="lazy"
                        />
                      )}
                      <span>
                        <strong>
                          {player.nickname}
                          {player.id === snapshot.myPlayerId && " (Bạn)"}
                        </strong>
                        <span className="result-player-meta">
                          {player.isHost ? "Chủ phòng" : "Thành viên"}
                          {!player.isAlive && " · Đã bị loại"}
                        </span>
                      </span>
                    </span>
                    <span
                      className="result-role"
                      data-role={player.revealedRole}
                    >
                      {player.revealedRole && roleNames[player.revealedRole]}
                    </span>
                    <span className="result-player-action">
                      <KickPlayerButton playerId={player.id} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="result-unavailable">
                Hệ thống hiện chưa cung cấp danh sách vai trò cuối ván.
              </p>
            )}
          </section>

          <aside
            className="panel result-next"
            aria-labelledby="next-game-title"
          >
            <p className="eyebrow">VÁN TIẾP THEO</p>
            <h2 id="next-game-title">Cùng bàn, ván mới</h2>
            <p>Giữ mã phòng và những người bạn đang ở đây.</p>
            <div className="result-room-code">
              <span>Mã phòng</span>
              <strong className="selectable-room-code">
                {snapshot.roomCode}
              </strong>
            </div>
            {currentPlayer?.isHost ? (
              <>
                <Button
                  className="primary full"
                  disabled={!canRestart}
                  onClick={onRestart}
                >
                  Trở lại phòng chờ
                </Button>
                <p className="result-caption">
                  Người đã rời hoặc bị mời ra có thể vào lại bằng mã cũ khi
                  phòng chờ mở. Cần đủ 5–10 người để bắt đầu ván mới.
                </p>
              </>
            ) : (
              <p className="result-waiting" role="status">
                {host
                  ? `Đang chờ ${host.nickname} (chủ phòng) mở lại phòng chờ.`
                  : "Phòng hiện không có chủ phòng để mở lại phòng chờ. Bạn có thể về trang đầu và tạo phòng mới."}
              </p>
            )}
          </aside>
        </div>
      </section>
      <details className="result-details">
        <summary onClick={() => audioManager.play("paper")}>
          Xem bàn chính sách và nhật ký ván đấu
        </summary>
        <div className="result-history">
          <PolicyBoard snapshot={snapshot} />
          <GameLog snapshot={snapshot} />
        </div>
      </details>
    </div>
  );
}
