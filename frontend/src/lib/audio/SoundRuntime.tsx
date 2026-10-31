import { useEffect, useRef } from "react";
import { useRoomSession } from "@/features/room/RoomSessionProvider";
import { audioManager } from "./audio-manager";
import { roomSoundEvent } from "./room-sound-events";

export function SoundRuntime() {
  const { state } = useRoomSession();
  const previous = useRef(state);
  useEffect(() => audioManager.attach(), []);
  useEffect(() => {
    const sound = roomSoundEvent(previous.current, state);
    // Advance even when muted/hidden: never replay events on focus or unmute.
    previous.current = state;
    if (sound) {
      audioManager.play(sound);
    }
  }, [state]);
  return null;
}
