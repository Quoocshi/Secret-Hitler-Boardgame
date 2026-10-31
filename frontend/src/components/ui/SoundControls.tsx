import { useSyncExternalStore } from "react";
import { audioManager } from "@/lib/audio/audio-manager";
import "@/lib/audio/sound-controls.css";

export function SoundControls() {
  const settings = useSyncExternalStore(
    audioManager.subscribe,
    audioManager.getSettings,
  );
  return (
    <div className="sound-controls" aria-label="Âm thanh trò chơi">
      <button
        type="button"
        className="button"
        aria-pressed={settings.enabled}
        onClick={() => {
          audioManager.setSettings({ enabled: !settings.enabled });
          if (!settings.enabled) {
            audioManager.unlock();
          }
        }}
      >
        {settings.enabled ? "Tắt âm thanh" : "Bật âm thanh"}
      </button>
      <label>
        Âm lượng
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={Math.round(settings.volume * 100)}
          aria-label="Âm lượng hiệu ứng"
          onChange={(event) =>
            audioManager.setSettings({
              volume: Number(event.target.value) / 100,
            })
          }
        />
      </label>
    </div>
  );
}
