package com.projectl.forum.dto;

public record ForumCategoryResponse(
    Long id,
    Long forumId,
    String name,
    String slug,
    long topicCount
) {
}
