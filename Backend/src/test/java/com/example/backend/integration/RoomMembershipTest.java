package com.example.backend.integration;
import com.example.backend.service.RoomService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import java.net.URI;
import java.net.http.*;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"logging.level.root=WARN","debug=false"})
class RoomMembershipTest {
 @LocalServerPort int port;@Autowired RoomService rooms;
 @Test void joiningPublishesSameVersionAndOnlyAuthenticatedSocketMarksOnline() throws Exception {
  var room=rooms.createRoom("Host","membership-host");
  assertThat(room.getPlayers().getFirst().isConnected()).isFalse();
  try(var host=new StompPeer(port)){
   assertThat(host.connect(room.getRoomCode(),"membership-host")).startsWith("CONNECTED");
   host.subscribe("/user/queue/room/"+room.getRoomCode()+"/state","membership-ready");host.await(f->f.startsWith("RECEIPT"));
   long before=room.getStateVersion();
   var response=HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/rooms/join")).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{\"roomCode\":\""+room.getRoomCode()+"\",\"nickname\":\"New member\",\"sessionToken\":\"membership-new\"}")).build(),HttpResponse.BodyHandlers.ofString());
   assertThat(response.statusCode()).isEqualTo(200);
   assertThat(room.getStateVersion()).isEqualTo(before+1);
   String message=host.await(f->f.startsWith("MESSAGE"));
   assertThat(message).contains("New member","\"stateVersion\":"+room.getStateVersion()).doesNotContain("membership-new","membership-host");
   assertThat(room.findBySessionToken("membership-new").orElseThrow().isConnected()).isFalse();
   assertThat(response.body()).contains("\"stateVersion\":"+room.getStateVersion());
  }
 }
}
