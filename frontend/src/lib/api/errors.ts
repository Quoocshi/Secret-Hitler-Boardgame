export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
const messages: Record<string, string> = {
  ROOM_NOT_FOUND: "Phòng không còn tồn tại. Hãy tạo hoặc vào phòng mới.",
  INVALID_SESSION: "Phiên chơi không hợp lệ. Hãy quay về trang đầu.",
  ROOM_FULL: "Phòng đã đủ 10 người.",
  ROOM_STARTED: "Ván đã bắt đầu; chỉ thành viên cũ có thể trở lại.",
  NICKNAME_DUPLICATED: "Tên này đã có trong phòng.",
  DUPLICATE_SESSION: "Phiên này đang mở ở một tab khác.",
  STALE_STATE: "Phòng vừa thay đổi. Hãy kiểm tra rồi xác nhận lại.",
  INVALID_PAYLOAD: "Thông tin gửi lên không hợp lệ.",
};
export function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? (messages[error.code] ?? error.message)
    : error instanceof Error
      ? error.message
      : "Không thể kết nối máy chủ. Hãy thử lại.";
}
