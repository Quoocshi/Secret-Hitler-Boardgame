import type { Action, CommandResult, PlayerView } from "@/lib/game/types";
export type Connection =
  | "idle"
  | "restoring"
  | "connecting"
  | "syncing"
  | "online"
  | "reconnecting"
  | "duplicate"
  | "expired"
  | "error"
  | "leaving";
export interface PendingAction {
  actionId: string;
  action: Action;
  expectedVersion: number;
  startedAt: number;
  acceptedVersion?: number;
}
export interface ClientRoomState {
  generation: number;
  connection: Connection;
  snapshot: PlayerView | null;
  pendingAction: PendingAction | null;
  notice: string | null;
}
export const initialRoomState: ClientRoomState = {
  generation: 0,
  connection: "idle",
  snapshot: null,
  pendingAction: null,
  notice: null,
};
export type RoomEvent =
  | {
      type: "reset";
      generation: number;
    }
  | {
      type: "connection";
      connection: Connection;
      generation: number;
      notice?: string;
    }
  | {
      type: "snapshot";
      snapshot: PlayerView;
      generation: number;
    }
  | {
      type: "pending";
      pending: PendingAction;
      generation: number;
    }
  | {
      type: "result";
      result: CommandResult;
      generation: number;
    }
  | {
      type: "uncertain";
      generation: number;
    }
  | {
      type: "notice";
      notice: string | null;
      generation: number;
    };
export function roomReducer(
  state: ClientRoomState,
  event: RoomEvent,
): ClientRoomState {
  if (event.type === "reset") {
    return { ...initialRoomState, generation: event.generation };
  }
  if (event.generation !== state.generation) {
    return state;
  }
  if (event.type === "connection") {
    return {
      ...state,
      connection: event.connection,
      notice: event.notice ?? state.notice,
    };
  }
  if (event.type === "notice") {
    return { ...state, notice: event.notice };
  }
  if (event.type === "uncertain") {
    return {
      ...state,
      pendingAction: null,
      connection: "syncing",
      notice:
        "Chưa rõ kết quả thao tác. Đang đồng bộ; thao tác không được gửi lại tự động.",
    };
  }
  if (event.type === "pending") {
    return { ...state, pendingAction: event.pending, notice: null };
  }
  if (event.type === "snapshot") {
    if (
      state.snapshot &&
      (event.snapshot.roomCode !== state.snapshot.roomCode ||
        event.snapshot.myPlayerId !== state.snapshot.myPlayerId)
    ) {
      return {
        ...state,
        connection: "error",
        notice: "Danh tính phòng không khớp.",
      };
    }
    if (
      state.snapshot &&
      event.snapshot.stateVersion < state.snapshot.stateVersion
    ) {
      return state;
    }
    const pending = state.pendingAction;
    const complete =
      pending?.acceptedVersion !== undefined &&
      event.snapshot.stateVersion >= pending.acceptedVersion;
    return {
      ...state,
      snapshot: event.snapshot,
      pendingAction: complete ? null : pending,
      notice: complete ? "Thao tác đã được máy chủ xác nhận." : state.notice,
    };
  }
  if (event.type === "result") {
    if (
      !state.pendingAction ||
      state.pendingAction.actionId !== event.result.actionId ||
      state.pendingAction.action !== event.result.action
    ) {
      return state;
    }
    if (event.result.status === "REJECTED") {
      return {
        ...state,
        pendingAction: null,
        notice: event.result.message ?? "Thao tác chưa được chấp nhận.",
      };
    }
    const complete =
      !!state.snapshot &&
      state.snapshot.stateVersion >= event.result.stateVersion;
    return {
      ...state,
      pendingAction: complete
        ? null
        : {
            ...state.pendingAction,
            acceptedVersion: event.result.stateVersion,
          },
      notice: complete ? "Thao tác đã được máy chủ xác nhận." : state.notice,
    };
  }
  return state;
}
