package com.example.backend.integration;
import com.example.backend.service.RoomService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"logging.level.root=WARN","debug=false"})
class StompContractTest {
 @LocalServerPort int port; @Autowired RoomService rooms;
 @Test void connectRequiresRealMembership() throws Exception {
  var room=rooms.createRoom("Owner","secure");
  try(var peer=new StompPeer(port)){assertThat(peer.connect(room.getRoomCode(),"outsider")).doesNotStartWith("CONNECTED");}
 }
 @Test void subscriptionReceiptMeansReadyAndCommandsAreCorrelatedIdempotent() throws Exception {
  var room=rooms.createRoom("Owner","commands");
  for(int i=1;i<5;i++)rooms.joinRoom(room.getRoomCode(),"Player "+i,"cmd-"+i);
  try(var peer=new StompPeer(port)){
   assertThat(peer.connect(room.getRoomCode(),"commands")).startsWith("CONNECTED");
   peer.subscribe("/user/queue/room/"+room.getRoomCode()+"/results","ready");
   assertThat(peer.await(f->f.startsWith("RECEIPT"))).contains("receipt-id:ready");
   var id=UUID.randomUUID().toString();long version=room.getStateVersion();
   peer.command("/app/room/"+room.getRoomCode()+"/start",id,version,"{}");
   assertThat(peer.await(f->f.startsWith("MESSAGE"))).contains(id,"ACCEPTED");
   long committed=room.getStateVersion();assertThat(committed).isEqualTo(version+1);
   peer.command("/app/room/"+room.getRoomCode()+"/start",id,version,"{}");
   assertThat(peer.await(f->f.startsWith("MESSAGE"))).contains(id,"ACCEPTED");
   assertThat(room.getStateVersion()).isEqualTo(committed);
   peer.command("/app/room/"+room.getRoomCode()+"/start",id,version,"{\"different\":true}");
   assertThat(peer.await(f->f.startsWith("MESSAGE"))).contains("ACTION_ID_REUSED");
   peer.command("/app/room/"+room.getRoomCode()+"/vote",UUID.randomUUID().toString(),version,"{\"vote\":\"JA\"}");
   assertThat(peer.await(f->f.startsWith("MESSAGE"))).contains("STALE_STATE");
   assertThat(room.getStateVersion()).isEqualTo(committed);
  }
 }
 @Test void duplicateSocketCannotReplaceOwner() throws Exception {
  var room=rooms.createRoom("Owner","duplicate");
  try(var first=new StompPeer(port);var second=new StompPeer(port)){
   assertThat(first.connect(room.getRoomCode(),"duplicate")).startsWith("CONNECTED");
   assertThat(second.connect(room.getRoomCode(),"duplicate")).startsWith("ERROR").contains("DUPLICATE_SESSION");
   first.subscribe("/user/queue/room/"+room.getRoomCode()+"/state","alive");
   assertThat(first.await(f->f.startsWith("RECEIPT"))).contains("receipt-id:alive");
  }
 }
 @Test void rawQueueWildcardAndCrossRoomSubscriptionsAreForbidden() throws Exception {
  for(String destination:new String[]{"/queue/room/ABC234/state","/topic/**","/user/queue/room/ABC234/results"}){
   var room=rooms.createRoom("Owner","sub-"+destination);
   try(var peer=new StompPeer(port)){
    assertThat(peer.connect(room.getRoomCode(),"sub-"+destination)).startsWith("CONNECTED");
    peer.subscribe(destination,"bad");
    assertThat(peer.await(f->f.startsWith("ERROR")||f.startsWith("CLOSED"))).doesNotStartWith("MESSAGE");
   }
  }
 }
 @Test void crossRoomSendAndTokenSpoofAreForbidden() throws Exception {
  var room=rooms.createRoom("Owner","bound");
  try(var peer=new StompPeer(port)){
   assertThat(peer.connect(room.getRoomCode(),"bound")).startsWith("CONNECTED");
   peer.command("/app/room/ABC234/start",UUID.randomUUID().toString(),0,"{}");
   assertThat(peer.await(f->f.startsWith("ERROR")||f.startsWith("CLOSED"))).doesNotStartWith("MESSAGE");
  }
  try(var peer=new StompPeer(port)){
   // Wait for the old disconnect's room lock; use a separate room to avoid intentionally rejected overlapping sockets.
   var other=rooms.createRoom("Other","other-bound");
   assertThat(peer.connect(other.getRoomCode(),"other-bound")).startsWith("CONNECTED");
   peer.send("SEND\ndestination:/app/room/"+other.getRoomCode()+"/start\nX-Session-Token:spoof\n\n{}");
   assertThat(peer.await(f->f.startsWith("ERROR")||f.startsWith("CLOSED"))).doesNotStartWith("MESSAGE");
  }
 }
 @Test void signalCannotSpoofSenderOrTargetAnotherRoom() throws Exception {
  var room=rooms.createRoom("Signal owner","signal-owner");
  try(var peer=new StompPeer(port)){
   assertThat(peer.connect(room.getRoomCode(),"signal-owner")).startsWith("CONNECTED");
   peer.command("/app/room/"+room.getRoomCode()+"/signal",UUID.randomUUID().toString(),0,"{\"senderId\":\"spoof\",\"targetId\":\"outsider\"}");
   assertThat(peer.await(f->f.startsWith("ERROR")||f.startsWith("CLOSED"))).doesNotStartWith("MESSAGE");
  }
 }
 @Test void malformedJsonReturnsCorrelatedRejectionWithoutMutation() throws Exception {
  var room=rooms.createRoom("Invalid owner","invalid-owner");
  try(var peer=new StompPeer(port)){
   assertThat(peer.connect(room.getRoomCode(),"invalid-owner")).startsWith("CONNECTED");
   peer.subscribe("/user/queue/room/"+room.getRoomCode()+"/results","invalid-ready");
   peer.await(f->f.startsWith("RECEIPT"));
   var id=UUID.randomUUID().toString();var version=room.getStateVersion();
   peer.command("/app/room/"+room.getRoomCode()+"/start",id,version,"{broken");
   assertThat(peer.await(f->f.startsWith("MESSAGE"))).contains(id,"REJECTED","INVALID_PAYLOAD");
   assertThat(room.getStateVersion()).isEqualTo(version);
  }
 }
}
