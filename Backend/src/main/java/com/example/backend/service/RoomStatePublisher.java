package com.example.backend.service;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.dto.ActionResultDTO;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
@Service
public class RoomStatePublisher {
 private final GameStateMaskerService masker; private final SimpMessagingTemplate messaging;
 public RoomStatePublisher(GameStateMaskerService masker,SimpMessagingTemplate messaging) {this.masker=masker;this.messaging=messaging;}
 public void publish(GameRoom room) {
  synchronized(room) { for(var player:room.getPlayers()) if(player.isConnected()) messaging.convertAndSendToUser(player.getId(),"/queue/room/"+room.getRoomCode()+"/state",masker.maskStateForPlayer(room,player)); }
 }
 public void result(String roomCode,String playerId,ActionResultDTO result) {messaging.convertAndSendToUser(playerId,"/queue/room/"+roomCode+"/results",result);}
}
