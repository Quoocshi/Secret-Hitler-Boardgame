import { useState } from "react";
import type { PlayerView } from "@/lib/game/types";
import { chancellorEligibility } from "@/lib/game/permissions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ChancellorPicker } from "./ChancellorPicker";
export function NominationActions({
  snapshot,
  enabled,
  onNominate,
}: {
  snapshot: PlayerView;
  enabled: boolean;
  onNominate: (playerId: string) => void;
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const target = snapshot.players.find(
    (player) => player.id === selectedPlayerId,
  );
  return (
    <>
      <ChancellorPicker
        snapshot={snapshot}
        value={selectedPlayerId}
        onChange={setSelectedPlayerId}
        enabled={enabled}
      />
      <Button
        className="primary full"
        disabled={
          !enabled ||
          !target ||
          !chancellorEligibility(snapshot, selectedPlayerId).allowed
        }
        onClick={() => setConfirmationOpen(true)}
      >
        Đề cử
      </Button>
      {confirmationOpen && target && (
        <ConfirmDialog
          title="Xác nhận đề cử"
          onCancel={() => setConfirmationOpen(false)}
          onConfirm={() => {
            setConfirmationOpen(false);
            onNominate(selectedPlayerId);
          }}
        >
          <p>
            Đề cử <strong>{target.nickname}</strong> làm Thủ tướng?
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
