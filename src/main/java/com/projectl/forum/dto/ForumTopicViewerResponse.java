package com.projectl.forum.dto;

import java.time.LocalDateTime;

public record ForumTopicViewerResponse(
    Long id,
    String username,
    String avatarUrl,
    LocalDateTime viewedAt
) {
}
