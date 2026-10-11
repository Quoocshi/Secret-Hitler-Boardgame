import {expect,type Page,type APIRequestContext} from "@playwright/test";
import {apiUrl} from "./fixtures";
import {ownState} from "./room";
export interface TimingSample {actionId:string;version:number;commitTime:number;recipients:string[];}
export interface ClockCalibration {offset:number;uncertainty:number;}
export async function observeRenders(page:Page){await page.evaluate(()=>{
 const renders:{version:number;time:number}[]=[];Object.assign(window,{testRenders:renders});let last=-1;
 const record=()=>{const node=document.querySelector('[data-testid="room-screen"]');const version=Number(node?.getAttribute("data-state-version"));if(!node||!Number.isSafeInteger(version)||version<=last)return;last=version;requestAnimationFrame(()=>{if(Number(node.getAttribute("data-state-version"))>=version)renders.push({version,time:performance.timeOrigin+performance.now()});});};
 new MutationObserver(record).observe(document.body,{attributes:true,subtree:true,attributeFilter:["data-state-version"]});record();
 });}
export async function calibrate(page:Page):Promise<ClockCalibration>{
 const readings=await page.evaluate(async url=>{const readings=[];for(let i=0;i<8;i++){const before=performance.timeOrigin+performance.now();const response=await fetch(url+"/__test/timing/time",{cache:"no-store"});if(!response.ok)throw new Error("Clock endpoint failed");const server=Number(await response.text());const after=performance.timeOrigin+performance.now();readings.push({offset:server-(before+after)/2,uncertainty:(after-before)/2+1});}return readings;},apiUrl);
 const best=readings.reduce((a,b)=>a.uncertainty<b.uncertainty?a:b);expect(best.uncertainty,"clock uncertainty must be bounded").toBeLessThan(50);return best;
}
export async function readyRecipients(pages:Page[],request:APIRequestContext,version:number){await Promise.all(pages.map(async page=>{
 const own=await ownState(page);expect(own.stateVersion).toBe(version);const token=await page.evaluate(()=>JSON.parse(localStorage.getItem("hboardgame.identity")!).sessionToken as string);
 const response=await request.post(apiUrl+"/__test/timing/"+own.roomCode+"/ready",{headers:{"X-Session-Token":token},data:{version}});expect(response.ok()).toBe(true);
}));}
export async function renders(page:Page):Promise<{version:number;time:number}[]>{return page.evaluate(()=>(window as unknown as {testRenders:{version:number;time:number}[]}).testRenders);}
