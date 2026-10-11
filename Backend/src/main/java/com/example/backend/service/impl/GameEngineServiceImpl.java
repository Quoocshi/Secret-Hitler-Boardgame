package com.example.backend.service.impl;

import com.example.backend.constants.GameConstants;
import com.example.backend.domain.enums.*;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.exception.GameException;
import com.example.backend.service.GameEngineService;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class GameEngineServiceImpl implements GameEngineService {

    private final SecureRandom random = new SecureRandom();

    // Start of previously implemented methods (startGame, nominateChancellor, etc. remain exactly the same)
    @Override
    public void startGame(GameRoom room, String hostSessionToken) {
        synchronized (room) {
            if (room.getCurrentPhase() != Phase.LOBBY) {
                throw new GameException(GameConstants.ErrorMessage.ROOM_ALREADY_STARTED);
            }

            Player requester = getPlayerBySessionOrThrow(room, hostSessionToken);
            if (!requester.isHost()) {
                throw new GameException(GameConstants.ErrorMessage.ACTION_NOT_HOST);
            }

            int playerCount = room.getPlayers().size();
            if (playerCount < GameConstants.Room.MIN_PLAYERS || playerCount > GameConstants.Room.MAX_PLAYERS) {
                throw new GameException(String.format(GameConstants.ErrorMessage.INVALID_PLAYER_COUNT,
                        GameConstants.Room.MIN_PLAYERS, GameConstants.Room.MAX_PLAYERS, playerCount));
            }

            resetRoomForNewGame(room);
            assignRoles(room.getPlayers());
            initializePolicyDeck(room);

            int firstPresIndex = random.nextInt(playerCount);
            room.setPresidentIndex(firstPresIndex);
            Player firstPresident = room.getPlayers().get(firstPresIndex);
            room.setCurrentPresidentId(firstPresident.getId());

            room.setCurrentPhase(Phase.NOMINATION);
            room.addLog(String.format(GameConstants.LogMessage.GAME_STARTED, playerCount, firstPresident.getNickname()));
        }
    }

    @Override
    public void nominateChancellor(GameRoom room, String presidentSessionToken, String nomineePlayerId) {
        synchronized (room) {
            if (room.getCurrentPhase() != Phase.NOMINATION) {
                throw new GameException(GameConstants.ErrorMessage.PHASE_NOT_NOMINATION);
            }

            Player president = getPlayerBySessionOrThrow(room, presidentSessionToken);
            if (!president.getId().equals(room.getCurrentPresidentId())) {
                throw new GameException(GameConstants.ErrorMessage.ACTION_NOT_PRESIDENT);
            }

            Player nominee = room.getPlayerOrThrow(nomineePlayerId);
            List<Player> eligibleCandidates = getEligibleChancellors(room);

            boolean isEligible = eligibleCandidates.stream()
                    .anyMatch(p -> p.getId().equals(nominee.getId()));

            if (!isEligible) {
                throw new GameException(String.format(GameConstants.ErrorMessage.INVALID_NOMINEE, nominee.getNickname()));
            }

            room.setNominatedChancellorId(nominee.getId());
            room.getCurrentVotes().clear();
            room.setCurrentPhase(Phase.VOTING);
            room.addLog(String.format(GameConstants.LogMessage.CHANCELLOR_NOMINATED, president.getNickname(), nominee.getNickname()));
        }
    }

    @Override
    public List<Player> getEligibleChancellors(GameRoom room) {
        int aliveCount = room.getAlivePlayerCount();
        String currentPresId = room.getCurrentPresidentId();
        String lastPresId = room.getLastElectedPresidentId();
        String lastChancId = room.getLastElectedChancellorId();

        return room.getAlivePlayers().stream()
                .filter(p -> !p.getId().equals(currentPresId))
                .filter(p -> !p.getId().equals(lastChancId))
                // The former president is forbidden from running for Chancellor unless there are <= 5 alive players
                .filter(p -> aliveCount <= GameConstants.Room.MIN_PLAYERS || !p.getId().equals(lastPresId))
                .toList();
    }

    @Override
    public void castVote(GameRoom room, String voterSessionToken, Vote vote) {
        if (vote == null) {
            throw new GameException(GameConstants.ErrorMessage.INVALID_VOTE_VALUE);
        }

        synchronized (room) {
            if (room.getCurrentPhase() != Phase.VOTING) {
                throw new GameException(GameConstants.ErrorMessage.PHASE_NOT_VOTING);
            }

            Player voter = getPlayerBySessionOrThrow(room, voterSessionToken);
            if (!voter.isAlive()) {
                throw new GameException(GameConstants.ErrorMessage.VOTER_DEAD);
            }

            room.getCurrentVotes().put(voter.getId(), vote);
            room.touchActivity();

            int aliveCount = room.getAlivePlayerCount();
            if (room.getCurrentVotes().size() == aliveCount) {
                evaluateElectionResults(room);
            }
        }
    }

    @Override
    public void advanceToNextPresident(GameRoom room) {
        synchronized (room) {
            List<Player> players = room.getPlayers();
            int size = players.size();

            // Restore the normal index if we just finished a Special Election
            if (room.getReturnToPresidentIndexAfterSpecial() != null) {
                room.setPresidentIndex(room.getReturnToPresidentIndexAfterSpecial());
                room.setReturnToPresidentIndexAfterSpecial(null);
            }

            int nextIndex = room.getPresidentIndex();
            for (int i = 0; i < size; i++) {
                nextIndex = (nextIndex + 1) % size;
                if (players.get(nextIndex).isAlive()) {
                    break;
                }
            }

            Player nextPresident = players.get(nextIndex);
            room.setPresidentIndex(nextIndex);
            room.setCurrentPresidentId(nextPresident.getId());
            room.setCurrentChancellorId(null);
            room.setNominatedChancellorId(null);
            room.setVetoRequestedThisRound(false);
            room.setPendingExecutiveAction(ExecutiveAction.NONE);
            room.getHandPolicies().clear();
            room.setCurrentPhase(Phase.NOMINATION);

            room.addLog(String.format(GameConstants.LogMessage.NEXT_PRESIDENT, nextPresident.getNickname()));
        }
    }

    @Override
    public void ensureDrawDeckHasCards(GameRoom room, int minCards) {
        synchronized (room) {
            if (room.getDrawDeck().size() < minCards) {
                room.getDrawDeck().addAll(room.getDiscardDeck());
                room.getDiscardDeck().clear();
                Collections.shuffle(room.getDrawDeck(), random);
                room.addLog(String.format(GameConstants.LogMessage.DECK_RESHUFFLED, minCards, room.getDrawDeck().size()));
            }
        }
    }

    @Override
    public void presidentDiscardPolicy(GameRoom room, String sessionToken, int policyIndex) {
        synchronized (room) {
            if (room.getCurrentPhase() != Phase.LEGISLATIVE_PRESIDENT) {
                throw new GameException(GameConstants.ErrorMessage.PHASE_NOT_LEGISLATIVE_PRESIDENT);
            }

            Player president = getPlayerBySessionOrThrow(room, sessionToken);
            if (!president.getId().equals(room.getCurrentPresidentId())) {
                throw new GameException(GameConstants.ErrorMessage.ACTION_NOT_PRESIDENT);
            }

            if (policyIndex < 0 || policyIndex >= room.getHandPolicies().size()) {
                throw new GameException(GameConstants.ErrorMessage.CARD_INDEX_OUT_OF_BOUNDS);
            }

            // Discard the selected policy
            PolicyType discarded = room.getHandPolicies().remove(policyIndex);
            room.getDiscardDeck().add(discarded);

            room.setCurrentPhase(Phase.LEGISLATIVE_CHANCELLOR);
            room.addLog(String.format(GameConstants.LogMessage.PRESIDENT_DISCARDED, president.getNickname()));
        }
    }

    @Override
    public void chancellorEnactPolicy(GameRoom room, String sessionToken, int policyIndex) {
        synchronized (room) {
            if (room.getCurrentPhase() != Phase.LEGISLATIVE_CHANCELLOR) {
                throw new GameException(GameConstants.ErrorMessage.PHASE_NOT_LEGISLATIVE_CHANCELLOR);
            }

            Player chancellor = getPlayerBySessionOrThrow(room, sessionToken);
            if (!chancellor.getId().equals(room.getCurrentChancellorId())) {
                throw new GameException(GameConstants.ErrorMessage.ACTION_NOT_CHANCELLOR);
            }

            if (policyIndex < 0 || policyIndex >= room.getHandPolicies().size()) {
                throw new GameException(GameConstants.ErrorMessage.CARD_INDEX_OUT_OF_BOUNDS);
            }

            // Enact the selected policy
            PolicyType enactedPolicy = room.getHandPolicies().remove(policyIndex);

            // The remaining policy goes to discard
            PolicyType discarded = room.getHandPolicies().removeFirst();
            room.getDiscardDeck().add(discarded);

            executeEnactment(room, enactedPolicy);
        }
    }

    @Override
    public void chancellorRequestVeto(GameRoom room, String sessionToken) {
        synchronized (room) {
            if (room.getCurrentPhase() != Phase.LEGISLATIVE_CHANCELLOR) {
                throw new GameException(GameConstants.ErrorMessage.PHASE_NOT_LEGISLATIVE_CHANCELLOR);
            }

            Player chancellor = getPlayerBySessionOrThrow(room, sessionToken);
            if (!chancellor.getId().equals(room.getCurrentChancellorId())) {
                throw new GameException(GameConstants.ErrorMessage.ACTION_NOT_CHANCELLOR);
            }

            if (!room.isVetoPowerUnlocked()) {
                throw new GameException(GameConstants.ErrorMessage.VETO_NOT_UNLOCKED);
            }

            if (room.isVetoRequestedThisRound()) {
                throw new GameException(GameConstants.ErrorMessage.VETO_ALREADY_REQUESTED);
            }

            room.setVetoRequestedThisRound(true);
            room.setCurrentPhase(Phase.VETO_CONFIRMATION);
            room.addLog(String.format(GameConstants.LogMessage.VETO_REQUESTED, chancellor.getNickname()));
        }
    }

    @Override
    public void presidentRespondToVeto(GameRoom room, String sessionToken, boolean approve) {
        synchronized (room) {
            if (room.getCurrentPhase() != Phase.VETO_CONFIRMATION) {
                throw new GameException(GameConstants.ErrorMessage.PHASE_NOT_VETO_CONFIRMATION);
            }

            Player president = getPlayerBySessionOrThrow(room, sessionToken);
            if (!president.getId().equals(room.getCurrentPresidentId())) {
                throw new GameException(GameConstants.ErrorMessage.ACTION_NOT_PRESIDENT);
            }

            if (approve) {
                // Veto approved: Both cards are discarded, round ends
                room.getDiscardDeck().addAll(room.getHandPolicies());
                room.getHandPolicies().clear();
                room.addLog(String.format(GameConstants.LogMessage.VETO_APPROVED, president.getNickname()));
                room.setElectionTracker(room.getElectionTracker() + 1);
                if (room.getElectionTracker() >= GameConstants.Rule.MAX_ELECTION_TRACKER) enactChaosPolicy(room);
                if (room.getCurrentPhase() != Phase.GAME_OVER) advanceToNextPresident(room);
            } else {
                // Veto rejected: Chancellor must enact one
                room.setCurrentPhase(Phase.LEGISLATIVE_CHANCELLOR);
                room.addLog(String.format(GameConstants.LogMessage.VETO_REJECTED, president.getNickname()));
            }
        }
    }

    @Override
    public void executePlayer(GameRoom room, String sessionToken, String targetPlayerId) {
        synchronized (room) {
            validateExecutiveAction(room, sessionToken, ExecutiveAction.EXECUTION);

            Player target = room.getPlayerOrThrow(targetPlayerId);
            validateTarget(room, target, room.getCurrentPresidentId());

            target.setAlive(false);
            Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
            room.addLog(String.format(GameConstants.LogMessage.PLAYER_EXECUTED, president.getNickname(), target.getNickname()));

            // If Hitler is executed, Liberals win immediately
            if (target.getRole() == Role.HITLER) {
                room.setWinner(Winner.LIBERAL);
                room.setWinReason(String.format(GameConstants.LogMessage.WIN_REASON_HITLER_DEAD, target.getNickname()));
                room.setCurrentPhase(Phase.GAME_OVER);
                room.addLog(String.format(GameConstants.LogMessage.GAME_OVER, Winner.LIBERAL.name(), room.getWinReason()));
                return;
            }

            advanceToNextPresident(room);
        }
    }

    @Override
    public void investigatePlayer(GameRoom room, String sessionToken, String targetPlayerId) {
        synchronized (room) {
            validateExecutiveAction(room, sessionToken, ExecutiveAction.INVESTIGATE_LOYALTY);

            Player target = room.getPlayerOrThrow(targetPlayerId);
            validateTarget(room, target, room.getCurrentPresidentId());

            if (target.isInvestigated()) {
                throw new GameException(GameConstants.ErrorMessage.TARGET_ALREADY_INVESTIGATED);
            }

            target.setInvestigated(true);
            Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());

            room.addLog(String.format(GameConstants.LogMessage.PLAYER_INVESTIGATED, president.getNickname(), target.getNickname()));
            room.getInvestigationResults().computeIfAbsent(president.getId(), key -> new ArrayList<>())
                    .add(new com.example.backend.dto.InvestigationResultDTO(java.util.UUID.randomUUID().toString(), target.getId(), target.getRole().getPartyMembership()));

            advanceToNextPresident(room);
        }
    }

    @Override
    public void callSpecialElection(GameRoom room, String sessionToken, String targetPlayerId) {
        synchronized (room) {
            validateExecutiveAction(room, sessionToken, ExecutiveAction.SPECIAL_ELECTION);

            Player target = room.getPlayerOrThrow(targetPlayerId);
            validateTarget(room, target, room.getCurrentPresidentId());

            Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());

            // Save the current index to return to it after the special election
            room.setReturnToPresidentIndexAfterSpecial(room.getPresidentIndex());

            // Set the new president
            int targetIndex = room.getPlayers().indexOf(target);
            room.setPresidentIndex(targetIndex);
            room.setCurrentPresidentId(target.getId());
            room.setCurrentChancellorId(null);
            room.setNominatedChancellorId(null);
            room.setCurrentPhase(Phase.NOMINATION);

            room.addLog(String.format(GameConstants.LogMessage.SPECIAL_ELECTION_CALLED, president.getNickname(), target.getNickname()));
        }
    }

    @Override
    public void endExecutiveAction(GameRoom room, String sessionToken) {
        synchronized (room) {
            validateExecutiveAction(room, sessionToken, ExecutiveAction.POLICY_PEEK);
            Player president = getPlayerBySessionOrThrow(room, sessionToken);
            if (!president.getId().equals(room.getCurrentPresidentId())) {
                throw new GameException(GameConstants.ErrorMessage.ACTION_NOT_PRESIDENT);
            }

            if (room.getCurrentPhase() == Phase.EXECUTIVE_ACTION && room.getPendingExecutiveAction() == ExecutiveAction.POLICY_PEEK) {
                room.addLog(String.format(GameConstants.LogMessage.POLICY_PEEK_USED, president.getNickname()));
            }

            advanceToNextPresident(room);
        }
    }

    private void executeEnactment(GameRoom room, PolicyType enactedPolicy) {
        executeEnactment(room, enactedPolicy, false);
    }

    private void executeEnactment(GameRoom room, PolicyType enactedPolicy, boolean chaos) {
        room.getHandPolicies().clear();
        if (enactedPolicy == PolicyType.LIBERAL) {
            room.setEnactedLiberalPolicies(room.getEnactedLiberalPolicies() + 1);
        } else {
            room.setEnactedFascistPolicies(room.getEnactedFascistPolicies() + 1);
        }

        room.addLog(String.format(GameConstants.LogMessage.POLICY_ENACTED, enactedPolicy.name(),
                room.getEnactedLiberalPolicies(), GameConstants.Rule.LIBERAL_POLICIES_TO_WIN,
                room.getEnactedFascistPolicies(), GameConstants.Rule.FASCIST_POLICIES_TO_WIN));

        // Check Win Conditions
        if (room.getEnactedLiberalPolicies() >= GameConstants.Rule.LIBERAL_POLICIES_TO_WIN) {
            room.setWinner(Winner.LIBERAL);
            room.setWinReason(String.format(GameConstants.LogMessage.WIN_REASON_LIBERAL, GameConstants.Rule.LIBERAL_POLICIES_TO_WIN));
            room.setCurrentPhase(Phase.GAME_OVER);
            room.addLog(String.format(GameConstants.LogMessage.GAME_OVER, Winner.LIBERAL.name(), room.getWinReason()));
            return;
        }

        if (room.getEnactedFascistPolicies() >= GameConstants.Rule.FASCIST_POLICIES_TO_WIN) {
            room.setWinner(Winner.FASCIST);
            room.setWinReason(String.format(GameConstants.LogMessage.WIN_REASON_FASCIST, GameConstants.Rule.FASCIST_POLICIES_TO_WIN));
            room.setCurrentPhase(Phase.GAME_OVER);
            room.addLog(String.format(GameConstants.LogMessage.GAME_OVER, Winner.FASCIST.name(), room.getWinReason()));
            return;
        }

        // Chaos cannot trigger powers or advance twice; the caller advances after the win check.
        if (chaos) return;
        // Determine Executive Action if it was a Fascist Policy
        if (enactedPolicy == PolicyType.FASCIST) {
            ExecutiveAction nextAction = determineExecutiveAction(room.getPlayers().size(), room.getEnactedFascistPolicies());
            if (nextAction != ExecutiveAction.NONE) {
                room.setPendingExecutiveAction(nextAction);
                room.setCurrentPhase(Phase.EXECUTIVE_ACTION);

                // If it's policy peek, draw 3 cards to show the president (without removing them from deck)
                if (nextAction == ExecutiveAction.POLICY_PEEK) {
                    ensureDrawDeckHasCards(room, 3);
                    room.getHandPolicies().clear();
                    room.getHandPolicies().add(room.getDrawDeck().get(0));
                    room.getHandPolicies().add(room.getDrawDeck().get(1));
                    room.getHandPolicies().add(room.getDrawDeck().get(2));
                }
                return;
            }
        }

        advanceToNextPresident(room);
    }

    private ExecutiveAction determineExecutiveAction(int totalPlayers, int fascistPolicies) {
        if (fascistPolicies == 1) {
            if (totalPlayers >= 9) return ExecutiveAction.INVESTIGATE_LOYALTY;
            return ExecutiveAction.NONE;
        }
        if (fascistPolicies == 2) {
            if (totalPlayers >= 7) return ExecutiveAction.INVESTIGATE_LOYALTY;
            return ExecutiveAction.NONE;
        }
        if (fascistPolicies == 3) {
            if (totalPlayers >= 7) return ExecutiveAction.SPECIAL_ELECTION;
            return ExecutiveAction.POLICY_PEEK;
        }
        if (fascistPolicies == 4 || fascistPolicies == 5) {
            return ExecutiveAction.EXECUTION;
        }
        return ExecutiveAction.NONE;
    }

    private void validateExecutiveAction(GameRoom room, String sessionToken, ExecutiveAction expectedAction) {
        if (room.getCurrentPhase() != Phase.EXECUTIVE_ACTION) {
            throw new GameException(GameConstants.ErrorMessage.PHASE_NOT_EXECUTIVE_ACTION);
        }

        Player president = getPlayerBySessionOrThrow(room, sessionToken);
        if (!president.isAlive()) throw new GameException("INVALID_ACTION",400,"Người đã bị loại không thể thực hiện quyền lực.");
        if (!president.getId().equals(room.getCurrentPresidentId())) {
            throw new GameException(GameConstants.ErrorMessage.ACTION_NOT_PRESIDENT);
        }

        if (room.getPendingExecutiveAction() != expectedAction) {
            throw new GameException(GameConstants.ErrorMessage.INVALID_EXECUTIVE_ACTION);
        }
    }

    private void validateTarget(GameRoom room, Player target, String currentPresidentId) {
        if (!target.isAlive()) {
            throw new GameException(GameConstants.ErrorMessage.TARGET_DEAD_OR_INVALID);
        }
        if (target.getId().equals(currentPresidentId)) {
            throw new GameException(GameConstants.ErrorMessage.CANNOT_TARGET_SELF);
        }
    }

    // Remaining helper methods (evaluateElectionResults, enactChaosPolicy, etc.) go here...
    private void evaluateElectionResults(GameRoom room) {
        room.getLastRevealedVotes().clear();
        room.getLastRevealedVotes().putAll(room.getCurrentVotes());
        room.getCurrentVotes().clear();

        long jaCount = room.getLastRevealedVotes().values().stream()
                .filter(v -> v == Vote.JA)
                .count();
        long neinCount = room.getLastRevealedVotes().size() - jaCount;

        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player nominee = room.getPlayerOrThrow(room.getNominatedChancellorId());

        if (jaCount > neinCount) {
            handleElectionSuccess(room, president, nominee, jaCount, neinCount);
        } else {
            handleElectionFailure(room, nominee, jaCount, neinCount);
        }
    }

    private void handleElectionSuccess(GameRoom room, Player president, Player chancellor, long jaCount, long neinCount) {
        room.setCurrentChancellorId(chancellor.getId());
        room.setNominatedChancellorId(null);
        room.setElectionTracker(0);

        room.setLastElectedPresidentId(president.getId());
        room.setLastElectedChancellorId(chancellor.getId());

        room.addLog(String.format(GameConstants.LogMessage.ELECTION_SUCCESS, jaCount, neinCount, chancellor.getNickname()));

        // Check Hitler Zone win condition
        if (room.getEnactedFascistPolicies() >= GameConstants.Rule.FASCIST_POLICIES_FOR_HITLER_ZONE
                && chancellor.getRole() == Role.HITLER) {
            room.setWinner(Winner.FASCIST);
            room.setWinReason(String.format(GameConstants.LogMessage.WIN_REASON_HITLER, chancellor.getNickname(),
                    GameConstants.Rule.FASCIST_POLICIES_FOR_HITLER_ZONE));
            room.setCurrentPhase(Phase.GAME_OVER);
            room.addLog(String.format(GameConstants.LogMessage.GAME_OVER, Winner.FASCIST.name(), room.getWinReason()));
            return;
        }

        ensureDrawDeckHasCards(room, GameConstants.Deck.PRESIDENT_DRAW_COUNT);
        room.getHandPolicies().clear();
        for (int i = 0; i < GameConstants.Deck.PRESIDENT_DRAW_COUNT; i++) {
            room.getHandPolicies().add(room.getDrawDeck().removeFirst());
        }

        room.setVetoRequestedThisRound(false);
        room.setCurrentPhase(Phase.LEGISLATIVE_PRESIDENT);
        room.addLog(String.format(GameConstants.LogMessage.LEGISLATIVE_PHASE, president.getNickname(),
                GameConstants.Deck.PRESIDENT_DRAW_COUNT));
    }

    private void handleElectionFailure(GameRoom room, Player nominee, long jaCount, long neinCount) {
        room.setNominatedChancellorId(null);
        int tracker = room.getElectionTracker() + 1;
        room.setElectionTracker(tracker);

        room.addLog(String.format(GameConstants.LogMessage.ELECTION_FAIL, jaCount, neinCount,
                nominee.getNickname(), tracker, GameConstants.Rule.MAX_ELECTION_TRACKER));

        if (tracker >= GameConstants.Rule.MAX_ELECTION_TRACKER) {
            enactChaosPolicy(room);
            if (room.getCurrentPhase() == Phase.GAME_OVER) {
                return;
            }
        }

        advanceToNextPresident(room);
    }

    private void enactChaosPolicy(GameRoom room) {
        ensureDrawDeckHasCards(room, GameConstants.Deck.CHAOS_DRAW_COUNT);
        PolicyType topPolicy = room.getDrawDeck().removeFirst();
        room.setElectionTracker(0);

        // Remove term limits in chaos mode
        room.setLastElectedPresidentId(null);
        room.setLastElectedChancellorId(null);

        executeEnactment(room, topPolicy, true);
    }

    private void assignRoles(List<Player> players) {
        int count = players.size();
        int fascistCount = (count - 3) / 2;
        int liberalCount = count - fascistCount - 1;

        List<Role> rolesPool = new ArrayList<>(count);
        rolesPool.add(Role.HITLER);
        for (int i = 0; i < fascistCount; i++) {
            rolesPool.add(Role.FASCIST);
        }
        for (int i = 0; i < liberalCount; i++) {
            rolesPool.add(Role.LIBERAL);
        }

        Collections.shuffle(rolesPool, random);

        for (int i = 0; i < count; i++) {
            Player p = players.get(i);
            p.setRole(rolesPool.get(i));
            p.setAlive(true);
            p.setInvestigated(false);
        }
    }

    private void initializePolicyDeck(GameRoom room) {
        room.getDrawDeck().clear();
        room.getDiscardDeck().clear();
        room.getHandPolicies().clear();

        for (int i = 0; i < GameConstants.Deck.INITIAL_LIBERAL_POLICIES; i++) {
            room.getDrawDeck().add(PolicyType.LIBERAL);
        }
        for (int i = 0; i < GameConstants.Deck.INITIAL_FASCIST_POLICIES; i++) {
            room.getDrawDeck().add(PolicyType.FASCIST);
        }

        Collections.shuffle(room.getDrawDeck(), random);
    }

    private void resetRoomForNewGame(GameRoom room) {
        room.setReturnToPresidentIndexAfterSpecial(null);
        room.setCurrentPresidentId(null);
        room.setCurrentChancellorId(null);
        room.setNominatedChancellorId(null);
        room.setLastElectedPresidentId(null);
        room.setLastElectedChancellorId(null);
        room.setElectionTracker(0);
        room.getCurrentVotes().clear();
        room.getLastRevealedVotes().clear();
        room.setEnactedLiberalPolicies(0);
        room.setEnactedFascistPolicies(0);
        room.setVetoRequestedThisRound(false);
        room.setPendingExecutiveAction(ExecutiveAction.NONE);
        room.setWinner(Winner.NONE);
        room.setWinReason(null);
        room.getInvestigationResults().clear();
    }

    private Player getPlayerBySessionOrThrow(GameRoom room, String sessionToken) {
        return room.findBySessionToken(sessionToken)
                .orElseThrow(() -> new GameException(GameConstants.ErrorMessage.SESSION_TOKEN_NOT_FOUND));
    }
}
