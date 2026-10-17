import { expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PrivateInfoPanel } from "@/features/game/PrivateInfoPanel";
import { decodePlayerView } from "@/lib/api/decoders";
import { view } from "../support/view";

it.each([7, 8, 9, 10])(
  "hides teammates from Hitler even when the server supplies them in a %i-player game",
  (playerCount) => {
    const snapshot = view({
      currentPhase: "NOMINATION",
      myRole: "HITLER",
      knownAllyIds: ["p2"],
    });
    snapshot.players = Array.from({ length: playerCount }, (_, index) => ({
      ...snapshot.players[0],
      id: "p" + (index + 1),
      nickname: index === 1 ? "Hidden teammate" : "Player " + index,
      isHost: index === 0,
      isAlive: index < 5,
    }));
    expect(decodePlayerView(snapshot).knownAllyIds).toEqual([]);

    // The UI also protects callers that pass an undecoded snapshot.
    render(<PrivateInfoPanel snapshot={snapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "Lật thẻ vai trò" }));
    expect(screen.getByText("Hitler")).toBeVisible();
    expect(screen.queryByText(/Đồng minh được biết/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hidden teammate/)).not.toBeInTheDocument();
  },
);

it.each([5, 6])(
  "shows supplied teammates to Hitler only after revealing the role in a %i-player game",
  (playerCount) => {
    const snapshot = view({
      currentPhase: "NOMINATION",
      myRole: "HITLER",
      knownAllyIds: ["p2"],
    });
    snapshot.players = Array.from({ length: playerCount }, (_, index) => ({
      ...snapshot.players[0],
      id: "p" + (index + 1),
      nickname: index === 1 ? "Known teammate" : "Player " + index,
      isHost: index === 0,
    }));
    const decoded = decodePlayerView(snapshot);
    expect(decoded.knownAllyIds).toEqual(["p2"]);
    render(<PrivateInfoPanel snapshot={decoded} />);
    expect(screen.queryByText(/Known teammate/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lật thẻ vai trò" }));
    expect(screen.getByText("Hitler")).toBeVisible();
    expect(screen.getByText(/Known teammate/)).toBeVisible();
  },
);

it("still displays supplied teammates for a fascist after revealing their role", () => {
  const snapshot = view({
    currentPhase: "NOMINATION",
    myRole: "FASCIST",
    knownAllyIds: ["p2"],
  });
  snapshot.players.push({
    ...snapshot.players[0],
    id: "p2",
    nickname: "Known teammate",
    isHost: false,
  });
  const decoded = decodePlayerView(snapshot);
  expect(decoded.knownAllyIds).toEqual(["p2"]);
  render(<PrivateInfoPanel snapshot={decoded} />);
  expect(screen.queryByText(/Known teammate/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Lật thẻ vai trò" }));
  expect(screen.getByText(/Known teammate/)).toBeVisible();
});
