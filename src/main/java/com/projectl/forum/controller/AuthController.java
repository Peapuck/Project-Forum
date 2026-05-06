package com.projectl.forum.controller;

import com.projectl.forum.dto.AuthRequest;
import com.projectl.forum.dto.DeleteAccountRequest;
import com.projectl.forum.dto.RegisterRequest;
import com.projectl.forum.dto.UpdateProfileRequest;
import com.projectl.forum.dto.UpdateAvatarRequest;
import com.projectl.forum.dto.UserSessionResponse;
import com.projectl.forum.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserSessionResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public UserSessionResponse login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request);
    }

    @GetMapping("/users/{userId}")
    public UserSessionResponse getProfile(
        @PathVariable Long userId,
        @RequestHeader(value = "X-User-Id", required = false) Long currentUserId
    ) {
        return authService.getProfile(userId, currentUserId);
    }

    @PostMapping("/users/{userId}/avatar")
    public UserSessionResponse updateAvatar(
        @PathVariable Long userId,
        @Valid @RequestBody UpdateAvatarRequest request
    ) {
        return authService.updateAvatar(userId, request);
    }

    @PutMapping("/users/{userId}")
    public UserSessionResponse updateProfile(
        @PathVariable Long userId,
        @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        return authService.updateProfile(userId, currentUserId, request);
    }

    @DeleteMapping("/users/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(
        @PathVariable Long userId,
        @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,
        @Valid @RequestBody DeleteAccountRequest request
    ) {
        authService.deleteAccount(userId, currentUserId, request);
    }
}
