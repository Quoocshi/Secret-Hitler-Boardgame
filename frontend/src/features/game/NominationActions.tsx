"use client";
import { useState } from "react";
import type { PlayerView } from "@/lib/game/types";
import { chancellorEligibility } from "@/lib/game/permissions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
export function NominationActions({snapshot:s,enabled,onNominate}:{snapshot:PlayerView;enabled:boolean;onNominate:(id:string)=>void}) {
 const [selected,setSelected]=useState(""),[confirm,setConfirm]=useState(false);const target=s.players.find(p=>p.id===selected);
 return <><label htmlFor="nominee">Ứng viên Thủ tướng</label><select id="nominee" value={selected} onChange={e=>setSelected(e.target.value)} disabled={!enabled}><option value="">Chọn người đủ điều kiện</option>{s.players.map(p=>{const permission=chancellorEligibility(s,p.id);return <option key={p.id} value={p.id} disabled={!permission.allowed}>{p.nickname}{permission.allowed?"":` — ${permission.reason}`}</option>;})}</select><Button className="primary full" disabled={!enabled||!target||!chancellorEligibility(s,selected).allowed} onClick={()=>setConfirm(true)}>Đề cử</Button>{confirm&&target&&<ConfirmDialog title="Xác nhận đề cử" onCancel={()=>setConfirm(false)} onConfirm={()=>{setConfirm(false);onNominate(selected);}}><p>Đề cử <strong>{target.nickname}</strong> làm Thủ tướng?</p></ConfirmDialog>}</>;
}
