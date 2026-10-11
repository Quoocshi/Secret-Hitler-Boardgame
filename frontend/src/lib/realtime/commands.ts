import type { Action } from "@/lib/game/types";
import type { ClientRoomState,PendingAction } from "./room-reducer";
export function prepareCommand(state:ClientRoomState,action:Action):PendingAction {
 if(state.connection!=="online" || !state.snapshot || state.pendingAction || state.snapshot.currentPhase==="GAME_OVER")throw new Error("Hãy chờ phòng đồng bộ trước khi thao tác.");
 return {actionId:crypto.randomUUID(),action,expectedVersion:state.snapshot.stateVersion,startedAt:Date.now()};
}
