import type { PlayerView, Role } from "@/lib/game/types";
import { PhaseSummary } from "./PhaseSummary";
import { PolicyBoard } from "./PolicyBoard";
import { GameLog } from "./GameLog";
import { LeaveButton } from "@/features/room/LeaveButton";
const roleNames: Record<Role, string> = {
  HITLER: "Hitler",
  LIBERAL: "Tự do",
  FASCIST: "Phát xít",
};
export function GameOverPanel({
  snapshot,
  onLeave,
}: {
  snapshot: PlayerView;
  onLeave: () => Promise<void>;
}) {
  const resultTitles = {
    LIBERAL: "Phe Tự do chiến thắng",
    FASCIST: "Phe Phát xít chiến thắng",
    NONE: snapshot.winReason ? "Ván đã dừng" : "Đang chờ kết quả",
  };
  return (
    <>
      <PhaseSummary snapshot={snapshot} />
      <section className="panel result-panel" data-testid="game-result">
        <p className="eyebrow">KẾT QUẢ TỪ MÁY CHỦ</p>
        <h2>{resultTitles[snapshot.winner]}</h2>
        <p data-testid="win-reason">{snapshot.winReason}</p>
        {snapshot.players.every((player) => player.revealedRole) ? (
          <ul data-testid="revealed-roles">
            {snapshot.players.map((player) => (
              <li key={player.id}>
                {player.nickname}:{" "}
                {player.revealedRole && roleNames[player.revealedRole]}
              </li>
            ))}
          </ul>
        ) : (
          <p>Hệ thống hiện chưa cung cấp danh sách vai trò cuối ván.</p>
        )}
        <p>Ván đã kết thúc. Bạn có thể về trang đầu để tạo bàn chơi mới.</p>
        <LeaveButton onLeave={onLeave} label="Về trang đầu" />
      </section>
      <PolicyBoard snapshot={snapshot} />
      <GameLog snapshot={snapshot} />
    </>
  );
}
