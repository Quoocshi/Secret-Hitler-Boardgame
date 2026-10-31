import { sounds, soundUrl, type SoundId } from "./sounds";

export const SOUND_SETTINGS_KEY = "hboardgame.sound";
const DEFAULT_SETTINGS = { enabled: true, volume: 0.8 };
const REPEAT_INTERVAL_MS = 100;

export interface SoundSettings {
  enabled: boolean;
  volume: number;
}

function readSettings(): SoundSettings {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SOUND_SETTINGS_KEY) ?? "null",
    );
    if (
      typeof saved?.enabled === "boolean" &&
      typeof saved?.volume === "number" &&
      Number.isFinite(saved.volume)
    ) {
      return {
        enabled: saved.enabled,
        volume: Math.max(0, Math.min(1, saved.volume)),
      };
    }
  } catch {
    // Sound preferences must never prevent joining a game.
  }
  return { ...DEFAULT_SETTINGS };
}

export class AudioManager {
  private settings = readSettings();
  private listeners = new Set<() => void>();
  private context: AudioContext | undefined;
  private buffers = new Map<SoundId, AudioBuffer>();
  private loading = new Map<SoundId, Promise<void>>();
  private active:
    | {
        source: AudioBufferSourceNode;
        gain: GainNode;
        priority: number;
        id: SoundId;
        startedAt: number;
      }
    | undefined;
  private disposed = false;

  getSettings = () => this.settings;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setSettings(update: Partial<SoundSettings>) {
    const volume = update.volume ?? this.settings.volume;
    this.settings = {
      enabled: update.enabled ?? this.settings.enabled,
      volume: Number.isFinite(volume)
        ? Math.max(0, Math.min(1, volume))
        : this.settings.volume,
    };
    try {
      localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // The in-memory controls also work when storage is unavailable.
    }
    if (!this.settings.enabled || !this.settings.volume) {
      this.stop();
    } else if (this.active) {
      this.active.gain.gain.value =
        this.settings.volume * sounds[this.active.id].gain;
    }
    this.listeners.forEach((listener) => listener());
  }

  unlock = () => {
    if (!this.settings.enabled || this.disposed) {
      return;
    }
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") {
        void this.context.resume().catch(() => {});
      }
      for (const id of Object.keys(sounds) as SoundId[]) {
        this.load(id);
      }
    } catch {
      // Unsupported or blocked audio is optional; gameplay keeps working.
    }
  };

  private load(id: SoundId) {
    if (!this.context || this.buffers.has(id) || this.loading.has(id)) {
      return;
    }
    const context = this.context;
    const request = (async () => {
      try {
        const response = await fetch(soundUrl(id));
        if (!response.ok) {
          return;
        }
        const buffer = await context.decodeAudioData(
          await response.arrayBuffer(),
        );
        if (!this.disposed && this.context === context) {
          this.buffers.set(id, buffer);
        }
      } catch {
        // Missing assets, network and decode failures must not surface as game errors.
      }
    })();
    this.loading.set(id, request);
  }

  play = (id: SoundId) => {
    const context = this.context;
    const buffer = this.buffers.get(id);
    if (
      this.disposed ||
      !this.settings.enabled ||
      !this.settings.volume ||
      document.visibilityState === "hidden" ||
      context?.state !== "running" ||
      !buffer
    ) {
      return;
    }
    const now = performance.now();
    const active = this.active;
    if (
      active &&
      (active.priority > sounds[id].priority ||
        (active.id === id && now - active.startedAt < REPEAT_INTERVAL_MS))
    ) {
      return;
    }
    this.stop();
    try {
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = this.settings.volume * sounds[id].gain;
      source.connect(gain);
      gain.connect(context.destination);
      this.active = {
        source,
        gain,
        priority: sounds[id].priority,
        id,
        startedAt: now,
      };
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (this.active?.source === source) {
          this.active = undefined;
        }
      };
      source.start();
    } catch {
      this.stop();
    }
  };

  stop = () => {
    const active = this.active;
    this.active = undefined;
    if (!active) {
      return;
    }
    try {
      active.source.stop();
    } catch {
      /* Already ended. */
    }
    active.source.disconnect();
    active.gain.disconnect();
  };

  dispose() {
    this.disposed = true;
    this.stop();
    this.buffers.clear();
    this.loading.clear();
    void this.context?.close().catch(() => {});
    this.context = undefined;
  }

  attach() {
    this.disposed = false;
    const unlock = () => this.unlock();
    const hide = () => {
      if (document.visibilityState === "hidden") {
        this.stop();
      }
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
      document.removeEventListener("visibilitychange", hide);
      this.dispose();
    };
  }
}

export const audioManager = new AudioManager();
