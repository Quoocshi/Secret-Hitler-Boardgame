"use client";
import { useState } from "react";
import type { PlayerView } from "@/lib/game/types";
import { policyLabels } from "@/lib/game/labels";
import { Button } from "@/components/ui/Button";
export function PrivateInfoPanel({snapshot:s}:{snapshot:PlayerView}) {
 const [open,setOpen]=useState(false);const allies=s.knownAllyIds.filter(id=>id!==s.myPlayerId).map(id=>s.players.find(p=>p.id===id)?.nickname).filter(Boolean);
 return <section className="panel private-panel" data-testid="private-info"><p className="eyebrow">CHỈ BẠN ĐƯỢC XEM</p><h2>Thông tin riêng</h2><Button aria-expanded={open} aria-controls="private-role" onClick={()=>setOpen(!open)}>{open?"Ẩn vai trò riêng":"Xem vai trò riêng"}</Button>{open&&<div id="private-role"><p>Vai trò của bạn: <strong>{s.myRole==="HITLER"?"Hitler":s.myRole?policyLabels[s.myRole]:"Chưa chia vai"}</strong></p><p>Đồng minh được biết: {allies.length?allies.join(", "):"Không có thông tin."}</p></div>}{s.investigationResults.length>0&&<div data-testid="investigations"><h3>Kết quả điều tra riêng</h3><ul>{s.investigationResults.map(result=><li key={result.investigationId}>{s.players.find(p=>p.id===result.targetPlayerId)?.nickname}: <strong>{policyLabels[result.partyMembership]}</strong></li>)}</ul></div>}<p className="privacy-note">Giữ kín màn hình khi xem thông tin này.</p></section>;
}
