import { Client,type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { config } from "@/lib/api/config";
import { decodePlayerView,decodeResult,SchemaError } from "@/lib/api/decoders";
import { ApiError,errorMessage } from "@/lib/api/errors";
import { getRoomState } from "@/lib/api/rooms";
import type { Action,SessionIdentity } from "@/lib/game/types";
import { prepareCommand } from "./commands";
import type { ClientRoomState,RoomEvent } from "./room-reducer";
export class RoomClient {
 private client:Client; private stopped=false; private epoch=0; private abort=new AbortController();
 private poll?:ReturnType<typeof setInterval>; private timeout?:ReturnType<typeof setTimeout>;
 private retryTimer?:ReturnType<typeof setTimeout>;
 private receiptTimers=new Set<ReturnType<typeof setTimeout>>();private subscriptions:StompSubscription[]=[];
 constructor(private identity:SessionIdentity,private generation:number,private dispatch:(event:RoomEvent)=>void,private state:()=>ClientRoomState) {
  this.client=new Client({webSocketFactory:()=>new SockJS(config.wsUrl),connectHeaders:{"Room-Code":identity.roomCode,"X-Session-Token":identity.sessionToken},reconnectDelay:1000,heartbeatIncoming:5000,heartbeatOutgoing:5000,connectionTimeout:8000,discardWebsocketOnCommFailure:true,debug:()=>{}});
  this.client.onConnect=()=>{void this.connected();};
  this.client.onWebSocketClose=()=>{if(!this.stopped){this.epoch++;if(this.poll){clearInterval(this.poll);this.poll=undefined;}for(const timer of this.receiptTimers)clearTimeout(timer);this.receiptTimers.clear();this.subscriptions=[];this.emit({type:"uncertain"});this.connection("reconnecting","Mất kết nối. Đang kết nối lại, thao tác cũ sẽ không tự gửi lại.");}};
  this.client.onStompError=frame=>{
   if(this.stopped)return;
   const code=frame.headers.message??"";
   if(code.includes("DUPLICATE_SESSION")){this.connection("duplicate","Phiên này đang mở ở tab khác. Hãy đóng phiên đó rồi thử lại.");void this.stop();}
   else {this.connection("error","Máy chủ từ chối kết nối. Hãy quay lại phòng.");void this.stop();}
  };
 }
 private emit(event:Omit<Extract<RoomEvent,{type:"connection"}>,"generation">|Omit<Extract<RoomEvent,{type:"uncertain"}>,"generation">|Omit<Extract<RoomEvent,{type:"snapshot"}>,"generation">|Omit<Extract<RoomEvent,{type:"result"}>,"generation">|Omit<Extract<RoomEvent,{type:"pending"}>,"generation">) {if(!this.stopped)this.dispatch({...event,generation:this.generation} as RoomEvent);}
 private connection(connection:ClientRoomState["connection"],notice?:string){this.emit({type:"connection",connection,notice});}
 async start() {
  this.connection("restoring");
  try {await this.sync(false);if(this.stopped)return;this.connection("connecting");this.client.activate();}
  catch(error){this.fail(error);}
 }
 private async connected() {
  if(this.poll){clearInterval(this.poll);this.poll=undefined;}
  const epoch=++this.epoch;this.connection("syncing");
  try {
   await Promise.all(["state","results"].map(kind=>new Promise<void>((resolve,reject)=>{
    const receipt=crypto.randomUUID(); let done=false;
    const timer=setTimeout(()=>{this.receiptTimers.delete(timer);if(!done){done=true;reject(new Error("Đăng ký nhận trạng thái quá hạn."));}},5000);
    this.receiptTimers.add(timer);
    this.client.watchForReceipt(receipt,()=>{if(!done){done=true;clearTimeout(timer);this.receiptTimers.delete(timer);resolve();}});
    this.subscriptions.push(this.client.subscribe(`/user/queue/room/${this.identity.roomCode}/${kind}`,message=>{
     if(this.stopped || epoch!==this.epoch)return;
     try {
      if(kind==="state")this.emit({type:"snapshot",snapshot:decodePlayerView(JSON.parse(message.body))});
      else {const result=decodeResult(JSON.parse(message.body));this.emit({type:"result",result});if(result.code==="STALE_STATE"){this.connection("syncing");void this.sync(true).catch(e=>this.fail(e));}}
      if(!this.state().pendingAction && this.timeout)clearTimeout(this.timeout);
     }catch(error){this.fail(error);}
    },{receipt}));
   })));
   if(this.stopped || epoch!==this.epoch)return;
   await this.sync(true);
   if(this.poll)clearInterval(this.poll);
   this.poll=setInterval(()=>{if(!this.stopped && this.client.connected)void this.sync(true).catch(e=>this.fail(e));},15000);
  }catch(error){if(!this.stopped && epoch===this.epoch){if(error instanceof SchemaError || error instanceof ApiError)this.fail(error);else {this.connection("reconnecting",errorMessage(error));this.client.forceDisconnect();}}}
 }
 private async sync(online:boolean) {
  const epoch=this.epoch;
  const snapshot=await getRoomState(this.identity.roomCode,this.identity.sessionToken,AbortSignal.any([this.abort.signal,AbortSignal.timeout(5000)]));
  if(this.stopped || epoch!==this.epoch)return;
  this.emit({type:"snapshot",snapshot});
  if(online)this.connection("online");
 }
 private fail(error:unknown) {
  if(this.stopped || (error instanceof DOMException && error.name==="AbortError"))return;
  if(error instanceof ApiError && ["INVALID_SESSION","ROOM_NOT_FOUND"].includes(error.code)){
   this.dispatch({type:"reset",generation:this.generation});this.connection("expired",errorMessage(error));void this.stop();
  }else if(error instanceof SchemaError) {this.connection("error",error.message);void this.stop();}
  else {
   this.connection("reconnecting",errorMessage(error));
   if(this.client.active)this.client.forceDisconnect();
   else {if(this.retryTimer)clearTimeout(this.retryTimer);this.retryTimer=setTimeout(()=>{void this.start();},1000);}
  }
 }
 send(action:Action,payload:Record<string,unknown>={}) {
  const pending=prepareCommand(this.state(),action);
  if(!this.client.connected || this.stopped)throw new Error("Kết nối chưa sẵn sàng.");
  this.emit({type:"pending",pending});
  this.timeout=setTimeout(()=>{
   if(this.stopped || this.state().pendingAction?.actionId!==pending.actionId)return;
   this.emit({type:"uncertain"});void this.sync(true).catch(e=>this.fail(e));
  },8000);
  this.client.publish({destination:`/app/room/${this.identity.roomCode}/${action}`,headers:{"X-Action-Id":pending.actionId,"X-Expected-Version":String(pending.expectedVersion),"content-type":"application/json"},body:JSON.stringify(payload)});
 }
 async stop() {
  if(this.stopped)return;this.stopped=true;this.epoch++;this.abort.abort();
  if(this.poll)clearInterval(this.poll);if(this.timeout)clearTimeout(this.timeout);
  if(this.retryTimer)clearTimeout(this.retryTimer);
  for(const timer of this.receiptTimers)clearTimeout(timer);this.receiptTimers.clear();
  if(this.client.connected)for(const subscription of this.subscriptions){try{subscription.unsubscribe();}catch{/* Closing the transport still removes the subscription. */}}
  this.subscriptions=[];
  await this.client.deactivate({force:true});
 }
}
