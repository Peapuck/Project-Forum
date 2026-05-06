package com.projectl.forum.dto;

public record ForumSearchResponse(
    String type,
    Long id,
    String title,
    String subtitle,
    String url
) {
}
