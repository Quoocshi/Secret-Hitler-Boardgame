import { expect,it } from "vitest";
import { initialRoomState,roomReducer } from "@/lib/realtime/room-reducer";
import { view,actionId } from "../support/view";
it("ignores an older GET arriving after a push and callbacks from an old room",()=>{
 const live=roomReducer(initialRoomState,{type:"snapshot",snapshot:view({stateVersion:4}),generation:0});
 expect(roomReducer(live,{type:"snapshot",snapshot:view({stateVersion:2}),generation:0}).snapshot?.stateVersion).toBe(4);
 expect(roomReducer(live,{type:"snapshot",snapshot:view({stateVersion:9}),generation:3})).toEqual(live);
});
it("waits for matching ACK and rendered snapshot version in either delivery order",()=>{
 let state=roomReducer(initialRoomState,{type:"snapshot",snapshot:view(),generation:0});
 state=roomReducer(state,{type:"pending",pending:{actionId,action:"vote",expectedVersion:1,startedAt:0},generation:0});
 state=roomReducer(state,{type:"result",result:{actionId:"bb2d45f3-14c2-4e38-b1de-20f995b1a06f",action:"vote",status:"ACCEPTED",code:null,message:null,stateVersion:2},generation:0});
 expect(state.pendingAction).not.toBeNull();
 state=roomReducer(state,{type:"result",result:{actionId,action:"vote",status:"ACCEPTED",code:null,message:null,stateVersion:2},generation:0});
 expect(state.pendingAction).not.toBeNull();
 state=roomReducer(state,{type:"snapshot",snapshot:view({stateVersion:2}),generation:0});
 expect(state.pendingAction).toBeNull(); expect(state.notice).toContain("xác nhận");
});
