import { expect, test } from "@playwright/test";
import { mockView, openMockRoom } from "./support";

test("voting selection survives snapshots and allows changing a secret vote repeatedly", async ({
  page,
}) => {
  const snapshot = mockView({ currentPhase: "VOTING" });
  const room = await openMockRoom(page, snapshot);
  const agree = page.getByRole("button", { name: /JA — Đồng ý/ });
  const disagree = page.getByRole("button", { name: /NEIN — Phản đối/ });

  await agree.click();
  await expect(agree).toHaveAttribute("aria-pressed", "true");
  const recorded = {
    ...snapshot,
    players: snapshot.players.map((player) => ({
      ...player,
      hasVoted: player.id === "p1" || player.id === "p2",
    })),
  };
  room.update(recorded);
  await expect(agree).toBeEnabled();
  await expect(agree).toHaveAttribute("aria-pressed", "true");

  // Secret vote changes return the exact same public snapshot.
  await disagree.click();
  await expect(disagree).toHaveAttribute("aria-pressed", "true");
  await expect(agree).toHaveAttribute("aria-pressed", "false");
  await expect(disagree).toBeEnabled();
  await agree.click();
  await expect(agree).toBeEnabled();
  await expect(agree).toHaveAttribute("aria-pressed", "true");
  await expect(disagree).toHaveAttribute("aria-pressed", "false");
  expect(room.sentActions).toEqual(Array(3).fill("/app/room/ABC234/vote"));
  await expect(
    page.getByRole("button", { name: "Đồng bộ trạng thái", exact: true }),
  ).toHaveCount(0);

  room.update({ ...recorded, currentPhase: "NOMINATION" });
  await expect(agree).toHaveCount(0);
  room.update({
    ...snapshot,
    currentPresidentId: "p2",
    nominatedChancellorId: "p3",
  });
  await expect(agree).toHaveAttribute("aria-pressed", "false");
  await expect(disagree).toHaveAttribute("aria-pressed", "false");
});
