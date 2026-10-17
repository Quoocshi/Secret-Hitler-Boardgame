import { describe, expect, it } from "vitest";
import { decodePlayerView, SchemaError } from "@/lib/api/decoders";
import { legacyView } from "../support/legacy-view";

describe("legacy backend snapshots", () => {
  it("accepts a real DTO without version, veto flag or investigation history", () => {
    const snapshot = decodePlayerView(legacyView());
    expect(snapshot.myPlayerId).toBe("p1");
    expect(snapshot).not.toHaveProperty("stateVersion");
    expect(snapshot).not.toHaveProperty("investigationResults");
  });

  it("discards stale cards received during an unrelated executive power", () => {
    const snapshot = decodePlayerView(
      legacyView({
        currentPhase: "EXECUTIVE_ACTION",
        currentPresidentId: "p1",
        pendingExecutiveAction: "EXECUTION",
        handCards: ["FASCIST", "LIBERAL", "FASCIST"],
      }),
    );
    expect(snapshot.handCards).toEqual([]);
  });

  it("keeps valid room information when the actor has not received enough cards", () => {
    expect(
      decodePlayerView(
        legacyView({
          currentPhase: "LEGISLATIVE_PRESIDENT",
          currentPresidentId: "p1",
          handCards: [],
        }),
      ).currentPhase,
    ).toBe("LEGISLATIVE_PRESIDENT");
  });

  it.each([
    { currentPhase: "UNKNOWN" },
    { handCards: ["HITLER"] },
    { currentPresidentId: "outsider" },
    { myPlayerId: "outsider" },
  ])("rejects invalid data %j", (overrides) => {
    expect(() => decodePlayerView(legacyView(overrides))).toThrow(SchemaError);
  });
});
