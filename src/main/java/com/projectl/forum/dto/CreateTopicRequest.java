package com.projectl.forum.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTopicRequest(
    @JsonAlias("gameId")
    @NotNull(message = "forumId is required")
    Long forumId,
    @NotNull(message = "categoryId is required")
    Long categoryId,
    @NotBlank(message = "Topic title is required")
    @Size(max = 200, message = "Topic title is too long")
    String title,
    @NotBlank(message = "Topic content is required")
    @Size(max = 10000, message = "Topic content is too long")
    String content,
    String attachmentUrl,
    String attachmentType,
    String tags,
    String pollQuestion,
    String pollOptions,
    String codeBlock,
    String codeLanguage
) {
    public Long gameId() {
        return forumId;
    }
}
