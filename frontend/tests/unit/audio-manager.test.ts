import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AudioManager, SOUND_SETTINGS_KEY } from "@/lib/audio/audio-manager";
import { sounds } from "@/lib/audio/sounds";

function createTestSource() {
  return {
    buffer: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
  };
}

function createTestGain() {
  return { gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
}

class TestAudioContext {
  state = "running";
  destination = {};
  sources: ReturnType<typeof createTestSource>[] = [];
  gains: ReturnType<typeof createTestGain>[] = [];
  resume = vi.fn(async () => {
    this.state = "running";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
  decodeAudioData = vi.fn(async () => ({}));
  createBufferSource() {
    const source = createTestSource();
    this.sources.push(source);
    return source;
  }
  createGain() {
    const gain = createTestGain();
    this.gains.push(gain);
    return gain;
  }
}

let context: TestAudioContext;
let manager: AudioManager;

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("AudioContext", function AudioContextStub() {
    context = new TestAudioContext();
    return context;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1),
    })),
  );
  manager = new AudioManager();
});

afterEach(() => {
  manager.dispose();
  vi.unstubAllGlobals();
});

async function loaded() {
  manager.unlock();
  await vi.waitFor(() =>
    expect(context.decodeAudioData).toHaveBeenCalledTimes(
      Object.keys(sounds).length,
    ),
  );
  await Promise.resolve();
}

it("loads all existing assets after unlock and never queues an unloaded sound", async () => {
  manager.play("softui");
  expect(fetch).not.toHaveBeenCalled();
  manager.unlock();
  manager.play("softui");
  expect(context.sources).toHaveLength(0);
  await vi.waitFor(() =>
    expect(context.decodeAudioData).toHaveBeenCalledTimes(11),
  );
  await Promise.resolve();
  expect(context.sources).toHaveLength(0);
  manager.play("softui");
  expect(context.sources).toHaveLength(1);
  expect(fetch).toHaveBeenCalledWith("/sound/3_policy.mp3");
});

it("preempts UI with important events, blocks lower priority overlap and stops on mute", async () => {
  await loaded();
  manager.play("softui");
  manager.play("gunshot");
  expect(context.sources[0].stop).toHaveBeenCalledOnce();
  manager.play("softui");
  expect(context.sources).toHaveLength(2);
  manager.setSettings({ enabled: false });
  expect(context.sources[1].stop).toHaveBeenCalledOnce();
  manager.play("gunshot");
  manager.setSettings({ enabled: true });
  expect(context.sources).toHaveLength(2);
});

it("applies gain and remembers only validated sound preferences", async () => {
  await loaded();
  manager.play("gunshot");
  expect(manager.getSettings().volume).toBe(0.8);
  expect(context.gains[0].gain.value).toBeCloseTo(0.8 * sounds.gunshot.gain);
  manager.setSettings({ volume: 0.2 });
  expect(context.gains[0].gain.value).toBeCloseTo(0.2 * sounds.gunshot.gain);
  expect(JSON.parse(localStorage.getItem(SOUND_SETTINGS_KEY)!)).toEqual({
    enabled: true,
    volume: 0.2,
  });
  manager.setSettings({ volume: Number.NaN });
  expect(manager.getSettings().volume).toBe(0.2);
  manager.setSettings({ volume: 10 });
  expect(manager.getSettings().volume).toBe(1);
  expect(new AudioManager().getSettings().volume).toBe(1);
});

it("skips hidden events and stops active audio without replaying on focus", async () => {
  const detach = manager.attach();
  await loaded();
  manager.play("notify");
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  document.dispatchEvent(new Event("visibilitychange"));
  manager.play("gunshot");
  expect(context.sources[0].stop).toHaveBeenCalledOnce();
  expect(context.sources).toHaveLength(1);
  detach();
});

it("tolerates blocked playback, missing assets and failed decode", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  manager.unlock();
  await Promise.resolve();
  expect(() => manager.play("error")).not.toThrow();
  expect(context.sources).toHaveLength(0);
  manager.dispose();
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(1),
  } as Response);
  manager = new AudioManager();
  manager.unlock();
  context.decodeAudioData.mockRejectedValue(new Error("decode"));
  await Promise.resolve();
  await Promise.resolve();
  expect(() => manager.play("error")).not.toThrow();
});

it("keeps controls usable when browser storage fails", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const isolated = new AudioManager();
  expect(() => isolated.setSettings({ enabled: false })).not.toThrow();
  expect(isolated.getSettings().enabled).toBe(false);
  isolated.dispose();
});

it("removes gesture listeners and closes the context on unmount", async () => {
  const detach = manager.attach();
  document.dispatchEvent(new Event("pointerdown"));
  expect(fetch).toHaveBeenCalledTimes(11);
  detach();
  expect(context.close).toHaveBeenCalledOnce();
  document.dispatchEvent(new Event("keydown"));
  expect(fetch).toHaveBeenCalledTimes(11);
});
