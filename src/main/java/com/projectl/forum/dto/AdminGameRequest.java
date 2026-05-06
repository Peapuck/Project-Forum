package com.projectl.forum.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminGameRequest(
    @NotBlank(message = "Forum title is required")
    @Size(max = 200, message = "Forum title is too long")
    String title,
    @Size(max = 120, message = "Forum slug is too long")
    String slug
) {
}
