import { useState } from "react";
import type { PlayerView } from "@/lib/game/types";
import { policyLabels } from "@/lib/game/labels";
import { Button } from "@/components/ui/Button";

export function PrivateInfoPanel({ snapshot }: { snapshot: PlayerView }) {
  const [open, setOpen] = useState(false);
  const allies = snapshot.knownAllyIds
    .filter((playerId) => playerId !== snapshot.myPlayerId)
    .map(
      (playerId) =>
        snapshot.players.find((player) => player.id === playerId)?.nickname,
    )
    .filter(Boolean);
  const roleLabel =
    snapshot.myRole === "HITLER"
      ? "Hitler"
      : snapshot.myRole && policyLabels[snapshot.myRole];

  return (
    <section className="panel private-panel" data-testid="private-info">
      <p className="eyebrow">CHỈ BẠN ĐƯỢC XEM</p>
      <h2>Thông tin riêng</h2>
      <Button
        aria-expanded={open}
        aria-controls="private-role"
        onClick={() => setOpen(!open)}
      >
        {open ? "Ẩn vai trò riêng" : "Xem vai trò riêng"}
      </Button>
      {open && (
        <div id="private-role">
          <p>
            Vai trò của bạn: <strong>{roleLabel || "Chưa chia vai"}</strong>
          </p>
          <p>
            Đồng minh được biết:{" "}
            {allies.length ? allies.join(", ") : "Không có thông tin."}
          </p>
        </div>
      )}
      <p>
        Kết quả điều tra (nếu có) chỉ xuất hiện trong lượt điều tra của Tổng
        thống; không lưu lịch sử trên trình duyệt.
      </p>
      <p className="privacy-note">Giữ kín màn hình khi xem thông tin này.</p>
    </section>
  );
}
