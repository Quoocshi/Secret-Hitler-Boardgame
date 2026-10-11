package com.example.backend.controller;
import com.example.backend.config.BoundRoomPrincipal;
import com.example.backend.service.*;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import java.security.Principal;
import org.springframework.messaging.Message;
import java.nio.charset.StandardCharsets;
@Controller
public class GameSocketController {
 private final GameCommandService commands; private final RoomService rooms; private final tools.jackson.databind.json.JsonMapper json;
 public GameSocketController(GameCommandService commands,RoomService rooms,tools.jackson.databind.json.JsonMapper json){this.commands=commands;this.rooms=rooms;this.json=json;}
 @MessageMapping("/room/{roomCode}/**")
 public void command(@DestinationVariable String roomCode,Message<byte[]> message,Principal principal,StompHeaderAccessor headers) {
  String payload=new String(message.getPayload(),StandardCharsets.UTF_8);
  if(!(principal instanceof BoundRoomPrincipal actor) || !actor.roomCode().equals(roomCode)) throw new IllegalArgumentException("INVALID_SESSION");
  String action=headers.getDestination().substring(("/app/room/"+roomCode+"/").length());
  if(action.equals("signal")) {
   var body=json.readTree(payload); var room=rooms.getRoomOrThrow(roomCode);
   synchronized(room){if(!actor.playerId().equals(body.path("senderId").asString()) || room.findByPlayerId(body.path("targetId").asString()).isEmpty())throw new IllegalArgumentException("INVALID_TARGET");}
   // Voice is outside the current feature; validate the legacy endpoint without exposing a new subscription.
   return;
  }
  commands.handle(actor,action,headers.getFirstNativeHeader("X-Action-Id"),headers.getFirstNativeHeader("X-Expected-Version"),payload);
 }
}
