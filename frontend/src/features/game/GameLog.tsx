import type { PlayerView } from "@/lib/game/types";

export function GameLog({ snapshot }: { snapshot: PlayerView }) {
  return (
    <section className="panel log-panel">
      <h2>Nhật ký công khai</h2>
      <ol className="game-log">
        {snapshot.gameLogs.map((entry, index) => (
          <li key={index}>{entry}</li>
        ))}
      </ol>
    </section>
  );
}
