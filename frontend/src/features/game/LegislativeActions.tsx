import { useState } from "react";
import type { Action, PlayerView } from "@/lib/game/types";
import { policyLabels } from "@/lib/game/labels";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PolicyHand } from "./PolicyHand";
export function LegislativeActions({
  snapshot: s,
  enabled,
  onAction,
}: {
  snapshot: PlayerView;
  enabled: boolean;
  onAction: (action: Action, payload: Record<string, unknown>) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const discard = s.currentPhase === "LEGISLATIVE_PRESIDENT";
  const label = discard ? "Bỏ lá đã chọn" : "Ban hành lá đã chọn";
  return (
    <>
      <p>
        {discard
          ? "Chọn 1 trong 3 lá để bỏ. Hai lá còn lại chuyển tới Thủ tướng."
          : "Chọn 1 trong 2 lá để ban hành. Lá còn lại sẽ bị bỏ."}
      </p>
      <PolicyHand
        cards={s.handCards}
        selected={selected}
        onSelect={setSelected}
        enabled={enabled}
      />
      <Button
        className="primary full"
        disabled={!enabled || selected === null}
        onClick={() => setConfirm(true)}
      >
        {label}
      </Button>
      {confirm && selected !== null && (
        <ConfirmDialog
          title={discard ? "Xác nhận bỏ chính sách" : "Xác nhận ban hành"}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            onAction(discard ? "discard" : "enact", { policyIndex: selected });
          }}
        >
          <p>
            {discard ? "Bỏ" : "Ban hành"} lá ở vị trí {selected + 1}:{" "}
            <strong>{policyLabels[s.handCards[selected]]}</strong>?
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
