import { expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VotingActions } from "@/features/game/VotingActions";
import { view } from "../support/view";

it("shows the local choice while pending and moves the mark when changing votes", () => {
  const snapshot = view({ currentPhase: "VOTING" });
  snapshot.players[0].lastRevealedVote = "NEIN";
  const onVote = vi.fn();
  const { rerender, unmount } = render(
    <VotingActions snapshot={snapshot} enabled onVote={onVote} />,
  );
  const agree = screen.getByRole("button", { name: /JA — Đồng ý/ });
  const disagree = screen.getByRole("button", { name: /NEIN — Phản đối/ });
  expect(agree).toHaveAttribute("aria-pressed", "false");
  expect(disagree).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(agree);
  expect(agree).toHaveAttribute("aria-pressed", "true");
  expect(agree).toHaveTextContent("Đang chọn");
  expect(onVote).toHaveBeenLastCalledWith("JA");

  rerender(
    <VotingActions snapshot={snapshot} enabled={false} onVote={onVote} />,
  );
  expect(agree).toHaveAttribute("aria-pressed", "true");
  expect(agree).toBeDisabled();
  fireEvent.click(disagree);
  expect(onVote).toHaveBeenCalledTimes(1);

  rerender(<VotingActions snapshot={snapshot} enabled onVote={onVote} />);
  fireEvent.click(disagree);
  expect(disagree).toHaveAttribute("aria-pressed", "true");
  expect(disagree).toHaveTextContent("Đang chọn");
  expect(agree).toHaveAttribute("aria-pressed", "false");
  expect(agree).not.toHaveTextContent("Đang chọn");
  expect(onVote).toHaveBeenLastCalledWith("NEIN");

  unmount();
  render(<VotingActions snapshot={snapshot} enabled onVote={onVote} />);
  expect(screen.queryByText("Đang chọn")).not.toBeInTheDocument();
});
