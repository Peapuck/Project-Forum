package com.projectl.forum.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateAvatarRequest(
    @NotBlank(message = "Avatar is required")
    @Size(max = 10_000_000, message = "Avatar payload is too large")
    String avatarUrl
) {
}
