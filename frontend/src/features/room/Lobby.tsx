"use client";
import { useState } from "react";
import type { PlayerView } from "@/lib/game/types";
import { Button } from "@/components/ui/Button";
import { StatusNotice } from "@/components/ui/StatusNotice";
export function Lobby({
  snapshot,
  enabled,
  onStart,
}: {
  snapshot: PlayerView;
  enabled: boolean;
  onStart: () => void;
}) {
  const [copy, setCopy] = useState<string | null>(null);
  const me = snapshot.players.find((p) => p.id === snapshot.myPlayerId)!;
  const count = snapshot.players.length;
  return (
    <section className="lobby panel">
      <div className="lobby-heading">
        <div>
          <p className="eyebrow">PHÒNG CHỜ</p>
          <h1>Mời bạn bè vào bàn</h1>
          <p>Chia sẻ mã phòng dưới đây. Ván bắt đầu khi có 5–10 thành viên.</p>
        </div>
        <div className="room-code-box">
          <label htmlFor="copy-code">Mã phòng</label>
          <input
            id="copy-code"
            value={snapshot.roomCode}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <Button
            onClick={() => {
              void navigator.clipboard
                ?.writeText(snapshot.roomCode)
                .then(() => setCopy("Đã sao chép mã phòng."))
                .catch(() =>
                  setCopy(
                    "Chưa sao chép được. Chọn mã phía trên và nhấn Ctrl+C.",
                  ),
                );
              if (!navigator.clipboard) {
                setCopy("Chọn mã phía trên và nhấn Ctrl+C.");
              }
            }}
          >
            Sao chép mã
          </Button>
        </div>
      </div>
      <StatusNotice message={copy} />
      <div className="section-heading">
        <h2>Người chơi</h2>
        <span data-testid="member-count">{count}/10</span>
      </div>
      <ul className="lobby-players">
        {snapshot.players.map((p) => (
          <li key={p.id}>
            <span className="avatar">
              {p.nickname.slice(0, 1).toUpperCase()}
            </span>
            <span>
              {p.nickname}
              {p.id === snapshot.myPlayerId && " (Bạn)"}
            </span>
            <span className="player-badges">
              {p.isHost && <span className="badge">Chủ phòng</span>}
              <span className="badge">
                {p.isConnected ? "Đang kết nối" : "Mất kết nối"}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="lobby-footer">
        {me.isHost ? (
          <>
            <Button
              className="primary"
              onClick={onStart}
              disabled={!enabled || count < 5 || count > 10}
            >
              Bắt đầu ván
            </Button>
            <p>
              {count < 5
                ? `Cần thêm ${5 - count} người để bắt đầu.`
                : "Mọi người đã sẵn sàng cho một ván mới."}
            </p>
          </>
        ) : (
          <p>Đang chờ chủ phòng bắt đầu ván.</p>
        )}
      </div>
    </section>
  );
}
