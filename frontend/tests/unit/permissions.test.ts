import { expect, it } from "vitest";
import {
  actionPermission,
  chancellorEligibility,
  executiveTargetEligibility,
} from "@/lib/game/permissions";
import { view } from "../support/view";

it("enables only an alive, connected actor in the appropriate phase", () => {
  const snapshot = view({
    currentPhase: "NOMINATION",
    currentPresidentId: "p1",
  });
  expect(actionPermission(snapshot, "nominate", true, false).allowed).toBe(
    true,
  );
  expect(actionPermission(snapshot, "nominate", false, false).allowed).toBe(
    false,
  );
  expect(actionPermission(snapshot, "nominate", true, true).allowed).toBe(
    false,
  );
  snapshot.players[0].isAlive = false;
  expect(actionPermission(snapshot, "nominate", true, false).allowed).toBe(
    false,
  );
});

it("blocks repeat veto only when the request was actually observed", () => {
  const snapshot = view({
    currentPhase: "LEGISLATIVE_CHANCELLOR",
    currentChancellorId: "p1",
    enactedFascistPolicies: 5,
  });
  expect(
    actionPermission(snapshot, "veto/request", true, false, "unknown").allowed,
  ).toBe(true);
  expect(
    actionPermission(
      snapshot,
      "veto/request",
      true,
      false,
      "observed-requested",
    ).allowed,
  ).toBe(false);
});

it("keeps missing cards readonly and end-action restricted to peek", () => {
  const snapshot = view({
    currentPhase: "LEGISLATIVE_PRESIDENT",
    currentPresidentId: "p1",
  });
  expect(actionPermission(snapshot, "discard", true, false).allowed).toBe(
    false,
  );
  expect(actionPermission(snapshot, "end-action", true, false).allowed).toBe(
    false,
  );
});

it("does not nominate or execute self", () => {
  const snapshot = view({ currentPresidentId: "p1" });
  expect(chancellorEligibility(snapshot, "p1").allowed).toBe(false);
  expect(executiveTargetEligibility(snapshot, "p1").allowed).toBe(false);
});

it("applies term limits to the previous president only above five living players", () => {
  const snapshot = view({
    currentPresidentId: "p1",
    lastElectedPresidentId: "p2",
    lastElectedChancellorId: "p3",
  });
  const template = snapshot.players[0];
  snapshot.players = Array.from({ length: 6 }, (_, index) => ({
    ...template,
    id: `p${index + 1}`,
  }));
  expect(chancellorEligibility(snapshot, "p2").allowed).toBe(false);
  expect(chancellorEligibility(snapshot, "p3").allowed).toBe(false);
  snapshot.players[5].isAlive = false;
  expect(chancellorEligibility(snapshot, "p2").allowed).toBe(true);
  expect(chancellorEligibility(snapshot, "p3").allowed).toBe(false);
});

it("blocks investigated or dead executive targets and incomplete peek cards", () => {
  const snapshot = view({
    currentPhase: "EXECUTIVE_ACTION",
    currentPresidentId: "p1",
    pendingExecutiveAction: "INVESTIGATE_LOYALTY",
  });
  snapshot.players.push({ ...snapshot.players[0], id: "p2", isHost: false });
  snapshot.players[1].isInvestigated = true;
  expect(executiveTargetEligibility(snapshot, "p2").allowed).toBe(false);
  snapshot.players[1].isInvestigated = false;
  snapshot.players[1].isAlive = false;
  expect(executiveTargetEligibility(snapshot, "p2").allowed).toBe(false);
  snapshot.pendingExecutiveAction = "POLICY_PEEK";
  expect(actionPermission(snapshot, "end-action", true, false).allowed).toBe(
    false,
  );
  snapshot.handCards = ["LIBERAL", "FASCIST", "LIBERAL"];
  expect(actionPermission(snapshot, "end-action", true, false).allowed).toBe(
    true,
  );
});
