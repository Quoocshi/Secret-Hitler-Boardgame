package com.example.backend.dto;
import com.example.backend.domain.enums.PolicyType;
public record InvestigationResultDTO(String investigationId, String targetPlayerId, PolicyType partyMembership) {}
