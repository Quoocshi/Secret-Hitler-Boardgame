package com.example.backend.integration;
import com.example.backend.service.RoomService;
import com.example.backend.domain.model.GameRoom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import java.net.URI;
import java.net.http.*;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
class TransportContractTest {
 @LocalServerPort int port;
 @Autowired RoomService rooms;
 HttpResponse<String> get(String code,String token) throws Exception {
  return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/api/rooms/"+code+"/state")).header("X-Session-Token",token).GET().build(),HttpResponse.BodyHandlers.ofString());
 }
 @Test void invalidIdentityHasStableUnauthorizedCode() throws Exception {
  GameRoom room=rooms.createRoom("Transport","owner-token");
  var response=get(room.getRoomCode(),"outsider");
  assertThat(response.statusCode()).isEqualTo(401);
  assertThat(response.body()).contains("INVALID_SESSION").doesNotContain("owner-token");
 }
 @Test void snapshotIsPrivateVersionedAndNeverCached() throws Exception {
  var room=rooms.createRoom("State","state-owner");
  var response=get(room.getRoomCode(),"state-owner");
  assertThat(response.statusCode()).isEqualTo(200);
  assertThat(response.headers().firstValue("Cache-Control")).hasValue("no-store");
  assertThat(response.body()).contains("stateVersion","investigationResults","vetoRequestedThisRound").doesNotContain("state-owner");
 }
 @Test void productionApplicationDoesNotExposeFixtures() throws Exception {
  var response=HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:"+port+"/__test/fixtures")).GET().build(),HttpResponse.BodyHandlers.ofString());
  assertThat(response.statusCode()).isEqualTo(404);
 }
}
