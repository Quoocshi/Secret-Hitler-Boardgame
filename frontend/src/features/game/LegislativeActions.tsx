import { useState } from "react";
import type { Action, PlayerView } from "@/lib/game/types";
import { policyLabels } from "@/lib/game/labels";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PolicyHand } from "./PolicyHand";

export function LegislativeActions({
  snapshot,
  enabled,
  onAction,
}: {
  snapshot: PlayerView;
  enabled: boolean;
  onAction: (action: Action, payload: Record<string, unknown>) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const discarding = snapshot.currentPhase === "LEGISLATIVE_PRESIDENT";
  const expectedCards = discarding ? 3 : 2;
  const action: Action = discarding ? "discard" : "enact";
  const label = discarding ? "Bỏ lá đã chọn" : "Ban hành lá đã chọn";

  return (
    <>
      <p>
        {discarding
          ? "Chọn 1 trong 3 lá để bỏ. Hai lá còn lại chuyển tới Thủ tướng."
          : "Chọn 1 trong 2 lá để ban hành. Lá còn lại sẽ bị bỏ."}
      </p>
      {snapshot.handCards.length !== expectedCards && (
        <p role="status">Chưa nhận đủ lá bài. Hãy tải lại trang để đồng bộ.</p>
      )}
      <PolicyHand
        cards={snapshot.handCards}
        selected={selectedIndex}
        onSelect={setSelectedIndex}
        enabled={enabled}
      />
      <Button
        className="primary full"
        disabled={!enabled || selectedIndex === null}
        onClick={() => setConfirmationOpen(true)}
      >
        {label}
      </Button>
      {confirmationOpen && selectedIndex !== null && (
        <ConfirmDialog
          title={discarding ? "Xác nhận bỏ chính sách" : "Xác nhận ban hành"}
          onCancel={() => setConfirmationOpen(false)}
          onConfirm={() => {
            setConfirmationOpen(false);
            onAction(action, { policyIndex: selectedIndex });
          }}
        >
          <p>
            {discarding ? "Bỏ" : "Ban hành"} lá ở vị trí {selectedIndex + 1}:{" "}
            <strong>{policyLabels[snapshot.handCards[selectedIndex]]}</strong>?
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
