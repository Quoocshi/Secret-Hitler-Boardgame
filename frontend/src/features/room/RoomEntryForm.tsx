import { useState } from "react";
import { roomCodePattern } from "@/lib/game/types";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { StatusNotice } from "@/components/ui/StatusNotice";
export function RoomEntryForm({
  nickname: initialNickname,
  roomCode: initialCode,
  busy,
  error,
  onEnter,
}: {
  nickname: string;
  roomCode: string;
  busy: boolean;
  error: string | null;
  onEnter: (nickname: string, code?: string) => void;
}) {
  const [nickname, setNickname] = useState(initialNickname);
  const [roomCode, setRoomCode] = useState(initialCode);
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

  function submit(shouldJoinRoom: boolean) {
    const trimmedNickname = nickname.trim();
    const normalizedRoomCode = roomCode.trim().toUpperCase();
    const validationErrors = {
      name: trimmedNickname ? undefined : "Hãy nhập tên của bạn.",
      code:
        shouldJoinRoom && !roomCodePattern.test(normalizedRoomCode)
          ? "Mã phòng gồm 6 ký tự."
          : undefined,
    };
    setErrors(validationErrors);
    if (validationErrors.name || validationErrors.code) {
      return;
    }
    onEnter(trimmedNickname, shouldJoinRoom ? normalizedRoomCode : undefined);
  }
  return (
    <div className="entry-card">
      <p className="eyebrow">MỘT BÀN CHƠI · 5–10 NGƯỜI</p>
      <h2>Cùng bạn bè vào bàn</h2>
      <p>
        Tạo phòng rồi chia sẻ mã. Vai trò và lá bài riêng chỉ xuất hiện trên màn
        hình của bạn.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}
      >
        <Field
          id="nickname"
          label="Tên của bạn"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          error={errors.name}
          autoComplete="nickname"
          disabled={busy}
        />
        <Button className="primary full" type="submit" disabled={busy}>
          {busy ? "Đang kết nối…" : "Tạo phòng"}
        </Button>
      </form>
      <div className="divider">
        <span>hoặc tham gia phòng có sẵn</span>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(true);
        }}
      >
        <Field
          id="room-code"
          label="Mã phòng"
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          error={errors.code}
          maxLength={6}
          autoComplete="off"
          spellCheck={false}
          disabled={busy}
        />
        <Button className="full" type="submit" disabled={busy}>
          Vào phòng
        </Button>
      </form>
      <StatusNotice message={error} error />
    </div>
  );
}
