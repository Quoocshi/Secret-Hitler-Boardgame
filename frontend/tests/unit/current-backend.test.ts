import { expect, it } from "vitest";
import { decodePlayerView, SchemaError } from "@/lib/api/decoders";
import {
  actionPermission,
  chancellorEligibility,
} from "@/lib/game/permissions";
import { actionContextEnded } from "@/lib/realtime/commands";
import { legacyView } from "../support/legacy-view";

it("accepts server candidate IDs and keeps them authoritative for nomination", () => {
  const raw = legacyView({
    currentPhase: "NOMINATION",
    currentPresidentId: "p1",
    eligibleChancellorIds: [],
  });
  const snapshot = decodePlayerView(raw);
  expect(snapshot.eligibleChancellorIds).toEqual([]);
  expect(chancellorEligibility(snapshot, "p1").allowed).toBe(false);
});

it("accepts revealed roles only at game over", () => {
  const raw = legacyView();
  const players = [{ ...raw.players[0], revealedRole: "LIBERAL" }];
  expect(() => decodePlayerView({ ...raw, players })).toThrow(SchemaError);
  const result = decodePlayerView({
    ...raw,
    players,
    currentPhase: "GAME_OVER",
  });
  expect(result.players[0].revealedRole).toBe("LIBERAL");
});

it("allows finishing investigation only with a target-bound result for the president", () => {
  const raw = legacyView({
    currentPhase: "EXECUTIVE_ACTION",
    currentPresidentId: "p1",
    pendingExecutiveAction: "INVESTIGATE_LOYALTY",
    investigatedPlayerId: "p2",
    investigatedPartyMembership: "LIBERAL",
  });
  raw.players.push({ ...raw.players[0], id: "p2", isHost: false });
  const snapshot = decodePlayerView(raw);
  expect(snapshot.investigatedPlayerId).toBe("p2");
  expect(actionPermission(snapshot, "end-action", true, false).allowed).toBe(
    true,
  );
  expect(actionPermission(snapshot, "investigate", true, false).allowed).toBe(
    false,
  );
  expect(actionContextEnded(snapshot, "investigate")).toBe(true);
  const otherView = decodePlayerView({ ...raw, myPlayerId: "p2" });
  expect(otherView.investigatedPlayerId).toBeNull();
  expect(otherView.investigatedPartyMembership).toBeNull();
});
