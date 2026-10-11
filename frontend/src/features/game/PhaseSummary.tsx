import type { PlayerView } from "@/lib/game/types";
import { phaseLabels,executiveLabels } from "@/lib/game/labels";
export function PhaseSummary({snapshot:s}:{snapshot:PlayerView}) {
 const name=(id:string|null)=>s.players.find(p=>p.id===id)?.nickname??"Chưa có";
 const who=s.currentPhase==="LEGISLATIVE_CHANCELLOR"?name(s.currentChancellorId):name(s.currentPresidentId);
 const waiting=s.currentPhase==="VOTING"?"Đang chờ mọi người còn sống bỏ phiếu.":s.currentPhase==="GAME_OVER"?"Ván đã kết thúc.":`Đang chờ ${who}: ${s.currentPhase==="EXECUTIVE_ACTION"?executiveLabels[s.pendingExecutiveAction]:phaseLabels[s.currentPhase].toLowerCase()}.`;
 return <section className="phase-summary" data-testid="phase" data-phase={s.currentPhase}><p className="eyebrow">GIAI ĐOẠN HIỆN TẠI</p><h1>{phaseLabels[s.currentPhase]}</h1><p>{waiting}</p><div className="office-summary"><span>Tổng thống: <strong>{name(s.currentPresidentId)}</strong></span><span>Thủ tướng{s.currentPhase==="VOTING"?" được đề cử":""}: <strong>{name(s.nominatedChancellorId??s.currentChancellorId)}</strong></span></div></section>;
}
