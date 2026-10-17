import { useState } from "react";
import type { PlayerView } from "@/lib/game/types";
import { Button } from "@/components/ui/Button";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { KickPlayerButton } from "./KickPlayerButton";
import { gameAssets } from "@/lib/game/presentation";
export function Lobby({
  snapshot,
  enabled,
  onStart,
}: {
  snapshot: PlayerView;
  enabled: boolean;
  onStart: () => void;
}) {
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const currentPlayer = snapshot.players.find(
    (player) => player.id === snapshot.myPlayerId,
  )!;
  const playerCount = snapshot.players.length;
  const host = snapshot.players.find((player) => player.isHost);
  return (
    <div className="lobby-scene">
      <img
        className="lobby-stationery"
        src={gameAssets.stationery}
        alt=""
        aria-hidden="true"
        width="900"
        height="900"
        draggable={false}
      />
      <section className="lobby panel">
        <div className="lobby-heading">
          <div>
            <p className="eyebrow">PHÒNG CHỜ</p>
            <h1>Mời bạn bè vào bàn</h1>
            <p>
              Chia sẻ mã phòng dưới đây. Ván bắt đầu khi có 5–10 thành viên.
            </p>
            {host && (
              <p data-testid="room-host">
                Chủ phòng: <strong>{host.nickname}</strong>
                {host.id === snapshot.myPlayerId && " (Bạn)"}
              </p>
            )}
          </div>
          <div className="room-code-box">
            <label htmlFor="copy-code">Mã phòng</label>
            <input
              id="copy-code"
              value={snapshot.roomCode}
              readOnly
              onFocus={(event) => event.target.select()}
            />
            <Button
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(snapshot.roomCode)
                  .then(() => setCopyNotice("Đã sao chép mã phòng."))
                  .catch(() =>
                    setCopyNotice(
                      "Chưa sao chép được. Chọn mã phía trên và nhấn Ctrl+C.",
                    ),
                  );
                if (!navigator.clipboard) {
                  setCopyNotice("Chọn mã phía trên và nhấn Ctrl+C.");
                }
              }}
            >
              Sao chép mã
            </Button>
          </div>
        </div>
        <StatusNotice message={copyNotice} />
        <div className="section-heading">
          <h2>Người chơi</h2>
          <span data-testid="member-count">{playerCount}/10</span>
        </div>
        <ul className="lobby-players">
          {snapshot.players.map((player) => (
            <li key={player.id}>
              <span className="avatar">
                {player.nickname.slice(0, 1).toUpperCase()}
              </span>
              <span>
                {player.nickname}
                {player.id === snapshot.myPlayerId && " (Bạn)"}
              </span>
              <span className="player-badges">
                {player.isHost && <span className="badge">Chủ phòng</span>}
                <span className="badge">
                  {player.isConnected ? "Đã kết nối" : "Mất kết nối"}
                </span>
              </span>
              <KickPlayerButton playerId={player.id} />
            </li>
          ))}
        </ul>
        <div className="lobby-footer">
          {currentPlayer.isHost && (
            <>
              <Button
                className="primary"
                onClick={onStart}
                disabled={!enabled || playerCount < 5 || playerCount > 10}
              >
                Bắt đầu ván
              </Button>
              <p>
                {playerCount < 5
                  ? `Cần thêm ${5 - playerCount} người để bắt đầu.`
                  : "Mọi người đã sẵn sàng cho một ván mới."}
              </p>
            </>
          )}
          {!currentPlayer.isHost && host && (
            <p>
              Đang chờ <strong>{host.nickname}</strong> (chủ phòng) bắt đầu ván.
            </p>
          )}
          {!host && (
            <p role="status" data-testid="missing-host-notice">
              Phòng hiện không có chủ phòng nên chưa thể bắt đầu ván. Hãy rời
              phòng và tạo phòng mới.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
