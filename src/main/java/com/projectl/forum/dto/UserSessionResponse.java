package com.projectl.forum.dto;

public record UserSessionResponse(
    Long id,
    String username,
    String email,
    String avatarUrl,
    String bio,
    boolean admin,
    boolean blocked,
    boolean deleted
) {
}
