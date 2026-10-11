package com.example.backend.integration;
import com.example.backend.domain.enums.*;
import com.example.backend.service.impl.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class InvestigationContractTest {
 @Test void investigationIsPrivatePersistedAndHitlerRevealsOnlyParty() {
  var rooms=new RoomServiceImpl();var engine=new GameEngineServiceImpl();var masker=new GameStateMaskerServiceImpl();
  var room=rooms.createRoom("Investigator","i");
  for(int n=1;n<7;n++)rooms.joinRoom(room.getRoomCode(),"P"+n,"p"+n);
  engine.startGame(room,"i");
  var investigator=room.getPlayers().getFirst();var target=room.getPlayers().get(1);target.setRole(Role.HITLER);
  room.setPresidentIndex(0);room.setCurrentPresidentId(investigator.getId());room.setCurrentPhase(Phase.EXECUTIVE_ACTION);room.setPendingExecutiveAction(ExecutiveAction.INVESTIGATE_LOYALTY);
  engine.investigatePlayer(room,"i",target.getId());
  assertThat(room.getCurrentPhase()).isEqualTo(Phase.NOMINATION);
  var mine=masker.maskStateForPlayer(room,investigator);
  assertThat(mine.investigationResults()).hasSize(1);
  assertThat(mine.investigationResults().getFirst().partyMembership()).isEqualTo(PolicyType.FASCIST);
  assertThat(mine.investigatedPartyMembership()).isEqualTo(PolicyType.FASCIST);
  assertThat(masker.maskStateForPlayer(room,target).investigationResults()).isEmpty();
  assertThat(masker.maskStateForPlayer(room,target).investigatedPartyMembership()).isNull();
  var reloaded=masker.maskStateForPlayer(room,room.findBySessionToken("i").orElseThrow());
  assertThat(reloaded.investigationResults()).isEqualTo(mine.investigationResults());
  assertThat(room.getGameLogs()).noneMatch(log->log.contains("partyMembership")||log.contains("HITLER"));
 }
}
