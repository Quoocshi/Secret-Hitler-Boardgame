import type { PlayerView } from "@/lib/game/types";
import { audioManager } from "@/lib/audio/audio-manager";

export function GameLog({
  snapshot,
  collapsible = false,
}: {
  snapshot: PlayerView;
  collapsible?: boolean;
}) {
  const entries = (
    <ol className="game-log">
      {snapshot.gameLogs.map((entry, index) => (
        <li key={index}>{entry}</li>
      ))}
    </ol>
  );

  if (collapsible) {
    return (
      <details className="panel log-panel">
        <summary onClick={() => audioManager.play("paper")}>
          Nhật ký công khai
        </summary>
        {entries}
      </details>
    );
  }

  return (
    <section className="panel log-panel">
      <h2>Nhật ký công khai</h2>
      {entries}
    </section>
  );
}
