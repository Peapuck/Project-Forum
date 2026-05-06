package com.projectl.forum.service;

import com.projectl.forum.dto.AuthRequest;
import com.projectl.forum.dto.DeleteAccountRequest;
import com.projectl.forum.dto.RegisterRequest;
import com.projectl.forum.dto.UpdateAvatarRequest;
import com.projectl.forum.dto.UpdateProfileRequest;
import com.projectl.forum.dto.UserSessionResponse;
import com.projectl.forum.entity.User;
import com.projectl.forum.exception.BadRequestException;
import com.projectl.forum.exception.ForbiddenException;
import com.projectl.forum.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserSessionResponse register(RegisterRequest request) {
        String email = request.email().trim();
        String username = request.username().trim();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email already registered");
        }
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new BadRequestException("Username already taken");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));

        return toSession(userRepository.save(user), true);
    }

    @Transactional(readOnly = true)
    public UserSessionResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.email().trim())
            .orElseThrow(() -> new ForbiddenException("Invalid email or password"));

        if (user.isDeleted() || user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ForbiddenException("Invalid email or password");
        }

        return toSession(user, true);
    }

    @Transactional(readOnly = true)
    public UserSessionResponse getProfile(Long userId, Long currentUserId) {
        User user = findUser(userId);
        boolean includeEmail = currentUserId != null && userId.equals(currentUserId);
        return toSession(user, includeEmail);
    }

    @Transactional
    public UserSessionResponse updateAvatar(Long userId, UpdateAvatarRequest request) {
        User user = findUser(userId);
        if (user.isDeleted()) {
            throw new ForbiddenException("Deleted account cannot be updated");
        }
        user.setAvatarUrl(normalizeAvatar(request.avatarUrl(), true));
        return toSession(userRepository.save(user), true);
    }

    @Transactional
    public UserSessionResponse updateProfile(Long userId, Long currentUserId, UpdateProfileRequest request) {
        User user = findUser(userId);
        validateSelf(userId, currentUserId);
        if (user.isDeleted()) {
            throw new ForbiddenException("Deleted account cannot be updated");
        }

        String username = request.username().trim();
        userRepository.findByUsernameIgnoreCase(username)
            .filter(existing -> !existing.getId().equals(userId))
            .ifPresent(existing -> {
                throw new BadRequestException("Username already taken");
            });

        user.setUsername(username);
        user.setAvatarUrl(normalizeAvatar(request.avatarUrl(), false));
        user.setBio(blankToNull(request.bio()));

        String email = blankToNull(request.email());
        if (email != null && !email.equals(user.getEmail())) {
            userRepository.findByEmail(email)
                .filter(existing -> !existing.getId().equals(userId))
                .ifPresent(existing -> {
                    throw new BadRequestException("Email already registered");
                });
            user.setEmail(email);
        }

        String newPassword = blankToNull(request.newPassword());
        if (newPassword != null) {
            String currentPassword = blankToNull(request.currentPassword());
            if (currentPassword == null || user.getPasswordHash() == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
                throw new ForbiddenException("Current password is invalid");
            }
            if (newPassword.length() < 6) {
                throw new BadRequestException("Password must contain at least 6 characters");
            }
            user.setPasswordHash(passwordEncoder.encode(newPassword));
        }

        return toSession(userRepository.save(user), true);
    }

    @Transactional
    public void deleteAccount(Long userId, Long currentUserId, DeleteAccountRequest request) {
        User user = findUser(userId);
        validateSelf(userId, currentUserId);
        if (user.isDeleted()) {
            return;
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ForbiddenException("Invalid password");
        }

        user.setDeleted(true);
        user.setUsername("Deleted user " + user.getId());
        user.setEmail("deleted-" + user.getId() + "@deleted.local");
        user.setPasswordHash(null);
        user.setAvatarUrl(null);
        userRepository.save(user);
    }

    private void validateSelf(Long userId, Long currentUserId) {
        if (currentUserId == null || !userId.equals(currentUserId)) {
            throw new ForbiddenException("You can update only your own profile");
        }
    }

    private String normalizeAvatar(String avatarUrl, boolean required) {
        String normalized = avatarUrl == null ? null : avatarUrl.trim();
        if (normalized == null || normalized.isEmpty()) {
            if (required) {
                throw new BadRequestException("Avatar is required");
            }
            return null;
        }
        if (!normalized.startsWith("data:image/")) {
            throw new BadRequestException("Avatar must be an image");
        }
        return normalized;
    }

    private String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new BadRequestException("User not found"));
    }

    private UserSessionResponse toSession(User user, boolean includeEmail) {
        return new UserSessionResponse(
            user.getId(),
            user.isDeleted() ? "Deleted user" : user.getUsername(),
            user.isDeleted() || !includeEmail ? null : user.getEmail(),
            user.getAvatarUrl(),
            user.getBio(),
            user.isAdmin(),
            user.isBlocked(),
            user.isDeleted()
        );
    }
}
