import { useState } from "react";
import type { Action, PlayerView } from "@/lib/game/types";
import { executiveLabels } from "@/lib/game/labels";
import { executiveTargetEligibility } from "@/lib/game/permissions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PolicyHand } from "./PolicyHand";
export function ExecutiveActions({
  snapshot: s,
  enabled,
  onAction,
}: {
  snapshot: PlayerView;
  enabled: boolean;
  onAction: (action: Action, payload?: Record<string, unknown>) => void;
}) {
  const [selected, setSelected] = useState("");
  const [confirm, setConfirm] = useState(false);
  const target = s.players.find((p) => p.id === selected);
  if (s.pendingExecutiveAction === "POLICY_PEEK") {
    return (
      <>
        <p>
          Ba lá trên cùng của bộ rút, theo thứ tự. Chúng vẫn ở trong bộ rút.
        </p>
        <PolicyHand cards={s.handCards} />
        <Button
          className="primary full"
          disabled={!enabled}
          onClick={() => onAction("end-action")}
        >
          Đã xem
        </Button>
      </>
    );
  }
  const action: Action =
    s.pendingExecutiveAction === "INVESTIGATE_LOYALTY"
      ? "investigate"
      : s.pendingExecutiveAction === "SPECIAL_ELECTION"
        ? "special-election"
        : "execute";
  const label = executiveLabels[s.pendingExecutiveAction];
  return (
    <>
      <p>
        {s.pendingExecutiveAction === "INVESTIGATE_LOYALTY"
          ? "Chỉ bạn nhận được đảng phái của mục tiêu, không phải vai trò cụ thể."
          : s.pendingExecutiveAction === "SPECIAL_ELECTION"
            ? "Chọn Tổng thống cho chính phủ tiếp theo. Sau đó thứ tự thường tiếp tục."
            : "Chọn một người bị loại khỏi ván. Lựa chọn này không thể đổi sau khi máy chủ xác nhận."}
      </p>
      <label htmlFor="executive-target">Mục tiêu quyền lực</label>
      <select
        id="executive-target"
        value={selected}
        disabled={!enabled}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Chọn mục tiêu</option>
        {s.players.map((p) => {
          const permission = executiveTargetEligibility(s, p.id);
          return (
            <option key={p.id} value={p.id} disabled={!permission.allowed}>
              {p.nickname}
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
          !executiveTargetEligibility(s, selected).allowed
        }
        onClick={() => setConfirm(true)}
      >
        {label}
      </Button>
      {confirm && target && (
        <ConfirmDialog
          title={"Xác nhận " + label.toLowerCase()}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            onAction(action, { targetPlayerId: selected });
          }}
        >
          <p>
            {label}: <strong>{target.nickname}</strong>?
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
