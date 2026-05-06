package com.projectl.forum.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @NotBlank(message = "Username is required")
    @Size(max = 50, message = "Username is too long")
    String username,
    String avatarUrl,
    String bio,
    String email,
    String currentPassword,
    String newPassword
) {
}
