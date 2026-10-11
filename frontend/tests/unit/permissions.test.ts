import { expect,it } from "vitest";
import { actionPermission,chancellorEligibility } from "@/lib/game/permissions";
import { view } from "../support/view";
import type { PublicPlayer } from "@/lib/game/types";
const people=Array.from({length:6},(_,i):PublicPlayer=>({id:"p"+(i+1),nickname:"P"+i,isAlive:true,isHost:i===0,isConnected:true,isInvestigated:false,hasVoted:false,lastRevealedVote:null}));
it("mirrors term limits based on alive count and excludes president",()=>{
 const s=view({players:people,currentPhase:"NOMINATION",currentPresidentId:"p1",lastElectedPresidentId:"p2",lastElectedChancellorId:"p3"});
 expect(chancellorEligibility(s,"p1").allowed).toBe(false);expect(chancellorEligibility(s,"p2").allowed).toBe(false);expect(chancellorEligibility(s,"p3").allowed).toBe(false);expect(chancellorEligibility(s,"p4").allowed).toBe(true);
 s.players=people.map((p,i)=>({...p,isAlive:i!==5}));expect(chancellorEligibility(s,"p2").allowed).toBe(true);
});
it("allows exactly the legislative actor and gates veto by count and round flag",()=>{
 const s=view({players:people,currentPresidentId:"p1",currentChancellorId:"p2",currentPhase:"LEGISLATIVE_PRESIDENT",handCards:["FASCIST","FASCIST","LIBERAL"]});
 expect(actionPermission(s,"discard",true,false).allowed).toBe(true);
 s.currentPhase="LEGISLATIVE_CHANCELLOR";s.myPlayerId="p2";s.handCards=["FASCIST","LIBERAL"];
 expect(actionPermission(s,"enact",true,false).allowed).toBe(true);
 expect(actionPermission(s,"veto/request",true,false).allowed).toBe(false);
 s.enactedFascistPolicies=5;expect(actionPermission(s,"veto/request",true,false).allowed).toBe(true);
 s.vetoRequestedThisRound=true;expect(actionPermission(s,"veto/request",true,false).allowed).toBe(false);
 s.currentPhase="VETO_CONFIRMATION";s.myPlayerId="p1";expect(actionPermission(s,"veto/response",true,false).allowed).toBe(true);
});
it("never exposes a generic end-action for another executive power",()=>{
 const s=view({players:people,currentPresidentId:"p1",currentPhase:"EXECUTIVE_ACTION",pendingExecutiveAction:"EXECUTION"});
 expect(actionPermission(s,"execute",true,false).allowed).toBe(true);expect(actionPermission(s,"end-action",true,false).allowed).toBe(false);
 s.pendingExecutiveAction="POLICY_PEEK";expect(actionPermission(s,"end-action",true,false).allowed).toBe(true);expect(actionPermission(s,"execute",true,false).allowed).toBe(false);
});
it("requires synchronized, alive actor and no pending command",()=>{
 const s=view({players:people,currentPhase:"VOTING"});
 expect(actionPermission(s,"vote",true,false).allowed).toBe(true);
 expect(actionPermission(s,"vote",false,false).allowed).toBe(false);
 expect(actionPermission(s,"vote",true,true).allowed).toBe(false);
 s.players=people.map(p=>({...p,isAlive:p.id!=="p1"}));expect(actionPermission(s,"vote",true,false).allowed).toBe(false);
});
it("government controls belong only to the office and phase",()=>{
 const s=view({players:people,currentPhase:"NOMINATION",currentPresidentId:"p2"});
 expect(actionPermission(s,"nominate",true,false).allowed).toBe(false);
 s.myPlayerId="p2";expect(actionPermission(s,"nominate",true,false).allowed).toBe(true);
 expect(actionPermission(s,"discard",true,false).allowed).toBe(false);
});
