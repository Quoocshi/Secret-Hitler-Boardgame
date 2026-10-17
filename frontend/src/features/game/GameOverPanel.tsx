import type { PlayerView } from "@/lib/game/types";
import { PhaseSummary } from "./PhaseSummary";
import { PolicyBoard } from "./PolicyBoard";
import { GameLog } from "./GameLog";
import { LeaveButton } from "@/features/room/LeaveButton";
export function GameOverPanel({
  snapshot,
  onLeave,
}: {
  snapshot: PlayerView;
  onLeave: () => Promise<void>;
}) {
  return (
    <>
      <PhaseSummary snapshot={snapshot} />
      <section className="panel result-panel" data-testid="game-result">
        <p className="eyebrow">KẾT QUẢ TỪ MÁY CHỦ</p>
        <h2>
          {snapshot.winner === "LIBERAL"
            ? "Phe Tự do chiến thắng"
            : snapshot.winner === "FASCIST"
              ? "Phe Phát xít chiến thắng"
              : "Đang chờ kết quả"}
        </h2>
        <p data-testid="win-reason">{snapshot.winReason}</p>
        <p>Ván đã kết thúc. Bạn có thể về trang đầu để tạo bàn chơi mới.</p>
        <LeaveButton onLeave={onLeave} label="Về trang đầu" />
      </section>
      <PolicyBoard snapshot={snapshot} />
      <GameLog snapshot={snapshot} />
    </>
  );
}
