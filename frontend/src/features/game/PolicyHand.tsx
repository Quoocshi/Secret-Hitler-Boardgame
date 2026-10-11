import type { Policy } from "@/lib/game/types";
import { policyLabels } from "@/lib/game/labels";
export function PolicyHand({cards,selected,onSelect,enabled=true}:{cards:Policy[];selected?:number|null;onSelect?:(index:number)=>void;enabled?:boolean}) {
 return <div className="policy-hand" aria-label="Lá chính sách riêng">{cards.map((card,index)=>onSelect?<button key={index} data-testid="hand-card" className={`policy-card ${card==="LIBERAL"?"liberal-card":"fascist-card"} ${selected===index?"selected":""}`} aria-pressed={selected===index} disabled={!enabled} onClick={()=>onSelect(index)} aria-label={`Lá ${index+1} — ${policyLabels[card]}`}><span>LÁ {index+1}</span><strong>{policyLabels[card]}</strong>{selected===index&&<small>Đã chọn</small>}</button>:<div key={index} data-testid="hand-card" className={`policy-card ${card==="LIBERAL"?"liberal-card":"fascist-card"}`}><span>LÁ {index+1}</span><strong>{policyLabels[card]}</strong></div>)}</div>;
}
