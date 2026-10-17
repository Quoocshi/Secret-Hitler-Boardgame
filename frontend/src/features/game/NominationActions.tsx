"use client";
import { useState } from "react";
import type { PlayerView } from "@/lib/game/types";
import { chancellorEligibility } from "@/lib/game/permissions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
      <label htmlFor="nominee">Ứng viên Thủ tướng</label>
      <select
        id="nominee"
        value={selectedPlayerId}
        onChange={(event) => setSelectedPlayerId(event.target.value)}
        disabled={!enabled}
      >
        <option value="">Chọn người đủ điều kiện</option>
        {snapshot.players.map((player) => {
          const permission = chancellorEligibility(snapshot, player.id);
          return (
            <option
              key={player.id}
              value={player.id}
              disabled={!permission.allowed}
            >
              {player.nickname}
              {permission.allowed ? "" : ` — ${permission.reason}`}
            </option>
          );
        })}
      </select>
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
