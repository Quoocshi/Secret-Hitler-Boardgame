import { StrictMode } from "react";
import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SoundRuntime } from "@/lib/audio/SoundRuntime";
import { audioManager } from "@/lib/audio/audio-manager";
import { useRoomSession } from "@/features/room/RoomSessionProvider";
import { initialRoomState } from "@/lib/realtime/room-reducer";
import { view } from "../support/view";

vi.mock("@/features/room/RoomSessionProvider", () => ({
  useRoomSession: vi.fn(),
}));

it("does not replay transitions on StrictMode, remount, generation reset or unchanged snapshots", () => {
  const play = vi.spyOn(audioManager, "play").mockImplementation(() => {});
  const detach = vi.fn();
  vi.spyOn(audioManager, "attach").mockReturnValue(detach);
  const before = {
    ...initialRoomState,
    connection: "online" as const,
    snapshot: view(),
  };
  const session = (state: typeof before) => {
    vi.mocked(useRoomSession).mockReturnValue({ state } as ReturnType<
      typeof useRoomSession
    >);
  };
  session(before);
  const runtime = render(
    <StrictMode>
      <SoundRuntime />
    </StrictMode>,
  );
  expect(play).not.toHaveBeenCalled();
  const after = {
    ...before,
    snapshot: view({ currentPhase: "NOMINATION", currentPresidentId: "p1" }),
  };
  session(after);
  runtime.rerender(
    <StrictMode>
      <SoundRuntime />
    </StrictMode>,
  );
  expect(play).toHaveBeenCalledExactlyOnceWith("start");
  session({ ...after, snapshot: { ...after.snapshot }, viewRevision: 10 });
  runtime.rerender(
    <StrictMode>
      <SoundRuntime />
    </StrictMode>,
  );
  expect(play).toHaveBeenCalledOnce();
  session({
    ...before,
    generation: 2,
    snapshot: view({ currentPhase: "GAME_OVER" }),
  });
  runtime.rerender(
    <StrictMode>
      <SoundRuntime />
    </StrictMode>,
  );
  expect(play).toHaveBeenCalledOnce();
  runtime.unmount();
  render(
    <StrictMode>
      <SoundRuntime />
    </StrictMode>,
  );
  expect(play).toHaveBeenCalledOnce();
  expect(detach).toHaveBeenCalled();
});
