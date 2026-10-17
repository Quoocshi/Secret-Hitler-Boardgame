import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  actionPermission,
  kickTargetEligibility,
} from "@/lib/game/permissions";
import { useRoomSession } from "./RoomSessionProvider";

export function KickPlayerButton({ playerId }: { playerId: string }) {
  const { state, send } = useRoomSession();
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const snapshot = state.snapshot;
  const currentPlayer = snapshot?.players.find(
    (player) => player.id === snapshot.myPlayerId,
  );
  const target = snapshot?.players.find((player) => player.id === playerId);
  if (
    !snapshot ||
    !currentPlayer?.isHost ||
    !target ||
    target.id === currentPlayer.id
  ) {
    return null;
  }

  const enabled =
    actionPermission(
      snapshot,
      "kick",
      state.connection === "online",
      !!(state.pendingAction || state.uncertainAction),
    ).allowed && kickTargetEligibility(snapshot, playerId).allowed;
  const gameInProgress = !["LOBBY", "GAME_OVER"].includes(
    snapshot.currentPhase,
  );

  return (
    <>
      <Button
        className="player-kick"
        aria-label={`Mời ${target.nickname} rời phòng`}
        disabled={!enabled}
        onClick={() => setConfirmationOpen(true)}
      >
        Mời rời phòng
      </Button>
      {confirmationOpen && (
        <ConfirmDialog
          title="Mời người chơi rời phòng?"
          onCancel={() => setConfirmationOpen(false)}
          onConfirm={() => {
            setConfirmationOpen(false);
            send("kick", { targetPlayerId: playerId });
          }}
        >
          <p>
            Mời <strong>{target.nickname}</strong> rời phòng và xóa khỏi danh
            sách thành viên?
          </p>
          {gameInProgress && (
            <p>Nếu còn dưới 5 thành viên, ván đang chơi sẽ dừng.</p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
