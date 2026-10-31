import { StrictMode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { audioManager } from "@/lib/audio/audio-manager";
import { Button } from "@/components/ui/Button";
import { SoundControls } from "@/components/ui/SoundControls";
import { PolicyHand } from "@/features/game/PolicyHand";
import { VotingActions } from "@/features/game/VotingActions";
import { PrivateInfoPanel } from "@/features/game/PrivateInfoPanel";
import { view } from "../support/view";

afterEach(() => {
  audioManager.setSettings({ enabled: true, volume: 0.4 });
  localStorage.clear();
});

it("plays one UI sound per keyboard or mouse activation, never for disabled buttons", async () => {
  const play = vi.spyOn(audioManager, "play").mockImplementation(() => {});
  const action = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <Button onClick={action}>Enabled</Button>
      <Button disabled>Disabled</Button>
    </>,
  );
  await user.click(screen.getByText("Enabled"));
  await user.keyboard("{Enter}");
  await user.click(screen.getByText("Disabled"));
  expect(play.mock.calls).toEqual([["softui"], ["softui"]]);
  expect(action).toHaveBeenCalledTimes(2);
});

it("does not replay card selection on the same card or during StrictMode renders", () => {
  const play = vi.spyOn(audioManager, "play").mockImplementation(() => {});
  const select = vi.fn();
  render(
    <StrictMode>
      <PolicyHand
        cards={["LIBERAL", "FASCIST"]}
        selected={0}
        onSelect={select}
      />
    </StrictMode>,
  );
  expect(play).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByTestId("hand-card")[0]);
  expect(play).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByTestId("hand-card")[1]);
  expect(play).toHaveBeenCalledExactlyOnceWith("card");
});

it("uses identical sounds for JA and NEIN without claiming a server acknowledgement", () => {
  const play = vi.spyOn(audioManager, "play").mockImplementation(() => {});
  const vote = vi.fn();
  render(
    <VotingActions
      snapshot={view({ currentPhase: "VOTING" })}
      enabled
      onVote={vote}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /JA/ }));
  fireEvent.click(screen.getByRole("button", { name: /JA/ }));
  fireEvent.click(screen.getByRole("button", { name: /NEIN/ }));
  expect(play.mock.calls).toEqual([["paper"], ["paper"]]);
  expect(vote).toHaveBeenCalledTimes(3);
});

it("uses the same flip sound for all roles", () => {
  const play = vi.spyOn(audioManager, "play").mockImplementation(() => {});
  const { rerender } = render(
    <PrivateInfoPanel snapshot={view({ myRole: "LIBERAL" })} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ vai trò" }));
  rerender(<PrivateInfoPanel snapshot={view({ myRole: "HITLER" })} />);
  fireEvent.click(screen.getByRole("button", { name: "Úp thẻ vai trò" }));
  expect(play.mock.calls).toEqual([["card"], ["card"]]);
});

it("stores only audio settings and exposes keyboard-accessible controls", () => {
  render(<SoundControls />);
  fireEvent.click(screen.getByRole("button", { name: "Tắt âm thanh" }));
  expect(screen.getByRole("button", { name: "Bật âm thanh" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  fireEvent.change(screen.getByRole("slider", { name: "Âm lượng hiệu ứng" }), {
    target: { value: "25" },
  });
  expect(JSON.parse(localStorage.getItem("hboardgame.sound")!)).toEqual({
    enabled: false,
    volume: 0.25,
  });
});
