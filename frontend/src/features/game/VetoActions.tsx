import { useState } from "react";
import type { Action, PlayerView, VetoKnowledge } from "@/lib/game/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function VetoActions({
  snapshot,
  enabled,
  knowledge,
  onAction,
}: {
  snapshot: PlayerView;
  enabled: boolean;
  knowledge: VetoKnowledge;
  onAction: (action: Action, payload?: Record<string, unknown>) => void;
}) {
  const [confirmation, setConfirmation] = useState<
    "request" | "approve" | "reject" | null
  >(null);
  if (snapshot.enactedFascistPolicies < 5) {
    return null;
  }
  const responding = snapshot.currentPhase === "VETO_CONFIRMATION";
  const confirmationMessages = {
    request: "Gửi yêu cầu veto?",
    approve: "Đồng ý hủy cả hai lá?",
    reject: "Từ chối yêu cầu veto?",
  };

  function confirm() {
    const decision = confirmation;
    setConfirmation(null);
    if (decision === "request") {
      onAction("veto/request");
    } else if (decision) {
      onAction("veto/response", { approve: decision === "approve" });
    }
  }

  return (
    <div className="veto-actions">
      {responding ? (
        <>
          <p>
            Thủ tướng đề nghị hủy cả hai lá. Kết quả và bộ đếm sẽ theo trạng
            thái máy chủ.
          </p>
          <Button
            sound="paper"
            disabled={!enabled}
            onClick={() => setConfirmation("approve")}
          >
            Đồng ý veto
          </Button>
          <Button
            sound="paper"
            disabled={!enabled}
            onClick={() => setConfirmation("reject")}
          >
            Từ chối veto
          </Button>
        </>
      ) : (
        <>
          <Button
            sound="paper"
            className="full"
            disabled={!enabled || knowledge === "observed-requested"}
            onClick={() => setConfirmation("request")}
          >
            Yêu cầu veto
          </Button>
          <p>
            {knowledge === "observed-requested"
              ? "Đã quan sát yêu cầu veto trong lượt này. Hãy chọn một chính sách để ban hành."
              : "Máy chủ quyết định veto còn khả dụng hay không; dữ liệu hiện tại không có cờ xác nhận riêng."}
          </p>
        </>
      )}
      {confirmation && (
        <ConfirmDialog
          title="Xác nhận veto"
          onCancel={() => setConfirmation(null)}
          onConfirm={confirm}
        >
          <p>{confirmationMessages[confirmation]}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
