package com.example.backend.service;

import com.example.backend.constants.GameConstants;
import com.example.backend.domain.enums.*;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.exception.GameException;
import com.example.backend.service.impl.GameEngineServiceImpl;
import com.example.backend.service.impl.RoomServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GameEngineServiceTest {

    private RoomService roomService;
    private GameEngineService gameEngineService;

    @BeforeEach
    void setUp() {
        roomService = new RoomServiceImpl();
        gameEngineService = new GameEngineServiceImpl();
    }

    private GameRoom createRoomWithPlayers(int count) {
        GameRoom room = roomService.createRoom("Player1", "token-1");
        for (int i = 2; i <= count; i++) {
            roomService.joinRoom(room.getRoomCode(), "Player" + i, "token-" + i);
        }
        return room;
    }

    private void electGovernment(GameRoom room, Player president, Player chancellor) {
        gameEngineService.nominateChancellor(room, president.getSessionToken(), chancellor.getId());
        for (Player p : room.getAlivePlayers()) {
            gameEngineService.castVote(room, p.getSessionToken(), Vote.JA);
        }
    }

    @Test
    void shouldDistributeRolesAndDeckCorrectlyFor7Players() {
        GameRoom room = createRoomWithPlayers(7);
        gameEngineService.startGame(room, "token-1");

        assertEquals(Phase.NOMINATION, room.getCurrentPhase());
        assertEquals(17, room.getDrawDeck().size());

        long liberals = room.getPlayers().stream().filter(p -> p.getRole() == Role.LIBERAL).count();
        long fascists = room.getPlayers().stream().filter(p -> p.getRole() == Role.FASCIST).count();
        long hitlers = room.getPlayers().stream().filter(p -> p.getRole() == Role.HITLER).count();

        assertEquals(4, liberals);
        assertEquals(2, fascists);
        assertEquals(1, hitlers);
    }

    @Test
    void shouldElectChancellorAndDrawThreePoliciesOnMajorityJa() {
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player candidate = gameEngineService.getEligibleChancellors(room).getFirst();

        gameEngineService.nominateChancellor(room, president.getSessionToken(), candidate.getId());
        assertEquals(Phase.VOTING, room.getCurrentPhase());

        List<Player> players = room.getPlayers();
        gameEngineService.castVote(room, players.get(0).getSessionToken(), Vote.JA);
        gameEngineService.castVote(room, players.get(1).getSessionToken(), Vote.JA);
        gameEngineService.castVote(room, players.get(2).getSessionToken(), Vote.JA);
        gameEngineService.castVote(room, players.get(3).getSessionToken(), Vote.NEIN);
        gameEngineService.castVote(room, players.get(4).getSessionToken(), Vote.NEIN);

        assertEquals(Phase.LEGISLATIVE_PRESIDENT, room.getCurrentPhase());
        assertEquals(candidate.getId(), room.getCurrentChancellorId());
        assertEquals(3, room.getHandPolicies().size());
        assertEquals(14, room.getDrawDeck().size());
    }

    @Test
    void shouldEnforceTermLimitsCorrectlyBetween5And6Players() {
        GameRoom room6 = createRoomWithPlayers(6);
        gameEngineService.startGame(room6, "token-1");

        List<Player> p6 = room6.getPlayers();
        room6.setCurrentPresidentId(p6.get(0).getId());
        room6.setLastElectedPresidentId(p6.get(1).getId());
        room6.setLastElectedChancellorId(p6.get(2).getId());

        List<Player> eligible6 = gameEngineService.getEligibleChancellors(room6);
        assertFalse(eligible6.contains(p6.get(1)));
        assertFalse(eligible6.contains(p6.get(2)));

        p6.get(5).setAlive(false);
        List<Player> eligible5 = gameEngineService.getEligibleChancellors(room6);
        assertTrue(eligible5.contains(p6.get(1)));
        assertFalse(eligible5.contains(p6.get(2)));
    }

    @Test
    void shouldTriggerFascistWinWhenHitlerElectedAfter3FascistPolicies() {
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");
        room.setEnactedFascistPolicies(3);

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player hitler = room.getPlayers().stream()
                .filter(p -> p.getRole() == Role.HITLER)
                .findFirst()
                .orElseThrow();

        if (president.getId().equals(hitler.getId())) {
            gameEngineService.advanceToNextPresident(room);
            president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        }

        gameEngineService.nominateChancellor(room, president.getSessionToken(), hitler.getId());

        for (Player p : room.getPlayers()) {
            gameEngineService.castVote(room, p.getSessionToken(), Vote.JA);
        }

        assertEquals(Phase.GAME_OVER, room.getCurrentPhase());
        assertEquals(Winner.FASCIST, room.getWinner());
    }

    @Test
    void shouldEnactChaosPolicyAfterThreeFailedElections() {
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");

        for (int round = 1; round <= 3; round++) {
            Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
            Player candidate = gameEngineService.getEligibleChancellors(room).getFirst();

            gameEngineService.nominateChancellor(room, president.getSessionToken(), candidate.getId());
            for (Player p : room.getPlayers()) {
                gameEngineService.castVote(room, p.getSessionToken(), Vote.NEIN);
            }
        }

        assertEquals(0, room.getElectionTracker());
        assertEquals(1, room.getEnactedLiberalPolicies() + room.getEnactedFascistPolicies());
        assertEquals(16, room.getDrawDeck().size());
        assertNull(room.getLastElectedPresidentId());
        assertNull(room.getLastElectedChancellorId());
        assertEquals(Phase.NOMINATION, room.getCurrentPhase());
    }

    @Test
    void shouldCompleteLegislativePhaseSuccessfully() {
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player chancellor = gameEngineService.getEligibleChancellors(room).getFirst();
        electGovernment(room, president, chancellor);

        assertEquals(Phase.LEGISLATIVE_PRESIDENT, room.getCurrentPhase());
        assertEquals(3, room.getHandPolicies().size());

        gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 0);

        assertEquals(Phase.LEGISLATIVE_CHANCELLOR, room.getCurrentPhase());
        assertEquals(2, room.getHandPolicies().size());
        assertEquals(1, room.getDiscardDeck().size());

        gameEngineService.chancellorEnactPolicy(room, chancellor.getSessionToken(), 0);

        assertEquals(2, room.getDiscardDeck().size());
        assertEquals(0, room.getHandPolicies().size());
        assertEquals(1, room.getEnactedLiberalPolicies() + room.getEnactedFascistPolicies());
    }

    @Test
    void shouldTriggerLiberalVictoryWhenFiveLiberalPoliciesEnacted() {
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");
        room.setEnactedLiberalPolicies(4);

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player chancellor = gameEngineService.getEligibleChancellors(room).getFirst();
        electGovernment(room, president, chancellor);

        room.getHandPolicies().clear();
        room.getHandPolicies().add(PolicyType.LIBERAL);
        room.getHandPolicies().add(PolicyType.LIBERAL);
        room.getHandPolicies().add(PolicyType.FASCIST);

        gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 2);
        gameEngineService.chancellorEnactPolicy(room, chancellor.getSessionToken(), 0);

        assertEquals(5, room.getEnactedLiberalPolicies());
        assertEquals(Phase.GAME_OVER, room.getCurrentPhase());
        assertEquals(Winner.LIBERAL, room.getWinner());
    }

    @Test
    void shouldRejectVetoWhenFascistPoliciesLessThanFive() {
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");
        room.setEnactedFascistPolicies(4);

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());

        Player chancellor = gameEngineService.getEligibleChancellors(room).stream()
                .filter(p -> p.getRole() != Role.HITLER)
                .findFirst()
                .orElseThrow();

        electGovernment(room, president, chancellor);

        gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 0);

        assertThrows(GameException.class, () ->
                gameEngineService.chancellorRequestVeto(room, chancellor.getSessionToken()));
    }

    @Test
    void shouldHandleVetoApprovalCorrectly() {
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");
        room.setEnactedFascistPolicies(5);

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());

        Player chancellor = gameEngineService.getEligibleChancellors(room).stream()
                .filter(p -> p.getRole() != Role.HITLER)
                .findFirst()
                .orElseThrow();

        electGovernment(room, president, chancellor);

        room.getHandPolicies().clear();
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);

        gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 0);

        gameEngineService.chancellorRequestVeto(room, chancellor.getSessionToken());
        assertEquals(Phase.VETO_CONFIRMATION, room.getCurrentPhase());

        gameEngineService.presidentRespondToVeto(room, president.getSessionToken(), true);

        assertEquals(3, room.getDiscardDeck().size());
        assertEquals(0, room.getHandPolicies().size());
        assertEquals(Phase.NOMINATION, room.getCurrentPhase());
    }

    @Test
    void shouldHandleVetoRejectionCorrectly() {
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");
        room.setEnactedFascistPolicies(5);

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());

        Player chancellor = gameEngineService.getEligibleChancellors(room).stream()
                .filter(p -> p.getRole() != Role.HITLER)
                .findFirst()
                .orElseThrow();

        electGovernment(room, president, chancellor);

        room.getHandPolicies().clear();
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);

        gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 0);
        gameEngineService.chancellorRequestVeto(room, chancellor.getSessionToken());

        gameEngineService.presidentRespondToVeto(room, president.getSessionToken(), false);
        assertEquals(Phase.LEGISLATIVE_CHANCELLOR, room.getCurrentPhase());

        assertThrows(GameException.class, () ->
                gameEngineService.chancellorRequestVeto(room, chancellor.getSessionToken()));

        gameEngineService.chancellorEnactPolicy(room, chancellor.getSessionToken(), 0);
        assertEquals(6, room.getEnactedFascistPolicies());
        assertEquals(Phase.GAME_OVER, room.getCurrentPhase());
        assertEquals(Winner.FASCIST, room.getWinner());
    }

    @Test
    void shouldWinGameForLiberalsWhenHitlerIsExecuted() {
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");

        room.setEnactedFascistPolicies(3);

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player hitler = room.getPlayers().stream()
                .filter(p -> p.getRole() == Role.HITLER)
                .findFirst()
                .orElseThrow();

        if (president.getId().equals(hitler.getId())) {
            gameEngineService.advanceToNextPresident(room);
            president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        }

        final String presId = president.getId();
        Player chancellor = gameEngineService.getEligibleChancellors(room).stream()
                .filter(p -> !p.getId().equals(presId) && !p.getId().equals(hitler.getId()))
                .findFirst()
                .orElseThrow();

        electGovernment(room, president, chancellor);

        room.getHandPolicies().clear();
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);

        gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 0);
        gameEngineService.chancellorEnactPolicy(room, chancellor.getSessionToken(), 0);

        assertEquals(Phase.EXECUTIVE_ACTION, room.getCurrentPhase());
        assertEquals(ExecutiveAction.EXECUTION, room.getPendingExecutiveAction());

        gameEngineService.executePlayer(room, president.getSessionToken(), hitler.getId());

        assertFalse(hitler.isAlive());
        assertEquals(Phase.GAME_OVER, room.getCurrentPhase());
        assertEquals(Winner.LIBERAL, room.getWinner());
    }

    @Test
    void shouldInvestigatePlayerLoyaltyAndPreventDoubleInvestigation() {
        GameRoom room = createRoomWithPlayers(7);
        gameEngineService.startGame(room, "token-1");
        room.setEnactedFascistPolicies(1);

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player chancellor = gameEngineService.getEligibleChancellors(room).getFirst();
        electGovernment(room, president, chancellor);

        room.getHandPolicies().clear();
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);

        gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 0);
        gameEngineService.chancellorEnactPolicy(room, chancellor.getSessionToken(), 0);

        assertEquals(Phase.EXECUTIVE_ACTION, room.getCurrentPhase());
        assertEquals(ExecutiveAction.INVESTIGATE_LOYALTY, room.getPendingExecutiveAction());

        Player target = room.getAlivePlayers().stream()
                .filter(p -> !p.getId().equals(president.getId()))
                .findFirst()
                .orElseThrow();

        gameEngineService.investigatePlayer(room, president.getSessionToken(), target.getId());
        assertTrue(target.isInvestigated());
        assertEquals(Phase.NOMINATION, room.getCurrentPhase());

        room.setCurrentPhase(Phase.EXECUTIVE_ACTION);
        room.setPendingExecutiveAction(ExecutiveAction.INVESTIGATE_LOYALTY);
        assertThrows(GameException.class, () ->
                gameEngineService.investigatePlayer(room, president.getSessionToken(), target.getId()));
    }

    @Test
    void shouldHandleSpecialElectionAndReturnToPreviousOrderAfterward() {
        GameRoom room = createRoomWithPlayers(7);
        gameEngineService.startGame(room, "token-1");
        room.setEnactedFascistPolicies(2);

        Player pres1 = room.getPlayerOrThrow(room.getCurrentPresidentId());
        int pres1Index = room.getPresidentIndex();
        Player chancellor = gameEngineService.getEligibleChancellors(room).getFirst();
        electGovernment(room, pres1, chancellor);

        room.getHandPolicies().clear();
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);

        gameEngineService.presidentDiscardPolicy(room, pres1.getSessionToken(), 0);
        gameEngineService.chancellorEnactPolicy(room, chancellor.getSessionToken(), 0);

        assertEquals(Phase.EXECUTIVE_ACTION, room.getCurrentPhase());
        assertEquals(ExecutiveAction.SPECIAL_ELECTION, room.getPendingExecutiveAction());

        int specialIndex = (pres1Index + 3) % room.getPlayers().size();
        Player specialPres = room.getPlayers().get(specialIndex);

        gameEngineService.callSpecialElection(room, pres1.getSessionToken(), specialPres.getId());

        assertEquals(specialPres.getId(), room.getCurrentPresidentId());
        assertEquals(pres1Index, room.getReturnToPresidentIndexAfterSpecial());
        assertEquals(Phase.NOMINATION, room.getCurrentPhase());

        gameEngineService.advanceToNextPresident(room);

        int expectedNextIndex = (pres1Index + 1) % room.getPlayers().size();
        assertEquals(expectedNextIndex, room.getPresidentIndex());
        assertNull(room.getReturnToPresidentIndexAfterSpecial());
    }

    @Test
    void shouldFailElectionOnTieVote() {
        // Tie vote (e.g. 3 JA vs 3 NEIN in a 6-player game) must result in election failure
        GameRoom room = createRoomWithPlayers(6);
        gameEngineService.startGame(room, "token-1");

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player nominee = gameEngineService.getEligibleChancellors(room).getFirst();
        gameEngineService.nominateChancellor(room, president.getSessionToken(), nominee.getId());

        List<Player> players = room.getPlayers();
        gameEngineService.castVote(room, players.get(0).getSessionToken(), Vote.JA);
        gameEngineService.castVote(room, players.get(1).getSessionToken(), Vote.JA);
        gameEngineService.castVote(room, players.get(2).getSessionToken(), Vote.JA);
        gameEngineService.castVote(room, players.get(3).getSessionToken(), Vote.NEIN);
        gameEngineService.castVote(room, players.get(4).getSessionToken(), Vote.NEIN);
        gameEngineService.castVote(room, players.get(5).getSessionToken(), Vote.NEIN);

        // Tracker increments and election fails on equal votes
        assertEquals(1, room.getElectionTracker());
        assertEquals(Phase.NOMINATION, room.getCurrentPhase());
        assertNull(room.getCurrentChancellorId());
    }

    @Test
    void shouldNotTriggerFascistWinWhenHitlerElectedBeforeThreeFascistPolicies() {
        // Hitler being elected with only 2 Fascist policies enacted must NOT end the game
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");
        room.setEnactedFascistPolicies(2);

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player hitler = room.getPlayers().stream()
                .filter(p -> p.getRole() == Role.HITLER)
                .findFirst()
                .orElseThrow();

        if (president.getId().equals(hitler.getId())) {
            gameEngineService.advanceToNextPresident(room);
            president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        }

        electGovernment(room, president, hitler);

        // Game continues to legislative phase normally without fascist win
        assertEquals(Phase.LEGISLATIVE_PRESIDENT, room.getCurrentPhase());
        assertEquals(Winner.NONE, room.getWinner());
    }

    @Test
    void shouldSkipDeadPlayersInPresidencyRotation() {
        // When a player is eliminated, the presidential succession must skip their seat
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");

        List<Player> players = room.getPlayers();
        room.setPresidentIndex(0);
        room.setCurrentPresidentId(players.get(0).getId());

        // Kill the immediately next player in circle (seat index 1)
        players.get(1).setAlive(false);

        gameEngineService.advanceToNextPresident(room);

        // Next president must be seat index 2, skipping deceased seat index 1
        assertEquals(2, room.getPresidentIndex());
        assertEquals(players.get(2).getId(), room.getCurrentPresidentId());
    }

    @Test
    void shouldPreventDeadPlayerFromVotingOrBeingNominated() {
        // Dead players cannot participate in elections or run for office
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");

        List<Player> players = room.getPlayers();
        Player deadPlayer = players.get(4);
        deadPlayer.setAlive(false);

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());

        // Deceased player cannot be in eligible list or nominated
        List<Player> eligible = gameEngineService.getEligibleChancellors(room);
        assertFalse(eligible.contains(deadPlayer));
        assertThrows(GameException.class, () ->
                gameEngineService.nominateChancellor(room, president.getSessionToken(), deadPlayer.getId()));

        // Nominate an eligible living player and enter voting phase
        Player eligibleLiving = eligible.getFirst();
        gameEngineService.nominateChancellor(room, president.getSessionToken(), eligibleLiving.getId());

        // Dead player cannot vote
        assertThrows(GameException.class, () ->
                gameEngineService.castVote(room, deadPlayer.getSessionToken(), Vote.JA));
    }

    @Test
    void shouldReshuffleDiscardPileWhenDrawDeckHasLessThanThreeCards() {
        // If draw deck drops below 3 cards, discard deck must be shuffled back into draw deck
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");

        room.getDrawDeck().clear();
        room.getDrawDeck().add(PolicyType.LIBERAL); // Only 1 card remaining in draw deck

        room.getDiscardDeck().clear();
        room.getDiscardDeck().add(PolicyType.FASCIST);
        room.getDiscardDeck().add(PolicyType.FASCIST);
        room.getDiscardDeck().add(PolicyType.LIBERAL);
        room.getDiscardDeck().add(PolicyType.LIBERAL); // 4 cards in discard

        // Calling ensureDrawDeckHasCards should merge and clear discard deck
        gameEngineService.ensureDrawDeckHasCards(room, 3);

        assertEquals(5, room.getDrawDeck().size());
        assertEquals(0, room.getDiscardDeck().size());
    }

    @Test
    void shouldPreventUnauthorizedActionExecution() {
        // Players cannot invoke actions assigned to the other role or target themselves
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player chancellor = gameEngineService.getEligibleChancellors(room).getFirst();
        electGovernment(room, president, chancellor);

        // Chancellor tries to discard during President's legislative turn
        assertThrows(GameException.class, () ->
                gameEngineService.presidentDiscardPolicy(room, chancellor.getSessionToken(), 0));

        // President discards legally
        gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 0);

        // President tries to enact during Chancellor's legislative turn
        assertThrows(GameException.class, () ->
                gameEngineService.chancellorEnactPolicy(room, president.getSessionToken(), 0));

        // Enact a fascist policy requiring execution
        room.getHandPolicies().clear();
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.setEnactedFascistPolicies(3);
        gameEngineService.chancellorEnactPolicy(room, chancellor.getSessionToken(), 0);

        // President attempts to execute themselves
        assertThrows(GameException.class, () ->
                gameEngineService.executePlayer(room, president.getSessionToken(), president.getId()));
    }

    @Test
    void shouldExecutePolicyPeekWithoutModifyingDeckCards() {
        // Policy peek in 5-player game (at 3rd Fascist policy) must display cards without consuming them
        GameRoom room = createRoomWithPlayers(5);
        gameEngineService.startGame(room, "token-1");
        room.setEnactedFascistPolicies(2);

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player chancellor = gameEngineService.getEligibleChancellors(room).getFirst();
        electGovernment(room, president, chancellor);

        room.getHandPolicies().clear();
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.FASCIST);
        room.getHandPolicies().add(PolicyType.LIBERAL);

        int initialDeckSize = room.getDrawDeck().size();

        gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 2);
        gameEngineService.chancellorEnactPolicy(room, chancellor.getSessionToken(), 0);

        // Action enters Policy Peek
        assertEquals(Phase.EXECUTIVE_ACTION, room.getCurrentPhase());
        assertEquals(ExecutiveAction.POLICY_PEEK, room.getPendingExecutiveAction());
        assertEquals(3, room.getHandPolicies().size());

        // Deck size remains unchanged because cards were only previewed
        assertEquals(initialDeckSize, room.getDrawDeck().size());

        // President finishes peek action and transitions turn
        gameEngineService.endExecutiveAction(room, president.getSessionToken());
        assertEquals(Phase.NOMINATION, room.getCurrentPhase());
    }
}