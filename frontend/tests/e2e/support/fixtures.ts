import { expect,type Browser,type Page,type APIRequestContext,type BrowserContext } from "@playwright/test";
import type { SessionIdentity } from "../../../src/lib/game/types";
export const apiUrl=process.env.E2E_API_URL??"http://localhost:8081";
export interface FixtureRoom {roomCode:string;players:{nickname:string;sessionToken:string;playerId:string}[];}
export async function fixture(request:APIRequestContext,scenario:string,count=5):Promise<FixtureRoom> {
 const response=await request.post(apiUrl+"/__test/fixtures",{data:{scenario,playerCount:count}});expect(response.ok()).toBe(true);return response.json();
}
export async function seed(request:APIRequestContext,code:string,scenario:string){const response=await request.post(apiUrl+"/__test/fixtures/"+code,{data:{scenario}});expect(response.ok()).toBe(true);}
export async function fixtureGroup(browser:Browser,request:APIRequestContext,scenario:string,count=5,setup?:(context:BrowserContext,index:number)=>Promise<void>) {
 const data=await fixture(request,scenario,count);const contexts=await Promise.all(data.players.map(()=>browser.newContext()));
 const pages=await Promise.all(contexts.map(c=>c.newPage()));
 if(setup)for(let i=0;i<count;i++)await setup(contexts[i],i);
 for(let i=0;i<pages.length;i++){
  const player=data.players[i],identity:SessionIdentity={schemaVersion:1,sessionToken:player.sessionToken,roomCode:data.roomCode,nickname:player.nickname};
  await pages[i].goto("/");
  await pages[i].evaluate(id=>{localStorage.setItem("hboardgame.identity",JSON.stringify(id));localStorage.setItem("hboardgame.nickname",id.nickname);},identity);
  await pages[i].goto("/room/"+data.roomCode);await expect(pages[i].getByTestId("connection")).toHaveText("Đã đồng bộ",{timeout:15000});
 }
 return {...data,contexts,pages,close:async()=>{await Promise.all(contexts.map(c=>c.close()));}};
}
export async function confirm(page:Page,name:string){await page.getByRole("button",{name,exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"Xác nhận",exact:true}).click();}
