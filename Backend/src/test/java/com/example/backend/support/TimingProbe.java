package com.example.backend.support;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.service.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
/** Only instantiated by the test-classpath launcher. Contains no game secrets. */
public class TimingProbe extends RoomStatePublisher {
 public record Sample(String actionId,long version,double commitTime,List<String> recipients) {}
 private final Map<String,Map<String,Long>> ready=new ConcurrentHashMap<>();
 private final Map<String,List<Sample>> samples=new ConcurrentHashMap<>();
 public TimingProbe(GameStateMaskerService masker,SimpMessagingTemplate messaging){super(masker,messaging);}
 public void ready(GameRoom room,String token,long version){synchronized(room){var player=room.findBySessionToken(token).orElseThrow();if(!player.isConnected()||version!=room.getStateVersion())throw new IllegalArgumentException("Recipient is not synchronized");ready.computeIfAbsent(room.getRoomCode(),key->new HashMap<>()).put(player.getId(),version);}}
 public List<Sample> samples(GameRoom room){synchronized(room){return List.copyOf(samples.getOrDefault(room.getRoomCode(),List.of()));}}
 @Override public void publish(GameRoom room){synchronized(room){
  var accepted=room.getActionResults().values().stream().map(GameRoom.CachedAction::result).filter(result->result.status().equals("ACCEPTED")&&result.stateVersion()==room.getStateVersion()).findFirst();
  var captured=samples.computeIfAbsent(room.getRoomCode(),key->new ArrayList<>());
  if(accepted.isPresent()&&captured.stream().noneMatch(sample->sample.version()==room.getStateVersion())){
   var synchronizedVersions=ready.getOrDefault(room.getRoomCode(),Map.of());
   var recipients=room.getPlayers().stream().filter(player->player.isConnected()&&Objects.equals(synchronizedVersions.get(player.getId()),room.getStateVersion()-1)).map(player->player.getId()).toList();
   var commit=room.getLastActivityAt();captured.add(new Sample(accepted.get().actionId(),room.getStateVersion(),commit.getEpochSecond()*1000d+commit.getNano()/1_000_000d,recipients));
  }
  super.publish(room);
 }}
}
