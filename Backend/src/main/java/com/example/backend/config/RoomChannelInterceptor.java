package com.example.backend.config;
import com.example.backend.service.*;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.*;
import org.springframework.stereotype.Component;
import java.util.Set;
@Component
public class RoomChannelInterceptor implements ChannelInterceptor {
 private static final Set<String> ACTIONS=Set.of("start","nominate","vote","discard","enact","veto/request","veto/response","execute","investigate","special-election","end-action","signal");
 private final RoomService rooms; private final ActiveRoomSessionRegistry registry;
 public RoomChannelInterceptor(RoomService rooms,ActiveRoomSessionRegistry registry) { this.rooms=rooms; this.registry=registry; }
 @Override public Message<?> preSend(Message<?> message,MessageChannel channel) {
  var h=MessageHeaderAccessor.getAccessor(message,StompHeaderAccessor.class);
  if(h==null || h.getCommand()==null) return message;
  if(h.getCommand()==StompCommand.CONNECT) {
   var room=rooms.getRoomOrThrow(h.getFirstNativeHeader("Room-Code"));
   synchronized(room) {
    var player=room.findBySessionToken(h.getFirstNativeHeader("X-Session-Token")).orElseThrow(()->new IllegalArgumentException("INVALID_SESSION"));
    var principal=new BoundRoomPrincipal(room.getRoomCode(),player.getId(),player.getSessionToken());
    registry.reserve(h.getSessionId(),principal); h.setUser(principal);
   }
   return message;
  }
  if(h.getCommand()==StompCommand.DISCONNECT) return message;
  var p=registry.get(h.getSessionId());
  if(p==null || !registry.isActive(h.getSessionId(),p)) throw new IllegalArgumentException("INVALID_SESSION");
  var token=h.getFirstNativeHeader("X-Session-Token");
  if(token!=null && !token.equals(p.sessionToken())) throw new IllegalArgumentException("INVALID_SESSION");
  h.setUser(p);
  if(h.getCommand()==StompCommand.SUBSCRIBE) {
   var destination=h.getDestination();
   if(!("/user/queue/room/"+p.roomCode()+"/state").equals(destination) && !("/user/queue/room/"+p.roomCode()+"/results").equals(destination)) throw new IllegalArgumentException("FORBIDDEN_DESTINATION");
  } else if(h.getCommand()==StompCommand.SEND) {
   var prefix="/app/room/"+p.roomCode()+"/";
   if(h.getDestination()==null || !h.getDestination().startsWith(prefix) || !ACTIONS.contains(h.getDestination().substring(prefix.length()))) throw new IllegalArgumentException("FORBIDDEN_DESTINATION");
   if(h.getDestination().equals(prefix+"signal")) {
    try {
     var body=tools.jackson.databind.json.JsonMapper.builder().build().readTree((byte[])message.getPayload());
     var room=rooms.getRoomOrThrow(p.roomCode());
     synchronized(room) { if(!p.playerId().equals(body.path("senderId").asString()) || room.findByPlayerId(body.path("targetId").asString()).isEmpty()) throw new IllegalArgumentException("INVALID_TARGET"); }
    } catch(Exception error) {throw new IllegalArgumentException("INVALID_SIGNAL");}
   }
  } else if(h.getCommand()!=StompCommand.UNSUBSCRIBE) throw new IllegalArgumentException("INVALID_ACTION");
  return message;
 }
}
