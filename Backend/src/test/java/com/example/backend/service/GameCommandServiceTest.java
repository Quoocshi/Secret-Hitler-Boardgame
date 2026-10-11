package com.example.backend.service;
import com.example.backend.config.BoundRoomPrincipal;
import com.example.backend.service.impl.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class GameCommandServiceTest {
 @Test void malformedCommandIsCachedWithItsOriginalVersion() {
  var rooms=new RoomServiceImpl();var room=rooms.createRoom("Host","host");
  var actor=new BoundRoomPrincipal(room.getRoomCode(),room.getPlayers().getFirst().getId(),"host");
  var commands=new GameCommandService(rooms,new GameEngineServiceImpl(),mock(RoomStatePublisher.class),JsonMapper.builder().build());
  var id=UUID.randomUUID().toString();
  var first=commands.handle(actor,"start",id,Long.toString(room.getStateVersion()),"{broken");
  room.commitMutation();
  assertThat(commands.handle(actor,"start",id,Long.toString(room.getStateVersion()),"{broken")).isEqualTo(first);
  assertThat(commands.handle(actor,"start",id,Long.toString(room.getStateVersion()),"{}").code()).isEqualTo("ACTION_ID_REUSED");
 }
 @Test void committedCommandStaysAcceptedWhenSnapshotDeliveryFails() {
  var rooms=new RoomServiceImpl();var room=rooms.createRoom("Host","host");
  for(int i=1;i<5;i++)rooms.joinRoom(room.getRoomCode(),"P"+i,"p"+i);
  var actor=new BoundRoomPrincipal(room.getRoomCode(),room.getPlayers().getFirst().getId(),"host");
  var publisher=mock(RoomStatePublisher.class);doThrow(new RuntimeException("delivery failed")).when(publisher).publish(room);
  var commands=new GameCommandService(rooms,new GameEngineServiceImpl(),publisher,JsonMapper.builder().build());
  var id=UUID.randomUUID().toString();long before=room.getStateVersion();
  var accepted=commands.handle(actor,"start",id,Long.toString(before),"{}");
  assertThat(accepted.status()).isEqualTo("ACCEPTED");
  assertThat(room.getStateVersion()).isEqualTo(before+1);
  assertThat(commands.handle(actor,"start",id,Long.toString(before),"{}")).isEqualTo(accepted);
  assertThat(room.getStateVersion()).isEqualTo(before+1);
 }
}
