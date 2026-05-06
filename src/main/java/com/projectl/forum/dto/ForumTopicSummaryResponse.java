package com.projectl.forum.dto;

import java.time.LocalDateTime;

public record ForumTopicSummaryResponse(
    Long id,
    Long forumId,
    String forumTitle,
    String forumSlug,
    Long categoryId,
    String categoryName,
    Long userId,
    String username,
    String avatarUrl,
    String title,
    String excerpt,
    String tags,
    long commentsCount,
    long likesCount,
    long viewsCount,
    boolean likedByCurrentUser,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime lastActivityAt
) {
}
