package com.projectl.forum.dto;

import java.time.LocalDateTime;

public record ForumCommentResponse(
    Long id,
    Long topicId,
    String topicTitle,
    Long forumId,
    String forumTitle,
    Long parentCommentId,
    Long userId,
    String username,
    String avatarUrl,
    String content,
    String attachmentUrl,
    String attachmentType,
    long likesCount,
    boolean likedByCurrentUser,
    boolean pinned,
    boolean authorComment,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    boolean edited
) {
}
