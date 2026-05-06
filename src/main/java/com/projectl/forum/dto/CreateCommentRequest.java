package com.projectl.forum.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateCommentRequest(
    @NotBlank(message = "Comment content is required")
    @Size(max = 5000, message = "Comment is too long")
    String content,
    Long parentCommentId,
    String attachmentUrl,
    String attachmentType
) {
}
