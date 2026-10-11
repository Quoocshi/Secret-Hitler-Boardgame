import {expect,test} from "@playwright/test";
import {createGroup,syncGroup,ownState,actorPage,voteAll} from "./support/room";
import {confirm} from "./support/fixtures";
import {chancellorEligibility,executiveTargetEligibility} from "../../src/lib/game/permissions";
test.setTimeout(240000);
for(const count of [5,10] as const)test("complete unseeded UI game with "+count+" players",async({browser})=>{
 const group=await createGroup(browser,count);
 try{
  const roles=new Map(await Promise.all(group.pages.map(async p=>{const s=await ownState(p);return [s.myPlayerId,s.myRole] as const;})));
  let steps=0;
  for(;steps<70;steps++){
   const s=await syncGroup(group.pages);if(s.currentPhase==="GAME_OVER")break;
   const president=await actorPage(group.pages,s.currentPresidentId);
   if(s.currentPhase==="NOMINATION"){
    const candidate=s.players.find(p=>chancellorEligibility(s,p.id).allowed&&roles.get(p.id)!=="HITLER");expect(candidate).toBeTruthy();await president.getByLabel("Ứng viên Thủ tướng").selectOption(candidate!.id);await confirm(president,"Đề cử");
   }else if(s.currentPhase==="VOTING"){
    const voters=[];for(const p of group.pages){const own=await ownState(p);if(s.players.find(player=>player.id===own.myPlayerId)?.isAlive)voters.push(p);}await voteAll(voters,"JA");
   }
   else if(s.currentPhase==="LEGISLATIVE_PRESIDENT"||s.currentPhase==="LEGISLATIVE_CHANCELLOR"){
    const actor=s.currentPhase==="LEGISLATIVE_PRESIDENT"?president:await actorPage(group.pages,s.currentChancellorId);const hand=(await ownState(actor)).handCards;const desired=s.currentPhase==="LEGISLATIVE_PRESIDENT"?"FASCIST":"LIBERAL";const index=Math.max(0,hand.indexOf(desired));await actor.getByTestId("hand-card").nth(index).click();await confirm(actor,s.currentPhase==="LEGISLATIVE_PRESIDENT"?"Bỏ lá đã chọn":"Ban hành lá đã chọn");
   }else if(s.currentPhase==="EXECUTIVE_ACTION"){
    if(s.pendingExecutiveAction==="POLICY_PEEK")await president.getByRole("button",{name:"Đã xem",exact:true}).click();
    else{
     const targets=s.players.filter(p=>executiveTargetEligibility(s,p.id).allowed);const target=s.pendingExecutiveAction==="EXECUTION"?(targets.find(p=>roles.get(p.id)==="HITLER")??targets[0]):targets[0];expect(target).toBeTruthy();await president.getByLabel("Mục tiêu quyền lực").selectOption(target.id);await confirm(president,s.pendingExecutiveAction==="EXECUTION"?"Xử bắn":s.pendingExecutiveAction==="SPECIAL_ELECTION"?"Bầu cử đặc biệt":"Điều tra đảng phái");
    }
   }else throw new Error("Unexpected full-game phase "+s.currentPhase);
  }
  expect(steps).toBeLessThan(70);const result=await syncGroup(group.pages);expect(result.currentPhase).toBe("GAME_OVER");for(const p of group.pages)await expect(p.getByTestId("win-reason")).toHaveText(result.winReason!);
  console.log("Full game",count,"players",steps,"UI phase steps");
 }finally{await group.close();}
});
