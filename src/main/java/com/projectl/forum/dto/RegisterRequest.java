package com.projectl.forum.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "Username is required")
    @Size(max = 100, message = "Username is too long")
    String username,
    @Email(message = "Email format is invalid")
    @NotBlank(message = "Email is required")
    String email,
    @NotBlank(message = "Password is required")
    @Size(min = 4, message = "Password must be at least 4 characters")
    String password
) {
}
