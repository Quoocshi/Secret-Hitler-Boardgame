import type { Connection } from "@/lib/realtime/room-reducer";
import { Button } from "@/components/ui/Button";
export const connectionLabels: Record<Connection, string> = {
  idle: "Đang chuẩn bị",
  restoring: "Đang khôi phục",
  connecting: "Đang kết nối",
  syncing: "Đang đồng bộ",
  online: "Đã đồng bộ",
  reconnecting: "Đang kết nối lại",
  duplicate: "Phiên trùng",
  expired: "Phòng hết hạn",
  error: "Cần kiểm tra",
  leaving: "Đang rời phòng",
};
export function ConnectionBanner({
  connection,
  onRetry,
}: {
  connection: Connection;
  onRetry: () => void;
}) {
  if (connection === "online" || connection === "idle") {
    return null;
  }
  const messages: Partial<Record<Connection, string>> = {
    restoring: "Đang khôi phục đúng phiên của bạn.",
    connecting: "Đang kết nối với bàn chơi.",
    syncing: "Đang lấy trạng thái mới nhất. Hãy chờ trước khi thao tác.",
    reconnecting:
      "Mất kết nối. Các nút thao tác đã khóa; thao tác đang chờ sẽ không tự gửi lại.",
    duplicate:
      "Phiên đang hoạt động ở tab khác. Hãy đóng tab đó trước khi kết nối lại.",
    expired: "Phòng hoặc phiên không còn hợp lệ. Hãy quay về trang đầu.",
    error:
      "Chưa thể tiếp tục. Hãy kiểm tra thông báo rồi kết nối lại hoặc rời phòng.",
    leaving: "Đang đóng phiên chơi.",
  };
  return (
    <div className="connection-banner" role="status">
      <span>{messages[connection]}</span>
      {["reconnecting", "duplicate", "error"].includes(connection) && (
        <Button onClick={onRetry}>Kết nối lại</Button>
      )}
    </div>
  );
}
