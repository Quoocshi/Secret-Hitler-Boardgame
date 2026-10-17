import { beforeEach, expect, it } from "vitest";
import {
  clearIdentity,
  readIdentity,
  saveIdentity,
} from "@/lib/session/storage";

beforeEach(() => localStorage.clear());

it("retains only identity fields when restoring old storage", () => {
  localStorage.setItem(
    "hboardgame.identity",
    JSON.stringify({
      schemaVersion: 1,
      roomCode: "ABC234",
      nickname: "P1",
      sessionToken: "11111111-1111-4111-8111-111111111111",
      myRole: "HITLER",
      handCards: ["FASCIST"],
    }),
  );
  const identity = readIdentity();
  expect(identity).not.toHaveProperty("myRole");
  expect(identity).not.toHaveProperty("handCards");
});

it("leaving removes the identity while retaining nickname", () => {
  saveIdentity({
    schemaVersion: 1,
    roomCode: "ABC234",
    nickname: "P1",
    sessionToken: "11111111-1111-4111-8111-111111111111",
  });
  clearIdentity();
  expect(readIdentity()).toBeNull();
  expect(localStorage.getItem("hboardgame.nickname")).toBe("P1");
});
