package com.example.backend.dto;
public record ActionResultDTO(String actionId, String action, String status, String code, String message, long stateVersion) {}
