import { vi } from "vitest";
import { RoomClient } from "@/lib/realtime/room-client";
import { initialRoomState, roomReducer } from "@/lib/realtime/room-reducer";
import type { PlayerView } from "@/lib/game/types";
import { view } from "./view";

const mocks = vi.hoisted(() => {
  class FakeClient {
    static instances: FakeClient[] = [];
    connected = false;
    active = false;
    reconnectDelay = 0;
    onConnect?: () => void;
    onWebSocketClose?: () => void;
    onStompError?: () => void;
    callbacks = new Map<string, (message: { body: string }) => void>();
    publish = vi.fn();
    unsubscribe = vi.fn();
    constructor(public options: unknown) {
      FakeClient.instances.push(this);
    }
    activate() {
      this.active = true;
    }
    subscribe(
      destination: string,
      callback: (message: { body: string }) => void,
    ) {
      this.callbacks.set(destination, callback);
      return { unsubscribe: this.unsubscribe };
    }
    forceDisconnect() {
      this.connected = false;
      this.onWebSocketClose?.();
    }
    async deactivate() {
      this.active = false;
      this.connected = false;
    }
  }
  return { FakeClient, get: vi.fn(), join: vi.fn() };
});

export const transport = mocks;

vi.mock("@stomp/stompjs", () => ({ Client: mocks.FakeClient }));
vi.mock("sockjs-client", () => ({ default: class {} }));
vi.mock("@/lib/api/rooms", () => ({
  getRoomState: mocks.get,
  joinRoom: mocks.join,
}));

export async function onlineRoom(
  snapshot: PlayerView = view({ currentPhase: "VOTING" }),
) {
  transport.FakeClient.instances = [];
  transport.get.mockResolvedValue(snapshot);
  transport.join.mockResolvedValue({
    roomCode: snapshot.roomCode,
    gameState: snapshot,
  });
  let state = { ...initialRoomState };
  const identity = {
    schemaVersion: 1 as const,
    roomCode: snapshot.roomCode,
    nickname: "Player",
    sessionToken: "test-own-session",
  };
  const client = new RoomClient(
    identity,
    0,
    (event) => {
      state = roomReducer(state, event);
    },
    () => state,
  );
  await client.start();
  const socket = transport.FakeClient.instances[0];
  socket.connected = true;
  socket.onConnect?.();
  await flushTransport();
  return {
    client,
    socket,
    identity,
    state: () => state,
    push(next: PlayerView) {
      [...socket.callbacks.values()][0]({ body: JSON.stringify(next) });
    },
  };
}

export async function flushTransport() {
  for (let index = 0; index < 20; index++) {
    await Promise.resolve();
  }
}
