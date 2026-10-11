package com.example.backend.integration;
import com.example.backend.config.BoundRoomPrincipal;
import com.example.backend.listener.WebSocketEventListener;
import com.example.backend.service.*;
import com.example.backend.service.impl.RoomServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class SessionLifecycleTest {
 @Test void duplicateAndStaleDisconnectNeverReplaceAnActiveSocket(){
  var rooms=new RoomServiceImpl();var registry=new ActiveRoomSessionRegistry();var publisher=mock(RoomStatePublisher.class);
  var room=rooms.createRoom("Host","host");var player=room.getPlayers().getFirst();
  var principal=new BoundRoomPrincipal(room.getRoomCode(),player.getId(),"host");var listener=new WebSocketEventListener(rooms,registry,publisher);
  registry.reserve("old",principal);var old=StompHeaderAccessor.create(StompCommand.CONNECTED);old.setSessionId("old");
  listener.connected(new SessionConnectedEvent(this,MessageBuilder.createMessage(new byte[0],old.getMessageHeaders())));
  assertThat(player.isConnected()).isTrue();var version=room.getStateVersion();
  assertThatThrownBy(()->registry.reserve("duplicate",principal)).hasMessage("DUPLICATE_SESSION");assertThat(room.getStateVersion()).isEqualTo(version);
  listener.disconnected(new SessionDisconnectEvent(this,MessageBuilder.createMessage(new byte[0],old.getMessageHeaders()),"old",CloseStatus.NORMAL));
  assertThat(player.isConnected()).isFalse();
  registry.reserve("new",principal);var replacement=StompHeaderAccessor.create(StompCommand.CONNECTED);replacement.setSessionId("new");
  listener.connected(new SessionConnectedEvent(this,MessageBuilder.createMessage(new byte[0],replacement.getMessageHeaders())));
  version=room.getStateVersion();
  listener.disconnected(new SessionDisconnectEvent(this,MessageBuilder.createMessage(new byte[0],old.getMessageHeaders()),"old",CloseStatus.NORMAL));
  assertThat(player.isConnected()).isTrue();assertThat(room.getStateVersion()).isEqualTo(version);assertThat(registry.isActive("new",principal)).isTrue();
 }
}
