"use client";
import { useRoomSession } from "./RoomSessionProvider";
import { Lobby } from "./Lobby";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { GameScreen } from "@/features/game/GameScreen";
import { GameOverPanel } from "@/features/game/GameOverPanel";
import { ConnectionBanner,connectionLabels } from "./ConnectionBanner";
import { LeaveButton } from "./LeaveButton";
export function RoomScreen({roomCode}:{roomCode:string}) {
 const {state,send,leave,retry}=useRoomSession();const s=state.snapshot;
 return <main className="room-layout" data-testid="room-screen" data-player-id={s?.myPlayerId} data-state-version={s?.stateVersion}><header className="room-header"><span className="brand">SECRET HITLER</span><span>Phòng <strong data-testid="room-code">{roomCode}</strong></span><span className="connection" data-testid="connection">{connectionLabels[state.connection]}</span><LeaveButton onLeave={leave} disabled={state.connection==="leaving"}/></header>
 <ConnectionBanner connection={state.connection} onRetry={()=>{void retry();}}/><StatusNotice message={state.notice} error={["error","expired","duplicate"].includes(state.connection)}/>
 {!s?<p role="status">{["expired","error","duplicate"].includes(state.connection)?"Hãy quay về trang đầu để tạo hoặc vào phòng.":"Đang khôi phục phòng…"}</p>:s.currentPhase==="LOBBY"?<Lobby snapshot={s} enabled={state.connection==="online"&&!state.pendingAction} onStart={()=>send("start")}/>:s.currentPhase==="GAME_OVER"?<GameOverPanel snapshot={s} onLeave={leave}/>:<GameScreen snapshot={s} online={state.connection==="online"} pending={!!state.pendingAction} onAction={send}/>}
 {state.pendingAction&&<p role="status">Đang chờ máy chủ xác nhận…</p>}
 </main>;
}
