import type { PlayerView, VetoKnowledge } from "@/lib/game/types";
import { actionContextEnded, type PendingAction } from "./commands";

export type Connection =
  | "idle"
  | "restoring"
  | "connecting"
  | "syncing"
  | "online"
  | "reconnecting"
  | "duplicate"
  | "expired"
  | "removed"
  | "error"
  | "leaving";
export interface ClientRoomState {
  generation: number;
  connection: Connection;
  snapshot: PlayerView | null;
  pendingAction: PendingAction | null;
  uncertainAction: PendingAction | null;
  viewRevision: number;
  vetoKnowledge: VetoKnowledge;
  notice: string | null;
}
export const initialRoomState: ClientRoomState = {
  generation: 0,
  connection: "idle",
  snapshot: null,
  pendingAction: null,
  uncertainAction: null,
  viewRevision: 0,
  vetoKnowledge: "unknown",
  notice: null,
};
export type RoomEvent =
  | { type: "reset"; generation: number }
  | {
      type: "connection";
      connection: Connection;
      generation: number;
      notice?: string;
    }
  | { type: "snapshot"; snapshot: PlayerView; generation: number }
  | { type: "pending"; pending: PendingAction; generation: number }
  | { type: "uncertain"; generation: number }
  | { type: "notice"; notice: string | null; generation: number };

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
  switch (event.type) {
    case "connection":
      return {
        ...state,
        connection: event.connection,
        // A reconnect can miss an entire government; old veto observations are no longer reliable.
        vetoKnowledge:
          event.connection === "reconnecting" ? "unknown" : state.vetoKnowledge,
        notice: event.notice ?? state.notice,
      };
    case "notice":
      return { ...state, notice: event.notice };
    case "pending":
      return { ...state, pendingAction: event.pending, notice: null };
    case "uncertain":
      return {
        ...state,
        uncertainAction: state.pendingAction ?? state.uncertainAction,
        pendingAction: null,
        notice:
          "Chưa xác định được kết quả. Hãy đồng bộ trước khi quyết định tiếp; thao tác không tự gửi lại.",
      };
    case "snapshot": {
      const previous = state.snapshot;
      if (
        previous &&
        (event.snapshot.roomCode !== previous.roomCode ||
          event.snapshot.myPlayerId !== previous.myPlayerId)
      ) {
        return {
          ...state,
          snapshot: null,
          connection: "error",
          notice: "Danh tính phòng không khớp.",
        };
      }
      const changed =
        JSON.stringify(previous) !== JSON.stringify(event.snapshot);
      const contextEnded =
        !!state.pendingAction &&
        changed &&
        actionContextEnded(
          event.snapshot,
          state.pendingAction.action,
          state.pendingAction.targetPlayerId,
        );
      let vetoKnowledge = state.vetoKnowledge;
      if (event.snapshot.currentPhase === "VETO_CONFIRMATION") {
        vetoKnowledge = "observed-requested";
      }
      if (
        ["LOBBY", "NOMINATION", "LEGISLATIVE_PRESIDENT", "GAME_OVER"].includes(
          event.snapshot.currentPhase,
        )
      ) {
        vetoKnowledge = "unknown";
      }
      return {
        ...state,
        snapshot: event.snapshot,
        viewRevision: state.viewRevision + Number(changed),
        vetoKnowledge,
        pendingAction: contextEnded ? null : state.pendingAction,
        notice: contextEnded ? "Bàn chơi đã cập nhật." : state.notice,
      };
    }
  }
}
