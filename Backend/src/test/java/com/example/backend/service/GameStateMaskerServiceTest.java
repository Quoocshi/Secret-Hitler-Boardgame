package com.example.backend.service;

import com.example.backend.domain.enums.Phase;
import com.example.backend.domain.enums.PolicyType;
import com.example.backend.domain.enums.Role;
import com.example.backend.domain.enums.Vote;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.dto.PlayerViewDTO;
import com.example.backend.service.impl.GameStateMaskerServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GameStateMaskerServiceTest {
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints={5,6,7,10})
    void allyAndVotePrivacyForEveryRecipient(int size) {
        var room=createSampleRoom(size);
        room.getPlayers().get(0).setRole(Role.HITLER);
        room.getPlayers().get(1).setRole(Role.FASCIST);
        for(int i=2;i<size;i++)room.getPlayers().get(i).setRole(Role.LIBERAL);
        room.setCurrentPhase(Phase.VOTING);
        room.getCurrentVotes().put("id-1",Vote.NEIN);
        for(var player:room.getPlayers()) {
            var masked=maskerService.maskStateForPlayer(room,player);
            assertEquals(player.getRole(),masked.myRole());
            if(player.getRole()==Role.LIBERAL || (player.getRole()==Role.HITLER && size>=7))assertTrue(masked.knownAllyIds().isEmpty());
            else assertEquals(java.util.Set.of("id-1","id-2"),new java.util.HashSet<>(masked.knownAllyIds()));
            assertTrue(masked.players().stream().allMatch(p->p.lastRevealedVote()==null));
            assertTrue(masked.players().getFirst().hasVoted());
            assertTrue(masked.handCards().isEmpty());
        }
    }

    private GameStateMaskerService maskerService;

    @BeforeEach
    void setUp() {
        maskerService = new GameStateMaskerServiceImpl();
    }

    private GameRoom createSampleRoom(int playerCount) {
        GameRoom room = new GameRoom("TEST99");
        for (int i = 1; i <= playerCount; i++) {
            Player p = Player.builder()
                    .id("id-" + i)
                    .sessionToken("token-" + i)
                    .nickname("Player" + i)
                    .isAlive(true)
                    .isConnected(true)
                    .build();
            room.getPlayers().add(p);
        }
        return room;
    }

    @Test
    void shouldNeverExposeSecretRolesInPublicPlayersList() {
        // Public player DTOs must not contain the secret Role enum field
        GameRoom room = createSampleRoom(5);
        room.getPlayers().get(0).setRole(Role.LIBERAL);
        room.getPlayers().get(1).setRole(Role.FASCIST);
        room.getPlayers().get(2).setRole(Role.HITLER);

        Player viewingPlayer = room.getPlayers().get(0);
        PlayerViewDTO view = maskerService.maskStateForPlayer(room, viewingPlayer);

        assertEquals(5, view.players().size());
        assertEquals("Player1", view.players().get(0).nickname());
        // Verify viewing player gets their own role while public list remains sanitized
        assertEquals(Role.LIBERAL, view.myRole());
    }

    @Test
    void shouldHideOngoingVotesUntilElectionResultsConclude() {
        // Active votes in progress must only show hasVoted flag, not the actual vote value
        GameRoom room = createSampleRoom(5);
        room.setCurrentPhase(Phase.VOTING);

        Player p1 = room.getPlayers().get(0);
        Player p2 = room.getPlayers().get(1);

        // p1 has cast JA, p2 has not voted yet
        room.getCurrentVotes().put(p1.getId(), Vote.JA);

        PlayerViewDTO view = maskerService.maskStateForPlayer(room, p1);

        // p1 has voted but the value is hidden from public view
        assertTrue(view.players().get(0).hasVoted());
        assertNull(view.players().get(0).lastRevealedVote());

        // p2 has not voted yet
        assertFalse(view.players().get(1).hasVoted());
        assertNull(view.players().get(1).lastRevealedVote());

        // Simulate election ended and votes revealed
        room.getLastRevealedVotes().put(p1.getId(), Vote.JA);
        PlayerViewDTO revealedView = maskerService.maskStateForPlayer(room, p1);
        assertEquals(Vote.JA, revealedView.players().get(0).lastRevealedVote());
    }

    @Test
    void shouldRevealAlliesToBothFascistAndHitlerInFivePlayerGame() {
        // In 5-6 player games, Fascists and Hitler know each other's identities
        GameRoom room = createSampleRoom(5);
        Player liberal = room.getPlayers().get(0);
        Player fascist = room.getPlayers().get(1);
        Player hitler = room.getPlayers().get(2);

        liberal.setRole(Role.LIBERAL);
        fascist.setRole(Role.FASCIST);
        hitler.setRole(Role.HITLER);

        // Liberal sees no allies
        PlayerViewDTO liberalView = maskerService.maskStateForPlayer(room, liberal);
        assertTrue(liberalView.knownAllyIds().isEmpty());

        // Fascist sees both themselves and Hitler
        PlayerViewDTO fascistView = maskerService.maskStateForPlayer(room, fascist);
        assertEquals(2, fascistView.knownAllyIds().size());
        assertTrue(fascistView.knownAllyIds().contains(fascist.getId()));
        assertTrue(fascistView.knownAllyIds().contains(hitler.getId()));

        // Hitler also sees Fascist and themselves in a 5-player game
        PlayerViewDTO hitlerView = maskerService.maskStateForPlayer(room, hitler);
        assertEquals(2, hitlerView.knownAllyIds().size());
        assertTrue(hitlerView.knownAllyIds().contains(fascist.getId()));
        assertTrue(hitlerView.knownAllyIds().contains(hitler.getId()));
    }

    @Test
    void shouldKeepHitlerInTheDarkInSevenPlayerGame() {
        // In 7-10 player games, Fascists know each other and Hitler, but Hitler knows NO ONE
        GameRoom room = createSampleRoom(7);
        Player f1 = room.getPlayers().get(0);
        Player f2 = room.getPlayers().get(1);
        Player hitler = room.getPlayers().get(2);
        Player liberal = room.getPlayers().get(3);

        f1.setRole(Role.FASCIST);
        f2.setRole(Role.FASCIST);
        hitler.setRole(Role.HITLER);
        liberal.setRole(Role.LIBERAL);

        // Regular fascist sees all fascists including Hitler
        PlayerViewDTO f1View = maskerService.maskStateForPlayer(room, f1);
        assertEquals(3, f1View.knownAllyIds().size());
        assertTrue(f1View.knownAllyIds().contains(f1.getId()));
        assertTrue(f1View.knownAllyIds().contains(f2.getId()));
        assertTrue(f1View.knownAllyIds().contains(hitler.getId()));

        // Hitler must receive an empty ally list in 7+ player games
        PlayerViewDTO hitlerView = maskerService.maskStateForPlayer(room, hitler);
        assertTrue(hitlerView.knownAllyIds().isEmpty());
    }

    @Test
    void shouldOnlyShowHandCardsToPresidentDuringPresidentLegislativePhase() {
        // Only the current President should receive cards during LEGISLATIVE_PRESIDENT phase
        GameRoom room = createSampleRoom(5);
        Player pres = room.getPlayers().get(0);
        Player chanc = room.getPlayers().get(1);
        Player bystander = room.getPlayers().get(2);

        room.setCurrentPhase(Phase.LEGISLATIVE_PRESIDENT);
        room.setCurrentPresidentId(pres.getId());
        room.setCurrentChancellorId(chanc.getId());

        room.getHandPolicies().addAll(List.of(PolicyType.LIBERAL, PolicyType.FASCIST, PolicyType.FASCIST));

        // President can see the 3 drawn cards
        PlayerViewDTO presView = maskerService.maskStateForPlayer(room, pres);
        assertEquals(3, presView.handCards().size());

        // Chancellor and other players must receive empty hand cards
        PlayerViewDTO chancView = maskerService.maskStateForPlayer(room, chanc);
        assertTrue(chancView.handCards().isEmpty());

        PlayerViewDTO bystanderView = maskerService.maskStateForPlayer(room, bystander);
        assertTrue(bystanderView.handCards().isEmpty());
    }

    @Test
    void shouldOnlyShowHandCardsToChancellorDuringChancellorLegislativePhase() {
        // Only the current Chancellor should receive cards during LEGISLATIVE_CHANCELLOR phase
        GameRoom room = createSampleRoom(5);
        Player pres = room.getPlayers().get(0);
        Player chanc = room.getPlayers().get(1);

        room.setCurrentPhase(Phase.LEGISLATIVE_CHANCELLOR);
        room.setCurrentPresidentId(pres.getId());
        room.setCurrentChancellorId(chanc.getId());

        room.getHandPolicies().addAll(List.of(PolicyType.LIBERAL, PolicyType.FASCIST));

        // Chancellor can see the 2 handed cards
        PlayerViewDTO chancView = maskerService.maskStateForPlayer(room, chanc);
        assertEquals(2, chancView.handCards().size());

        // President must not see cards in this phase
        PlayerViewDTO presView = maskerService.maskStateForPlayer(room, pres);
        assertTrue(presView.handCards().isEmpty());
    }

    @Test
    void shouldOnlyShowPeekCardsToPresidentDuringExecutiveAction() {
        // During Policy Peek executive action, only the President can view the peeked cards
        GameRoom room = createSampleRoom(5);
        Player pres = room.getPlayers().get(0);
        Player other = room.getPlayers().get(1);

        room.setCurrentPhase(Phase.EXECUTIVE_ACTION);
        room.setPendingExecutiveAction(com.example.backend.domain.enums.ExecutiveAction.POLICY_PEEK);
        room.setCurrentPresidentId(pres.getId());
        room.getHandPolicies().addAll(List.of(PolicyType.FASCIST, PolicyType.FASCIST, PolicyType.LIBERAL));

        // President can inspect the cards
        PlayerViewDTO presView = maskerService.maskStateForPlayer(room, pres);
        assertEquals(3, presView.handCards().size());

        // Other players cannot see the peeked cards
        PlayerViewDTO otherView = maskerService.maskStateForPlayer(room, other);
        assertTrue(otherView.handCards().isEmpty());
        room.setPendingExecutiveAction(com.example.backend.domain.enums.ExecutiveAction.EXECUTION);
        assertTrue(maskerService.maskStateForPlayer(room, pres).handCards().isEmpty());
    }
}
