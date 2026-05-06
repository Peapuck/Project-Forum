package com.projectl.forum.dto;

import java.time.LocalDateTime;

public record ForumTopicDetailsResponse(
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
    String content,
    String attachmentUrl,
    String attachmentType,
    String tags,
    String pollQuestion,
    String pollOptions,
    String codeBlock,
    String codeLanguage,
    long commentsCount,
    long likesCount,
    long viewsCount,
    boolean likedByCurrentUser,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    LocalDateTime lastActivityAt
) {
}
