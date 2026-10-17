import { config } from "./config";
import { ApiError, legacyApiError } from "./errors";
import { decodePlayerView, decodeRoomResponse } from "./decoders";

async function request(path: string, init: RequestInit) {
  let response: Response;
  try {
    response = await fetch(config.apiUrl + path, {
      ...init,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError("NETWORK_ERROR", "Không thể kết nối máy chủ.", 0);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      "SERVER_ERROR",
      "Máy chủ trả về dữ liệu không hợp lệ.",
      response.status,
    );
  }
  if (!response.ok) {
    throw legacyApiError(body, response.status);
  }
  return body;
}

export async function createRoom(
  nickname: string,
  sessionToken: string,
  signal?: AbortSignal,
) {
  return decodeRoomResponse(
    await request("/api/rooms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, sessionToken }),
      signal,
    }),
  );
}

export async function joinRoom(
  roomCode: string,
  nickname: string,
  sessionToken: string,
  signal?: AbortSignal,
) {
  return decodeRoomResponse(
    await request("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, nickname, sessionToken }),
      signal,
    }),
  );
}

export async function getRoomState(
  roomCode: string,
  sessionToken: string,
  signal?: AbortSignal,
) {
  return decodePlayerView(
    await request(`/api/rooms/${encodeURIComponent(roomCode)}/state`, {
      headers: { "X-Session-Token": sessionToken },
      signal,
    }),
  );
}
