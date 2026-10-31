import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
export function LeaveButton({
  onLeave,
  disabled = false,
  label = "Rời phòng",
  localOnly = false,
  onOpen,
}: {
  onLeave: () => Promise<void>;
  disabled?: boolean;
  label?: string;
  localOnly?: boolean;
  onOpen?: () => void;
}) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  return (
    <>
      <Button
        sound="paper"
        disabled={disabled}
        onClick={() => {
          onOpen?.();
          setConfirmationOpen(true);
        }}
      >
        {label}
      </Button>
      {confirmationOpen &&
        createPortal(
          <ConfirmDialog
            title="Rời bàn chơi?"
            onCancel={() => setConfirmationOpen(false)}
            onConfirm={() => {
              setConfirmationOpen(false);
              void onLeave();
            }}
          >
            <p>
              {localOnly
                ? "Phiên này không còn tham gia phòng. Bạn sẽ trở về trang đầu."
                : "Bạn sẽ rời phòng và bị xóa khỏi danh sách thành viên, không thể vào lại ván đang chơi. Nếu còn dưới 5 thành viên, ván sẽ dừng. Bạn chỉ có thể tham gia lại như người mới khi phòng đang chờ."}
            </p>
          </ConfirmDialog>,
          document.body,
        )}
    </>
  );
}
