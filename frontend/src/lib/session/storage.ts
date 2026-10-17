import {
  roomCodePattern,
  uuidPattern,
  type SessionIdentity,
} from "@/lib/game/types";

const identityKey = "hboardgame.identity";
const nicknameKey = "hboardgame.nickname";

function isSessionIdentity(value: unknown): value is SessionIdentity {
  if (!value || typeof value !== "object") {
    return false;
  }

  const identity = value as Record<string, unknown>;
  return (
    identity.schemaVersion === 1 &&
    typeof identity.sessionToken === "string" &&
    uuidPattern.test(identity.sessionToken) &&
    typeof identity.roomCode === "string" &&
    roomCodePattern.test(identity.roomCode) &&
    typeof identity.nickname === "string" &&
    identity.nickname.trim().length > 0
  );
}

export function readIdentity(): SessionIdentity | null {
  try {
    const storedValue = localStorage.getItem(identityKey);
    if (!storedValue) {
      return null;
    }

    const identity: unknown = JSON.parse(storedValue);
    if (!isSessionIdentity(identity)) {
      throw new Error("Invalid saved identity");
    }

    // Rebuild the known fields so extra saved data never enters session state.
    return {
      schemaVersion: 1,
      sessionToken: identity.sessionToken,
      roomCode: identity.roomCode,
      nickname: identity.nickname,
    };
  } catch {
    throw new Error(
      "Không thể đọc phiên đã lưu. Hãy xóa phiên cũ để vào phòng lại.",
    );
  }
}

export function saveIdentity(identity: SessionIdentity) {
  try {
    localStorage.setItem(identityKey, JSON.stringify(identity));
    localStorage.setItem(nicknameKey, identity.nickname);
  } catch {
    throw new Error(
      "Trình duyệt không cho lưu phiên. Hãy cho phép lưu trữ để phục hồi khi tải lại.",
    );
  }
}

export function clearIdentity() {
  try {
    localStorage.removeItem(identityKey);
  } catch {
    throw new Error("Không thể xóa phiên đã lưu trong trình duyệt.");
  }
}

export function savedNickname(): string {
  try {
    return localStorage.getItem(nicknameKey) ?? "";
  } catch {
    throw new Error("Không thể đọc tên đã lưu trong trình duyệt.");
  }
}
