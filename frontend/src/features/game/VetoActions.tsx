"use client";
import { useState } from "react";
import type { Action,PlayerView } from "@/lib/game/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
export function VetoActions({snapshot:s,enabled,onAction}:{snapshot:PlayerView;enabled:boolean;onAction:(action:Action,payload?:Record<string,unknown>)=>void}) {
 const [confirm,setConfirm]=useState<"request"|"approve"|"reject"|null>(null);const responding=s.currentPhase==="VETO_CONFIRMATION";
 if(!responding&&s.enactedFascistPolicies<5)return null;
 const title=confirm==="request"?"Yêu cầu veto":confirm==="approve"?"Đồng ý veto":"Từ chối veto";
 return <div className="veto-actions">{responding?<><p>Thủ tướng đề nghị hủy cả hai lá. Đồng ý sẽ tăng bộ đếm bầu cử.</p><Button disabled={!enabled} onClick={()=>setConfirm("approve")}>Đồng ý veto</Button><Button disabled={!enabled} onClick={()=>setConfirm("reject")}>Từ chối veto</Button></>:<><Button className="full" disabled={!enabled||s.vetoRequestedThisRound} onClick={()=>setConfirm("request")}>Yêu cầu veto</Button>{s.vetoRequestedThisRound&&<p>Veto đã được yêu cầu trong lượt này. Hãy chọn một chính sách để ban hành.</p>}</>}
 {confirm&&<ConfirmDialog title={title} onCancel={()=>setConfirm(null)} onConfirm={()=>{const choice=confirm;setConfirm(null);onAction(choice==="request"?"veto/request":"veto/response",choice==="request"?{}:{approve:choice==="approve"});}}><p>{confirm==="reject"?"Thủ tướng sẽ phải ban hành một trong hai lá và không thể yêu cầu veto lần nữa trong lượt này.":"Nếu Tổng thống đồng ý, cả hai lá bị hủy; bộ đếm bầu cử tăng và có thể kích hoạt chính sách tự động."}</p></ConfirmDialog>}
 </div>;
}
