package com.projectl.forum.dto;

public record AdminUserResponse(
    Long id,
    String username,
    String email,
    String avatarUrl,
    boolean admin,
    boolean blocked,
    boolean deleted
) {
}
