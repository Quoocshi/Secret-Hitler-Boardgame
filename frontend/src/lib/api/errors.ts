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
  NETWORK_ERROR: "Không thể kết nối máy chủ. Hãy kiểm tra mạng và thử lại.",
  SERVER_ERROR: "Máy chủ chưa xử lý được yêu cầu. Hãy thử lại.",
};

export function legacyApiError(body: unknown, status: number): ApiError {
  const message =
    body && typeof body === "object" && "message" in body
      ? String(body.message)
      : "";
  let code = "SERVER_ERROR";
  if (message.startsWith("Không tìm thấy phòng với mã:")) {
    code = "ROOM_NOT_FOUND";
  } else if (
    message === "Invalid session token" ||
    message === "Phiên người chơi (sessionToken) không hợp lệ trong phòng này!"
  ) {
    code = "INVALID_SESSION";
  } else if (message.startsWith("Phòng đã đầy")) {
    code = "ROOM_FULL";
  } else if (message.startsWith("Trận đấu đã bắt đầu hoặc đã kết thúc")) {
    code = "ROOM_STARTED";
  } else if (/^Tên '.+' đã có người sử dụng trong phòng này!$/.test(message)) {
    code = "NICKNAME_DUPLICATED";
  }
  // Unknown server text may contain internal values: never echo it into UI or logs.
  return new ApiError(code, messages[code], status);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return messages[error.code] ?? error.message;
  }
  return error instanceof Error ? error.message : messages.NETWORK_ERROR;
}
