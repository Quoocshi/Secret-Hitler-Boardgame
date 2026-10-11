package com.example.backend.domain.enums;

public enum Role {
    LIBERAL,
    FASCIST,
    HITLER;
    public PolicyType getPartyMembership() {
        return this == LIBERAL ? PolicyType.LIBERAL : PolicyType.FASCIST;
    }
}
