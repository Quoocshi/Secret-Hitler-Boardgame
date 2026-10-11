import { expect,it } from "vitest";
import { decodePlayerView,decodeResult,decodeRoomResponse,SchemaError } from "@/lib/api/decoders";
import { view,actionId } from "../support/view";
it("decodes the masked contract and matching room response",()=>{expect(decodeRoomResponse({roomCode:"ABC234",gameState:view()}).gameState).toEqual(view());});
it.each([{stateVersion:-1},{stateVersion:1.5},{currentPhase:"OTHER"},{handCards:["HITLER"]},{currentPresidentId:"outsider"},{players:[{...view().players[0],role:"HITLER"}]},{investigationResults:[{investigationId:actionId,targetPlayerId:"outsider",partyMembership:"FASCIST"}]}])("locks invalid snapshots %j",bad=>expect(()=>decodePlayerView(view(bad as Partial<ReturnType<typeof view>>))).toThrow(SchemaError));
it("rejects malformed or unrelated command correlation",()=>{expect(()=>decodeResult({actionId:"bad",action:"vote",status:"ACCEPTED",code:null,message:null,stateVersion:2})).toThrow(SchemaError);});
