package com.example.backend.listener;
import com.example.backend.service.*;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.*;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
@Component
public class WebSocketEventListener {
 private final RoomService rooms; private final ActiveRoomSessionRegistry registry; private final RoomStatePublisher publisher;
 public WebSocketEventListener(RoomService rooms,ActiveRoomSessionRegistry registry,RoomStatePublisher publisher) {this.rooms=rooms;this.registry=registry;this.publisher=publisher;}
 @EventListener public void connected(SessionConnectedEvent event) {
  var sessionId=StompHeaderAccessor.wrap(event.getMessage()).getSessionId();
  var p=registry.get(sessionId); if(p==null) return;
  var room=rooms.getRoomOrThrow(p.roomCode());
  synchronized(room) { if(!registry.isActive(sessionId,p))return; var player=room.getPlayerOrThrow(p.playerId()); if(!player.isConnected()) {player.setConnected(true);room.commitMutation();publisher.publish(room);} }
 }
 @EventListener public void disconnected(SessionDisconnectEvent event) {
  var p=registry.get(event.getSessionId()); if(p==null)return;
  try { var room=rooms.getRoomOrThrow(p.roomCode()); synchronized(room) {
   if(registry.release(event.getSessionId())==null)return;
   rooms.handleDisconnectOrLeave(p.roomCode(),p.sessionToken()); publisher.publish(room);
  }} catch(com.example.backend.exception.GameException ignored) { registry.release(event.getSessionId()); }
 }
}
