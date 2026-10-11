package com.example.backend.dto;

public record WebRtcSignalMessage(
        String type,
        String senderId,
        String targetId,
        Object data
) {}