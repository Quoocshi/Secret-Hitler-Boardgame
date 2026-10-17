import { expect, it } from "vitest";
import { decodePlayerView, SchemaError } from "@/lib/api/decoders";
import { legacyApiError } from "@/lib/api/errors";
import { view } from "../support/view";

it("does not forward unknown root fields into UI state", () => {
  const snapshot = decodePlayerView({
    ...view(),
    serverSecret: "private",
    stateVersion: 100,
  });
  expect(snapshot).not.toHaveProperty("serverSecret");
  expect(snapshot).not.toHaveProperty("stateVersion");
});

it("rejects secret fields on public players", () => {
  expect(() =>
    decodePlayerView({
      ...view(),
      players: [{ ...view().players[0], role: "HITLER" }],
    }),
  ).toThrow(SchemaError);
});

it.each([
  ["Invalid session token", "INVALID_SESSION"],
  ["Không tìm thấy phòng với mã: ABC234", "ROOM_NOT_FOUND"],
  ["Phòng đã đầy (tối đa 10 người)!", "ROOM_FULL"],
  ["Internal details", "SERVER_ERROR"],
])("maps legacy error safely: %s", (message, code) => {
  const error = legacyApiError({ status: 400, message }, 400);
  expect(error.code).toBe(code);
  expect(error.message).not.toContain("Internal details");
});
