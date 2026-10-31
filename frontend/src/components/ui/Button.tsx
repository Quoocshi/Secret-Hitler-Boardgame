import type { ComponentProps } from "react";
import { audioManager } from "@/lib/audio/audio-manager";
import type { SoundId } from "@/lib/audio/sounds";
export function Button({
  className = "",
  type = "button",
  sound = "softui",
  onClick,
  ...props
}: ComponentProps<"button"> & { sound?: SoundId | false }) {
  return (
    <button
      type={type}
      className={`button ${className}`}
      {...props}
      onClick={(event) => {
        if (sound && !props.disabled) {
          audioManager.play(sound);
        }
        onClick?.(event);
      }}
    />
  );
}
