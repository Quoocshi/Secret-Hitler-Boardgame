import type { PlayerView,Vote } from "@/lib/game/types";
import { Button } from "@/components/ui/Button";
export function VotingActions({snapshot:s,enabled,onVote}:{snapshot:PlayerView;enabled:boolean;onVote:(vote:Vote)=>void}) {
 const me=s.players.find(p=>p.id===s.myPlayerId)!;const voters=s.players.filter(p=>p.isAlive);
 return <><p>{voters.filter(p=>p.hasVoted).length}/{voters.length} người đã bỏ phiếu.</p><div className="vote-buttons"><Button className="vote-ja" disabled={!enabled} onClick={()=>onVote("JA")}>JA — Đồng ý</Button><Button className="vote-nein" disabled={!enabled} onClick={()=>onVote("NEIN")}>NEIN — Phản đối</Button></div><p>{me.hasVoted?"Bạn đã bỏ phiếu. Có thể đổi trước khi vòng chốt.":"Phiếu được giữ kín đến khi mọi người còn sống đã bỏ phiếu."}</p></>;
}
