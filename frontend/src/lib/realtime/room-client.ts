import { Client, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { config } from "@/lib/api/config";
import { decodePlayerView, SchemaError } from "@/lib/api/decoders";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { getRoomState, joinRoom } from "@/lib/api/rooms";
import {
  actionPermission,
  chancellorEligibility,
  executiveTargetEligibility,
} from "@/lib/game/permissions";
import type { Action, PlayerView, SessionIdentity } from "@/lib/game/types";
import { ACTION_TIMEOUT_MS, prepareCommand } from "./commands";
import type { ClientRoomState, Connection, RoomEvent } from "./room-reducer";

export const POLL_INTERVAL_MS = 2000;
export const REQUEST_TIMEOUT_MS = 5000;
const CONNECTION_TIMEOUT_MS = 8000;
const MAX_PRESENCE_REPAIRS = 2;

// Distribute Omit over the event union, preserving each event's own payload.
type RuntimeEvent<Event extends RoomEvent = RoomEvent> = Event extends RoomEvent
  ? Omit<Event, "generation">
  : never;

export class RoomClient {
  private readonly client: Client;
  private readonly lifetime = new AbortController();
  private requests = new AbortController();
  private stopped = false;
  private epoch = 0;
  private pushSequence = 0;
  private expectedPlayerId: string | null = null;
  private presenceRepairs = 0;
  private retryCount = 0;
  private pollTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private actionTimer?: ReturnType<typeof setTimeout>;
  private subscription?: StompSubscription;
  private reading = false;

  constructor(
    private readonly identity: SessionIdentity,
    private readonly generation: number,
    private readonly dispatch: (event: RoomEvent) => void,
    private readonly state: () => ClientRoomState,
  ) {
    this.client = new Client({
      webSocketFactory: () => new SockJS(config.wsUrl),
      connectHeaders: {
        "Room-Code": identity.roomCode,
        "X-Session-Token": identity.sessionToken,
      },
      reconnectDelay: 1000,
      // The legacy simple broker does not negotiate server heartbeats.
      heartbeatIncoming: 0,
      heartbeatOutgoing: 0,
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      discardWebsocketOnCommFailure: true,
      debug: () => {},
    });
    this.client.onConnect = () => {
      void this.connected();
    };
    this.client.onWebSocketClose = () => this.disconnected();
    this.client.onStompError = () => {
      this.emit({ type: "uncertain" });
      this.connection(
        "reconnecting",
        "Máy chủ chưa xử lý được yêu cầu. Đang đồng bộ lại; thao tác không tự gửi lại.",
      );
      this.client.forceDisconnect();
    };
  }

  private emit(event: RuntimeEvent) {
    if (!this.stopped) {
      this.dispatch({ ...event, generation: this.generation } as RoomEvent);
    }
  }

  private connection(connection: Connection, notice?: string) {
    this.emit({ type: "connection", connection, notice });
  }

  private signal(): AbortSignal {
    return AbortSignal.any([
      this.lifetime.signal,
      this.requests.signal,
      AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ]);
  }

  private isCurrent(epoch: number) {
    return !this.stopped && epoch === this.epoch;
  }

  private verifyIdentity(snapshot: PlayerView) {
    if (
      snapshot.roomCode !== this.identity.roomCode ||
      (this.expectedPlayerId && snapshot.myPlayerId !== this.expectedPlayerId)
    ) {
      throw new SchemaError();
    }
    this.expectedPlayerId = snapshot.myPlayerId;
  }

  async start() {
    this.connection("restoring");
    const epoch = ++this.epoch;
    try {
      // Unknown-token /join creates a member in a lobby: GET must verify membership first.
      const snapshot = await getRoomState(
        this.identity.roomCode,
        this.identity.sessionToken,
        this.signal(),
      );
      if (!this.isCurrent(epoch)) {
        return;
      }
      this.verifyIdentity(snapshot);
      this.emit({ type: "snapshot", snapshot });
      this.connection("connecting");
      this.client.activate();
    } catch (error) {
      if (this.isCurrent(epoch)) {
        this.fail(error);
      }
    }
  }

  private async connected() {
    this.clearPoll();
    this.requests.abort();
    this.requests = new AbortController();
    this.reading = false;
    const epoch = ++this.epoch;
    this.pushSequence = 0;
    this.presenceRepairs = 0;
    this.connection("syncing");
    this.subscription = this.client.subscribe(
      `/queue/room/${this.identity.roomCode}/state/${this.identity.sessionToken}`,
      (message) => {
        if (!this.isCurrent(epoch)) {
          return;
        }
        try {
          const snapshot = decodePlayerView(JSON.parse(message.body));
          this.verifyIdentity(snapshot);
          this.pushSequence++;
          this.emit({ type: "snapshot", snapshot });
          this.clearFinishedActionTimer();
          if (
            !snapshot.players.find(
              (player) => player.id === snapshot.myPlayerId,
            )?.isConnected
          ) {
            this.connection("syncing");
          }
        } catch (error) {
          this.fail(error);
        }
      },
    );
    try {
      const membership = await getRoomState(
        this.identity.roomCode,
        this.identity.sessionToken,
        this.signal(),
      );
      if (!this.isCurrent(epoch)) {
        return;
      }
      this.verifyIdentity(membership);
      await this.restorePresence(epoch);
      if (this.isCurrent(epoch)) {
        await this.refresh(epoch);
      }
    } catch (error) {
      if (this.isCurrent(epoch)) {
        this.fail(error);
      }
    } finally {
      if (this.isCurrent(epoch)) {
        this.schedulePoll(epoch);
      }
    }
  }

  private async restorePresence(epoch: number) {
    // start() already verified membership; do not change identity or replay game actions.
    const response = await joinRoom(
      this.identity.roomCode,
      this.identity.nickname,
      this.identity.sessionToken,
      this.signal(),
    );
    if (this.isCurrent(epoch)) {
      this.verifyIdentity(response.gameState);
    }
  }

  private async refresh(epoch: number) {
    if (!this.isCurrent(epoch) || this.reading) {
      return;
    }
    this.reading = true;
    const pushAtStart = this.pushSequence;
    try {
      const snapshot = await getRoomState(
        this.identity.roomCode,
        this.identity.sessionToken,
        this.signal(),
      );
      if (!this.isCurrent(epoch)) {
        return;
      }
      this.verifyIdentity(snapshot);
      if (pushAtStart !== this.pushSequence) {
        return;
      }
      this.emit({ type: "snapshot", snapshot });
      this.clearFinishedActionTimer();
      const ownPlayer = snapshot.players.find(
        (player) => player.id === snapshot.myPlayerId,
      );
      if (!ownPlayer?.isConnected) {
        if (this.presenceRepairs >= MAX_PRESENCE_REPAIRS) {
          this.connection(
            "error",
            "Phiên liên tục bị ngắt ở máy chủ. Hãy đóng phiên khác rồi kết nối lại.",
          );
          await this.stop();
          return;
        }
        this.connection("syncing");
        this.presenceRepairs++;
        await this.restorePresence(epoch);
        return;
      }
      this.retryCount = 0;
      this.connection("online");
    } finally {
      if (this.isCurrent(epoch)) {
        this.reading = false;
      }
    }
  }

  private schedulePoll(epoch: number) {
    this.clearPoll();
    this.pollTimer = setTimeout(async () => {
      try {
        await this.refresh(epoch);
      } catch (error) {
        if (this.isCurrent(epoch)) {
          this.fail(error);
        }
      } finally {
        if (this.isCurrent(epoch) && this.client.connected) {
          this.schedulePoll(epoch);
        }
      }
    }, POLL_INTERVAL_MS);
  }

  private clearPoll() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    this.pollTimer = undefined;
  }

  private clearFinishedActionTimer() {
    if (!this.state().pendingAction && this.actionTimer) {
      clearTimeout(this.actionTimer);
    }
  }

  private disconnected() {
    if (this.stopped) {
      return;
    }
    this.epoch++;
    this.requests.abort();
    this.requests = new AbortController();
    this.clearPoll();
    this.subscription = undefined;
    if (this.state().pendingAction) {
      this.emit({ type: "uncertain" });
    }
    this.connection(
      "reconnecting",
      "Mất kết nối. Đang khôi phục cùng phiên; thao tác không tự gửi lại.",
    );
    this.client.reconnectDelay = Math.min(8000, 1000 * 2 ** this.retryCount++);
  }

  private fail(error: unknown) {
    if (this.stopped) {
      return;
    }
    if (
      error instanceof ApiError &&
      ["INVALID_SESSION", "ROOM_NOT_FOUND"].includes(error.code)
    ) {
      this.emit({ type: "reset" });
      this.connection("expired", errorMessage(error));
      void this.stop();
      return;
    }
    if (error instanceof SchemaError || error instanceof SyntaxError) {
      this.emit({ type: "reset" });
      this.connection(
        "error",
        "Dữ liệu phòng chưa hợp lệ. Hãy kết nối lại hoặc rời phòng.",
      );
      void this.stop();
      return;
    }
    this.emit({ type: "uncertain" });
    this.connection("reconnecting", errorMessage(error));
    if (this.client.active) {
      this.client.forceDisconnect();
    } else {
      this.retryTimer = setTimeout(
        () => {
          void this.start();
        },
        Math.min(8000, 1000 * 2 ** this.retryCount++),
      );
    }
  }

  send(action: Action, payload: Record<string, unknown> = {}) {
    const current = this.state();
    const snapshot = current.snapshot;
    if (!snapshot || !this.client.connected || this.stopped) {
      throw new Error("Kết nối chưa sẵn sàng.");
    }
    const permission = actionPermission(
      snapshot,
      action,
      current.connection === "online",
      !!(current.pendingAction || current.uncertainAction),
      current.vetoKnowledge,
    );
    if (!permission.allowed) {
      throw new Error(permission.reason);
    }
    if (
      action === "nominate" &&
      !chancellorEligibility(snapshot, String(payload.targetPlayerId)).allowed
    ) {
      throw new Error("Ứng viên không hợp lệ.");
    }
    if (
      ["execute", "investigate", "special-election"].includes(action) &&
      !executiveTargetEligibility(snapshot, String(payload.targetPlayerId))
        .allowed
    ) {
      throw new Error("Mục tiêu không hợp lệ.");
    }
    if (
      ["discard", "enact"].includes(action) &&
      (!Number.isInteger(payload.policyIndex) ||
        Number(payload.policyIndex) < 0 ||
        Number(payload.policyIndex) >= snapshot.handCards.length)
    ) {
      throw new Error("Vị trí lá bài không hợp lệ.");
    }
    if (action === "vote" && !["JA", "NEIN"].includes(String(payload.vote))) {
      throw new Error("Phiếu không hợp lệ.");
    }
    if (action === "veto/response" && typeof payload.approve !== "boolean") {
      throw new Error("Phản hồi veto không hợp lệ.");
    }

    const pending = prepareCommand(snapshot, action);
    this.emit({ type: "pending", pending });
    this.actionTimer = setTimeout(() => {
      if (this.state().pendingAction?.localId === pending.localId) {
        this.emit({ type: "uncertain" });
      }
    }, ACTION_TIMEOUT_MS);
    try {
      this.client.publish({
        destination: `/app/room/${this.identity.roomCode}/${action}`,
        headers: {
          "X-Session-Token": this.identity.sessionToken,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch {
      this.emit({ type: "uncertain" });
      throw new Error(
        "Chưa xác định được yêu cầu đã gửi hay chưa. Hãy đồng bộ; không tự gửi lại.",
      );
    }
  }

  async stop() {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    this.epoch++;
    this.lifetime.abort();
    this.requests.abort();
    this.clearPoll();
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
    }
    if (this.client.connected) {
      try {
        this.subscription?.unsubscribe();
      } catch {
        /* Closing transport also removes subscriptions. */
      }
    }
    await this.client.deactivate({ force: true });
  }
}
