import { useState } from "react";
import type { Action, ExecutiveAction, PlayerView } from "@/lib/game/types";
import { executiveLabels } from "@/lib/game/labels";
import { executiveTargetEligibility } from "@/lib/game/permissions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PolicyHand } from "./PolicyHand";

function targetAction(power: ExecutiveAction): {
  action: Action;
  instructions: string;
} | null {
  switch (power) {
    case "INVESTIGATE_LOYALTY":
      return {
        action: "investigate",
        instructions:
          "Chọn người để điều tra đảng phái. Kết quả riêng sẽ xuất hiện dưới tên người đó trong danh sách người chơi.",
      };
    case "SPECIAL_ELECTION":
      return {
        action: "special-election",
        instructions:
          "Chọn người giữ chức Tổng thống cho lượt bầu cử đặc biệt.",
      };
    case "EXECUTION":
      return {
        action: "execute",
        instructions:
          "Chọn người bị xử bắn. Kiểm tra kỹ tên trước khi xác nhận.",
      };
    default:
      return null;
  }
}

export function ExecutiveActions({
  snapshot,
  enabled,
  completionEnabled,
  onAction,
}: {
  snapshot: PlayerView;
  enabled: boolean;
  completionEnabled: boolean;
  onAction: (action: Action, payload?: Record<string, unknown>) => void;
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const power = snapshot.pendingExecutiveAction;

  if (
    power === "INVESTIGATE_LOYALTY" &&
    snapshot.investigatedPlayerId &&
    snapshot.investigatedPartyMembership
  ) {
    return (
      <div>
        <p>
          Xem kết quả điều tra riêng dưới tên người chơi trong danh sách bên
          trái.
        </p>
        <Button
          className="primary full"
          disabled={!completionEnabled}
          onClick={() => onAction("end-action")}
        >
          Đã xem kết quả
        </Button>
      </div>
    );
  }

  if (power === "POLICY_PEEK") {
    return (
      <>
        <p>
          Xem trước ba lá chính sách tiếp theo. Chỉ bạn nhìn thấy các lá này.
        </p>
        <PolicyHand cards={snapshot.handCards} />
        {snapshot.handCards.length !== 3 && (
          <p role="status">
            Chưa nhận đủ lá bài. Hãy tải lại trang để đồng bộ.
          </p>
        )}
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

  const decision = targetAction(power);
  if (!decision) {
    return <p>Không có quyền lực cần thực hiện.</p>;
  }
  const target = snapshot.players.find(
    (player) => player.id === selectedPlayerId,
  );
  const targetIsEligible = executiveTargetEligibility(
    snapshot,
    selectedPlayerId,
  ).allowed;
  const label = executiveLabels[power];

  return (
    <>
      <p>{decision.instructions}</p>
      {power === "INVESTIGATE_LOYALTY" && (
        <p>Chưa có kết quả điều tra trong lượt này.</p>
      )}
      <label htmlFor="executive-target">Mục tiêu quyền lực</label>
      <select
        id="executive-target"
        value={selectedPlayerId}
        disabled={!enabled}
        onChange={(event) => setSelectedPlayerId(event.target.value)}
      >
        <option value="">Chọn người chơi</option>
        {snapshot.players.map((player) => {
          const eligibility = executiveTargetEligibility(snapshot, player.id);
          return (
            <option
              key={player.id}
              value={player.id}
              disabled={!eligibility.allowed}
            >
              {player.nickname}
              {eligibility.allowed ? "" : ` — ${eligibility.reason}`}
            </option>
          );
        })}
      </select>
      <Button
        className="primary full"
        disabled={!enabled || !targetIsEligible}
        onClick={() => setConfirmationOpen(true)}
      >
        {label}
      </Button>
      {confirmationOpen && target && (
        <ConfirmDialog
          title={`Xác nhận ${label.toLowerCase()}`}
          onCancel={() => setConfirmationOpen(false)}
          onConfirm={() => {
            setConfirmationOpen(false);
            onAction(decision.action, { targetPlayerId: target.id });
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
