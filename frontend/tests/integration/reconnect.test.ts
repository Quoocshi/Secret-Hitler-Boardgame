import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RoomClient } from "@/lib/realtime/room-client";
import {
  initialRoomState,
  roomReducer,
  type RoomEvent,
} from "@/lib/realtime/room-reducer";
import { ApiError } from "@/lib/api/errors";
import { view, actionId } from "../support/view";
const mock = vi.hoisted(() => {
  const get = vi.fn();
  class FakeClient {
    connected = false;
    active = false;
    onConnect?: () => void;
    onWebSocketClose?: () => void;
    onStompError?: (frame: { headers: Record<string, string> }) => void;
    receipts = new Map<string, () => void>();
    subscriptions = new Map<string, (message: { body: string }) => void>();
    publish = vi.fn();
    deactivate = vi.fn(async () => {
      this.active = false;
      this.connected = false;
    });
    forceDisconnect = vi.fn(() => {
      this.connected = false;
      this.onWebSocketClose?.();
    });
    constructor(options: unknown) {
      void options;
      instances.push(this);
    }
    activate() {
      this.active = true;
      this.connected = true;
      this.onConnect?.();
    }
    watchForReceipt(id: string, callback: () => void) {
      this.receipts.set(id, callback);
    }
    subscribe(
      destination: string,
      callback: (message: { body: string }) => void,
      headers: {
        receipt: string;
      },
    ) {
      void headers;
      this.subscriptions.set(destination, callback);
      return { unsubscribe: vi.fn() };
    }
  }
  const instances: FakeClient[] = [];
  return { get, Client: FakeClient, instances };
});
vi.mock("@stomp/stompjs", () => ({ Client: mock.Client }));
vi.mock("sockjs-client", () => ({ default: class SockJS {} }));
vi.mock("@/lib/api/rooms", () => ({ getRoomState: mock.get }));
const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
};
function harness() {
  let state = { ...initialRoomState };
  const dispatch = (event: RoomEvent) => {
    state = roomReducer(state, event);
  };
  const client = new RoomClient(
    {
      schemaVersion: 1,
      roomCode: "ABC234",
      nickname: "An",
      sessionToken: actionId,
    },
    0,
    dispatch,
    () => state,
  );
  return { client, state: () => state, fake: mock.instances.at(-1)! };
}
async function online() {
  const h = harness();
  await h.client.start();
  for (const receipt of h.fake.receipts.values()) {
    receipt();
  }
  await flush();
  expect(h.state().connection).toBe("online");
  return h;
}
beforeEach(() => {
  vi.useFakeTimers();
  mock.instances.length = 0;
  mock.get.mockReset().mockResolvedValue(view());
});
afterEach(() => {
  vi.useRealTimers();
});
it("does not sync before both subscriptions are registered", async () => {
  const h = harness();
  await h.client.start();
  expect(mock.get).toHaveBeenCalledTimes(1);
  const receipts = [...h.fake.receipts.values()];
  receipts[0]();
  await flush();
  expect(mock.get).toHaveBeenCalledTimes(1);
  receipts[1]();
  await flush();
  expect(mock.get).toHaveBeenCalledTimes(2);
  expect(h.state().connection).toBe("online");
  await h.client.stop();
});
it("ACK timeout synchronizes but never replays or infers success from a newer snapshot", async () => {
  const h = await online();
  h.client.send("vote", { vote: "JA" });
  mock.get.mockResolvedValue(view({ stateVersion: 5 }));
  await vi.advanceTimersByTimeAsync(8000);
  expect(h.fake.publish).toHaveBeenCalledTimes(1);
  expect(h.state().snapshot?.stateVersion).toBe(5);
  expect(h.state().notice).toContain("Chưa rõ");
  expect(h.state().pendingAction).toBeNull();
  await h.client.stop();
});
it("reconnect discards old callbacks and does not replay a pending command", async () => {
  const h = await online();
  const stale = [...h.fake.subscriptions.values()][0];
  h.client.send("vote", { vote: "JA" });
  h.fake.connected = false;
  h.fake.onWebSocketClose?.();
  stale({ body: JSON.stringify(view({ stateVersion: 100 })) });
  expect(h.state().snapshot?.stateVersion).toBe(1);
  mock.get.mockResolvedValue(view({ stateVersion: 2 }));
  h.fake.connected = true;
  h.fake.onConnect?.();
  for (const receipt of h.fake.receipts.values()) {
    receipt();
  }
  await flush();
  expect(h.state().connection).toBe("online");
  expect(h.fake.publish).toHaveBeenCalledTimes(1);
  expect(h.state().pendingAction).toBeNull();
  await h.client.stop();
});
it("expired-room polling clears private RAM and terminates the socket", async () => {
  const h = await online();
  mock.get.mockRejectedValue(
    new ApiError("ROOM_NOT_FOUND", "Phòng đã hết hạn.", 404),
  );
  await vi.advanceTimersByTimeAsync(15000);
  expect(h.state().connection).toBe("expired");
  expect(h.state().snapshot).toBeNull();
  expect(h.fake.deactivate).toHaveBeenCalledOnce();
});
it("initial network failure retries the same identity without creating a new member", async () => {
  mock.get
    .mockRejectedValueOnce(new ApiError("NETWORK_ERROR", "Mất mạng.", 0))
    .mockResolvedValue(view());
  const h = harness();
  await h.client.start();
  await vi.advanceTimersByTimeAsync(1000);
  expect(mock.get).toHaveBeenCalledTimes(2);
  expect(h.fake.active).toBe(true);
  await h.client.stop();
});
it("old polling cannot unlock a reconnected socket before subscription receipts", async () => {
  const h = await online();
  await vi.advanceTimersByTimeAsync(14000);
  h.fake.connected = false;
  h.fake.onWebSocketClose?.();
  h.fake.receipts.clear();
  h.fake.connected = true;
  h.fake.onConnect?.();
  await vi.advanceTimersByTimeAsync(1000);
  expect(mock.get).toHaveBeenCalledTimes(2);
  expect(h.state().connection).toBe("syncing");
  for (const receipt of h.fake.receipts.values()) {
    receipt();
  }
  await flush();
  expect(h.state().connection).toBe("online");
  await h.client.stop();
});
it("leave aborts every pending fetch, timer and old subscription callback", async () => {
  const h = await online();
  const stale = [...h.fake.subscriptions.values()][0];
  await h.client.stop();
  stale({ body: JSON.stringify(view({ stateVersion: 9 })) });
  await vi.advanceTimersByTimeAsync(30000);
  expect(mock.get).toHaveBeenCalledTimes(2);
  expect(h.state().snapshot?.stateVersion).toBe(1);
  expect(h.fake.deactivate).toHaveBeenCalledOnce();
});
