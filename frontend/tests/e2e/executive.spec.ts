import { expect,test } from "@playwright/test";
import { fixtureGroup,confirm } from "./support/fixtures";
import { ownState,syncGroup } from "./support/room";
test.setTimeout(120000);
for(const scenario of ["investigation","policy-peek","special-election","execution"])test(scenario+" uses only the assigned power and preserves private state across reload",async({browser,request})=>{
 const group=await fixtureGroup(browser,request,scenario,scenario==="investigation"?7:5);
 try {
  const [president,target,other]=group.pages;await syncGroup(group.pages);const identity=(await ownState(president)).myPlayerId;
  for(const p of group.pages.slice(1))await expect(p.getByRole("button",{name:"Đã xem",exact:true})).toHaveCount(0);
  if(scenario==="policy-peek"){
   await expect(president.getByTestId("hand-card")).toHaveCount(3);await expect(other.getByTestId("hand-card")).toHaveCount(0);
   await president.reload();await expect(president.getByTestId("connection")).toHaveText("Đã đồng bộ",{timeout:15000});await expect(president.getByTestId("hand-card")).toHaveCount(3);await president.getByRole("button",{name:"Đã xem",exact:true}).click();
  }else{
   await president.getByLabel("Mục tiêu quyền lực").selectOption(group.players[1].playerId);
   await confirm(president,scenario==="investigation"?"Điều tra đảng phái":scenario==="execution"?"Xử bắn":"Bầu cử đặc biệt");
  }
  await expect(president.getByTestId("phase")).toHaveAttribute("data-phase",scenario==="execution"?"GAME_OVER":"NOMINATION");
  if(scenario==="investigation"){
   await expect(president.getByTestId("investigations")).toContainText("Phát xít");await expect(other.getByTestId("investigations")).toHaveCount(0);
   await president.reload();await expect(president.getByTestId("connection")).toHaveText("Đã đồng bộ",{timeout:15000});expect((await ownState(president)).myPlayerId).toBe(identity);await expect(president.getByTestId("investigations")).toContainText("Phát xít");
   expect((await ownState(target)).investigationResults).toEqual([]);
  }
  if(scenario==="special-election")expect((await ownState(president)).currentPresidentId).toBe(group.players[1].playerId);
  if(scenario==="execution")expect((await ownState(target)).players.find(p=>p.id===group.players[1].playerId)?.isAlive).toBe(false);
 }finally{await group.close();}
});
