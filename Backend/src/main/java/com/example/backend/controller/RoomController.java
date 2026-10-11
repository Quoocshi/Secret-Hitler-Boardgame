package com.example.backend.controller;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.dto.PlayerViewDTO;
import com.example.backend.exception.GameException;
import com.example.backend.service.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins="${app.allowed-origins:http://localhost:3000}")
public class RoomController {
 private final RoomService rooms; private final GameStateMaskerService masker; private final RoomStatePublisher publisher;
 public RoomController(RoomService rooms,GameStateMaskerService masker,RoomStatePublisher publisher) {this.rooms=rooms;this.masker=masker;this.publisher=publisher;}
 public record CreateRoomRequest(@NotBlank String nickname,@NotBlank String sessionToken) {}
 public record JoinRoomRequest(@NotBlank String roomCode,@NotBlank String nickname,@NotBlank String sessionToken) {}
 public record RoomResponse(String roomCode,PlayerViewDTO gameState) {}
 private RoomResponse snapshot(GameRoom room,String token) {var player=room.findBySessionToken(token).orElseThrow(()->new GameException("INVALID_SESSION",401,"Phiên chơi không hợp lệ."));return new RoomResponse(room.getRoomCode(),masker.maskStateForPlayer(room,player));}
 @PostMapping("/create") public ResponseEntity<RoomResponse> create(@Valid @RequestBody CreateRoomRequest request) {
  var room=rooms.createRoom(request.nickname(),request.sessionToken()); synchronized(room){publisher.publish(room);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(snapshot(room,request.sessionToken()));}
 }
 @PostMapping("/join") public ResponseEntity<RoomResponse> join(@Valid @RequestBody JoinRoomRequest request) {
  var room=rooms.joinRoom(request.roomCode(),request.nickname(),request.sessionToken()); synchronized(room){publisher.publish(room);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(snapshot(room,request.sessionToken()));}
 }
 @GetMapping("/{roomCode}/state") public ResponseEntity<PlayerViewDTO> state(@PathVariable String roomCode,@RequestHeader("X-Session-Token") String token) {
  var room=rooms.getRoomOrThrow(roomCode); synchronized(room){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(snapshot(room,token).gameState());}
 }
}
