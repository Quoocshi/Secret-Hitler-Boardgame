package com.example.backend.service;

import com.example.backend.domain.enums.Vote;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;

import java.util.List;

public interface GameEngineService {

    // Initializes role assignments, resets trackers, shuffles policy deck, and picks the first president
    void startGame(GameRoom room, String hostSessionToken);

    // Resets a finished game room back to the LOBBY phase so players can play a rematch
    void resetToLobby(GameRoom room, String hostSessionToken);

    // Current president nominates a player as Chancellor candidate and transitions game to voting phase
    void nominateChancellor(GameRoom room, String presidentSessionToken, String nomineePlayerId);

    // Filters and returns living players eligible for Chancellor under term-limit rules
    List<Player> getEligibleChancellors(GameRoom room);

    // Records an alive player's vote and evaluates election results once all ballots are submitted
    void castVote(GameRoom room, String voterSessionToken, Vote vote);

    // Rotates the presidency to the next living player clockwise and sets phase to nomination
    void advanceToNextPresident(GameRoom room);

    // Reshuffles discard pile back into the draw deck when remaining cards fall below minimum threshold
    void ensureDrawDeckHasCards(GameRoom room, int minCards);

    // President discards one of three drawn policy cards and hands the remaining two to the Chancellor
    void presidentDiscardPolicy(GameRoom room, String sessionToken, int policyIndex);

    // Chancellor enacts one policy card, discards the other, and triggers win checks or executive powers
    void chancellorEnactPolicy(GameRoom room, String sessionToken, int policyIndex);

    // Chancellor initiates a veto request when unlocked at 5 enacted fascist policies
    void chancellorRequestVeto(GameRoom room, String sessionToken);

    // President approves or denies the Chancellor's veto request
    void presidentRespondToVeto(GameRoom room, String sessionToken, boolean approve);

    // President executes a target player, eliminating them or ending the game if Hitler is killed
    void executePlayer(GameRoom room, String sessionToken, String targetPlayerId);

    // President investigates a target player's party membership (Liberal or Fascist)
    void investigatePlayer(GameRoom room, String sessionToken, String targetPlayerId);

    // President appoints the next president out of turn while preserving standard turn order afterward
    void callSpecialElection(GameRoom room, String sessionToken, String targetPlayerId);

    // Concludes Policy Peek or Loyalty Investigation after the President views the secret result
    void endExecutiveAction(GameRoom room, String sessionToken);
}