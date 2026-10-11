import type { Action,PlayerView } from "@/lib/game/types";
import { actionPermission } from "@/lib/game/permissions";
import { NominationActions } from "./NominationActions";
import { VotingActions } from "./VotingActions";
import { LegislativeActions } from "./LegislativeActions";
import { VetoActions } from "./VetoActions";
import { ExecutiveActions } from "./ExecutiveActions";
export function PhaseActions({snapshot:s,online,pending,onAction}:{snapshot:PlayerView;online:boolean;pending:boolean;onAction:(action:Action,payload?:Record<string,unknown>)=>void}) {
 if(s.currentPhase==="GAME_OVER")return null;
 const me=s.players.find(p=>p.id===s.myPlayerId)!;const enabled=(action:Action)=>actionPermission(s,action,online,pending).allowed;
 const president=s.myPlayerId===s.currentPresidentId,chancellor=s.myPlayerId===s.currentChancellorId;
 let content:React.ReactNode=<p>Đang chờ người được chỉ định hoàn thành hành động.</p>;
 if(!me.isAlive)content=<p>Bạn đã bị loại. Bạn có thể tiếp tục theo dõi bàn chơi.</p>;
 else if(s.currentPhase==="NOMINATION"&&president)content=<NominationActions snapshot={s} enabled={enabled("nominate")} onNominate={id=>onAction("nominate",{targetPlayerId:id})}/>;
 else if(s.currentPhase==="VOTING")content=<VotingActions snapshot={s} enabled={enabled("vote")} onVote={vote=>onAction("vote",{vote})}/>;
 else if(s.currentPhase==="LEGISLATIVE_PRESIDENT"&&president)content=<LegislativeActions snapshot={s} enabled={enabled("discard")} onAction={onAction}/>;
 else if(s.currentPhase==="LEGISLATIVE_CHANCELLOR"&&chancellor)content=<><LegislativeActions snapshot={s} enabled={enabled("enact")} onAction={onAction}/><VetoActions snapshot={s} enabled={enabled("veto/request")} onAction={onAction}/></>;
 else if(s.currentPhase==="VETO_CONFIRMATION"&&president)content=<VetoActions snapshot={s} enabled={enabled("veto/response")} onAction={onAction}/>;
 else if(s.currentPhase==="EXECUTIVE_ACTION"&&president&&s.pendingExecutiveAction!=="NONE"){
  const action:Action=s.pendingExecutiveAction==="POLICY_PEEK"?"end-action":s.pendingExecutiveAction==="EXECUTION"?"execute":s.pendingExecutiveAction==="SPECIAL_ELECTION"?"special-election":"investigate";
  content=<ExecutiveActions snapshot={s} enabled={enabled(action)} onAction={onAction}/>;
 }
 return <section className="panel action-panel"><p className="eyebrow">LƯỢT CỦA BẠN</p><h2>Hành động</h2>{content}</section>;
}
