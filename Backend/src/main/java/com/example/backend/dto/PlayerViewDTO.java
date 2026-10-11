package com.example.backend.dto;

import com.example.backend.domain.enums.ExecutiveAction;
import com.example.backend.domain.enums.Phase;
import com.example.backend.domain.enums.PolicyType;
import com.example.backend.domain.enums.Role;
import com.example.backend.domain.enums.Winner;

import java.util.List;

public record PlayerViewDTO(
        String roomCode,
        Phase currentPhase,

        // General Game Status
        int enactedLiberalPolicies,
        int enactedFascistPolicies,
        int electionTracker,
        int drawDeckSize,
        int discardDeckSize,

        // Presidency & Government
        String currentPresidentId,
        String currentChancellorId,
        String nominatedChancellorId,
        String lastElectedPresidentId,
        String lastElectedChancellorId,

        // Executive Actions & End Game
        ExecutiveAction pendingExecutiveAction,
        Winner winner,
        String winReason,

        // Public Players Data (NO secret roles exposed here)
        List<PublicPlayerDTO> players,
        List<String> gameLogs,

        String myPlayerId,
        Role myRole,

        // Teammates or Investigation results (e.g., a Fascist seeing other Fascists)
        List<String> knownAllyIds,

        // Cards currently held by this specific player (during legislative or policy peek)
        List<PolicyType> handCards,

        // The result of an investigate loyalty action (only populated if the player is the investigating President)
        PolicyType investigatedPartyMembership,
        long stateVersion,
        boolean vetoRequestedThisRound,
        List<InvestigationResultDTO> investigationResults
) {}
