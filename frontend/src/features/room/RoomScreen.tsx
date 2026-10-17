import { useRoomSession } from "./RoomSessionProvider";
import { ConnectionBanner, connectionLabels } from "./ConnectionBanner";
import { LeaveButton } from "./LeaveButton";
import { Lobby } from "./Lobby";
import { GameScreen } from "@/features/game/GameScreen";
import { GameOverPanel } from "@/features/game/GameOverPanel";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { Button } from "@/components/ui/Button";

export function RoomScreen({ roomCode }: { roomCode: string }) {
  const { state, send, leave, retry } = useRoomSession();
  const snapshot = state.snapshot;
  const pending = !!(state.pendingAction || state.uncertainAction);
  const online = state.connection === "online";

  let content: React.ReactNode;
  if (!snapshot) {
    const needsEntry = ["expired", "error", "duplicate"].includes(
      state.connection,
    );
    content = (
      <p role="status">
        {needsEntry
          ? "Hãy quay về trang đầu để tạo hoặc vào phòng."
          : "Đang khôi phục phòng…"}
      </p>
    );
  } else if (snapshot.currentPhase === "LOBBY") {
    content = (
      <Lobby
        snapshot={snapshot}
        enabled={online && !pending}
        onStart={() => send("start")}
      />
    );
  } else if (snapshot.currentPhase === "GAME_OVER") {
    content = <GameOverPanel snapshot={snapshot} onLeave={leave} />;
  } else {
    content = (
      <GameScreen
        snapshot={snapshot}
        online={online}
        pending={pending}
        vetoKnowledge={state.vetoKnowledge}
        onAction={send}
      />
    );
  }

  return (
    <main
      className="room-layout"
      data-testid="room-screen"
      data-player-id={snapshot?.myPlayerId}
      data-view-revision={state.viewRevision}
    >
      <header className="room-header">
        <span className="brand">SECRET HITLER</span>
        <span>
          Phòng <strong data-testid="room-code">{roomCode}</strong>
        </span>
        <span className="connection" data-testid="connection">
          {connectionLabels[state.connection]}
        </span>
        <LeaveButton
          onLeave={leave}
          disabled={state.connection === "leaving"}
        />
      </header>
      <ConnectionBanner
        connection={state.connection}
        onRetry={() => {
          void retry();
        }}
      />
      <StatusNotice
        message={state.notice}
        error={["error", "expired", "duplicate"].includes(state.connection)}
      />
      {state.uncertainAction && (
        <Button
          onClick={() => {
            void retry();
          }}
        >
          Đồng bộ trạng thái
        </Button>
      )}
      {content}
      {state.pendingAction && (
        <p role="status">Đã gửi thao tác. Đang chờ bàn chơi cập nhật…</p>
      )}
    </main>
  );
}
