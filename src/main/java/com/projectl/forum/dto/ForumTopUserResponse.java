package com.projectl.forum.dto;

public record ForumTopUserResponse(
    Long id,
    String username,
    String avatarUrl,
    long likesCount
) {
}
