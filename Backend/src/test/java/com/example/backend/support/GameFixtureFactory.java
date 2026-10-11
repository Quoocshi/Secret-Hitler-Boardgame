package com.example.backend.support;
import com.example.backend.domain.enums.*;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.service.*;
import java.util.*;
public class GameFixtureFactory {
 private final RoomService rooms;private final RoomStatePublisher publisher;
 public GameFixtureFactory(RoomService rooms,RoomStatePublisher publisher){this.rooms=rooms;this.publisher=publisher;}
 public record Member(String nickname,String sessionToken,String playerId) {}
 public record Fixture(String roomCode,List<Member> players) {}
 public void expire(String code){var room=rooms.getRoomOrThrow(code);synchronized(room){room.setLastActivityAt(java.time.Instant.now().minus(java.time.Duration.ofHours(2)));}rooms.cleanupInactiveRooms(java.time.Duration.ofHours(1));}
 public Fixture create(String scenario,int count){
  if(count<5 || count>10)throw new IllegalArgumentException();
  var room=rooms.createRoom("P1",UUID.randomUUID().toString());
  for(int n=1;n<count;n++)rooms.joinRoom(room.getRoomCode(),"P"+(n+1),UUID.randomUUID().toString());
  seed(room.getRoomCode(),scenario);
  return new Fixture(room.getRoomCode(),room.getPlayers().stream().map(p->new Member(p.getNickname(),p.getSessionToken(),p.getId())).toList());
 }
 public void seed(String code,String scenario){
  var room=rooms.getRoomOrThrow(code);
  synchronized(room){
   room.setCurrentPhase(Phase.NOMINATION);room.setPresidentIndex(0);room.setReturnToPresidentIndexAfterSpecial(null);
   room.setCurrentPresidentId(room.getPlayers().get(0).getId());room.setCurrentChancellorId(room.getPlayers().get(1).getId());room.setNominatedChancellorId(null);
   room.setLastElectedPresidentId(null);room.setLastElectedChancellorId(null);room.setElectionTracker(0);
   room.setEnactedLiberalPolicies(0);room.setEnactedFascistPolicies(0);room.setVetoRequestedThisRound(false);room.setPendingExecutiveAction(ExecutiveAction.NONE);room.setWinner(Winner.NONE);room.setWinReason(null);
   room.getCurrentVotes().clear();room.getLastRevealedVotes().clear();room.getDrawDeck().clear();room.getDiscardDeck().clear();room.getHandPolicies().clear();room.getInvestigationResults().clear();room.getGameLogs().clear();
   for(int n=0;n<room.getPlayers().size();n++){var p=room.getPlayers().get(n);p.setAlive(true);p.setInvestigated(false);p.setRole(n==1?Role.HITLER:n>=2&&n<2+(room.getPlayers().size()-3)/2?Role.FASCIST:Role.LIBERAL);}
   switch(scenario){
    case "deterministic-lobby" -> {room.setCurrentPhase(Phase.LOBBY);room.setCurrentPresidentId(null);room.setCurrentChancellorId(null);room.getPlayers().forEach(p->p.setRole(null));}
    case "nomination" -> room.setCurrentChancellorId(null);
    case "legislative-president" -> {room.setCurrentPhase(Phase.LEGISLATIVE_PRESIDENT);room.getHandPolicies().addAll(List.of(PolicyType.FASCIST,PolicyType.FASCIST,PolicyType.LIBERAL));}
    case "legislative-chancellor","veto-ready","veto-confirmation","veto-chaos","near-liberal-win","near-fascist-win" -> {
     room.setCurrentPhase(Phase.LEGISLATIVE_CHANCELLOR);room.getHandPolicies().addAll(List.of(PolicyType.FASCIST,PolicyType.LIBERAL));room.getDiscardDeck().add(PolicyType.FASCIST);
     if(scenario.startsWith("veto") || scenario.equals("near-fascist-win"))room.setEnactedFascistPolicies(5);
     if(scenario.equals("near-liberal-win"))room.setEnactedLiberalPolicies(4);
     if(scenario.equals("veto-confirmation") || scenario.equals("veto-chaos")){room.setCurrentPhase(Phase.VETO_CONFIRMATION);room.setVetoRequestedThisRound(true);room.setElectionTracker(scenario.equals("veto-chaos")?2:1);}
    }
    case "investigation","policy-peek","special-election","execution","near-hitler-executed" -> {
     room.setCurrentPhase(Phase.EXECUTIVE_ACTION);
     room.setPendingExecutiveAction(switch(scenario){case "investigation"->ExecutiveAction.INVESTIGATE_LOYALTY;case "policy-peek"->ExecutiveAction.POLICY_PEEK;case "special-election"->ExecutiveAction.SPECIAL_ELECTION;default->ExecutiveAction.EXECUTION;});
     room.setEnactedFascistPolicies(scenario.equals("investigation")?2:scenario.equals("policy-peek")||scenario.equals("special-election")?3:4);
    }
    case "near-hitler-elected" -> {room.setEnactedFascistPolicies(3);room.setCurrentChancellorId(null);}
    default -> throw new IllegalArgumentException("Unknown fixture scenario");
   }
   if(room.getCurrentPhase()!=Phase.LOBBY){
    for(int n=room.getEnactedLiberalPolicies();n<6;n++)room.getDrawDeck().add(PolicyType.LIBERAL);
    for(int n=room.getEnactedFascistPolicies();n<11;n++)room.getDrawDeck().add(PolicyType.FASCIST);
    for(var card:room.getHandPolicies())room.getDrawDeck().remove(card);
    for(var card:room.getDiscardDeck())room.getDrawDeck().remove(card);
    if(room.getPendingExecutiveAction()==ExecutiveAction.POLICY_PEEK){room.getDrawDeck().remove(PolicyType.FASCIST);room.getDrawDeck().remove(PolicyType.FASCIST);room.getDrawDeck().remove(PolicyType.LIBERAL);room.getDrawDeck().addAll(0,List.of(PolicyType.FASCIST,PolicyType.FASCIST,PolicyType.LIBERAL));room.getHandPolicies().addAll(room.getDrawDeck().subList(0,3));}
   }
   room.addLog("Bàn kiểm thử đã được chuẩn bị.");room.commitMutation();publisher.publish(room);
  }
 }
}
