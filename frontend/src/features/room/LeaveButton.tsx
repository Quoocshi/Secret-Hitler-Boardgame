import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
export function LeaveButton({
  onLeave,
  disabled = false,
  label = "Rời phòng",
}: {
  onLeave: () => Promise<void>;
  disabled?: boolean;
  label?: string;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Button disabled={disabled} onClick={() => setConfirm(true)}>
        {label}
      </Button>
      {confirm && (
        <ConfirmDialog
          title="Rời bàn chơi?"
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            setConfirm(false);
            void onLeave();
          }}
        >
          <p>
            Bạn sẽ ngắt kết nối khỏi bàn chơi. Những người còn lại vẫn có thể
            theo dõi ván.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
