package com.projectl.forum.service;

import com.projectl.forum.dto.AdminGameRequest;
import com.projectl.forum.dto.AdminUserResponse;
import com.projectl.forum.dto.AdminUserStatusRequest;
import com.projectl.forum.dto.ForumGameResponse;
import com.projectl.forum.entity.ForumCategory;
import com.projectl.forum.entity.ForumComment;
import com.projectl.forum.entity.ForumTopic;
import com.projectl.forum.entity.Game;
import com.projectl.forum.entity.User;
import com.projectl.forum.exception.BadRequestException;
import com.projectl.forum.exception.ForbiddenException;
import com.projectl.forum.exception.NotFoundException;
import com.projectl.forum.repository.ForumCategoryRepository;
import com.projectl.forum.repository.ForumCommentRepository;
import com.projectl.forum.repository.ForumTopicRepository;
import com.projectl.forum.repository.GameRepository;
import com.projectl.forum.repository.UserRepository;
import java.lang.reflect.Field;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private static final Map<String, String> DEFAULT_CATEGORIES = new LinkedHashMap<>();

    static {
        DEFAULT_CATEGORIES.put("general-discussions", "Обычные обсуждения");
        DEFAULT_CATEGORIES.put("bugs-and-issues", "Баги и проблемы");
        DEFAULT_CATEGORIES.put("help", "Помощь");
        DEFAULT_CATEGORIES.put("guides", "Руководства");
    }

    private final UserRepository userRepository;
    private final GameRepository gameRepository;
    private final ForumCategoryRepository categoryRepository;
    private final ForumTopicRepository topicRepository;
    private final ForumCommentRepository commentRepository;

    public AdminService(
        UserRepository userRepository,
        GameRepository gameRepository,
        ForumCategoryRepository categoryRepository,
        ForumTopicRepository topicRepository,
        ForumCommentRepository commentRepository
    ) {
        this.userRepository = userRepository;
        this.gameRepository = gameRepository;
        this.categoryRepository = categoryRepository;
        this.topicRepository = topicRepository;
        this.commentRepository = commentRepository;
    }

    @Transactional(readOnly = true)
    public List<AdminUserResponse> getUsers(Long adminUserId) {
        requireAdmin(adminUserId);
        return userRepository.findAllByOrderByIdAsc().stream().map(this::toUserResponse).toList();
    }

    @Transactional
    public AdminUserResponse updateUserStatus(Long userId, Long adminUserId, AdminUserStatusRequest request) {
        User admin = requireAdmin(adminUserId);
        User user = requireUser(userId);
        if (user.getId().equals(admin.getId())) {
            throw new BadRequestException("Admin cannot restrict own account");
        }
        user.setBlocked(request.blocked());
        return toUserResponse(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long userId, Long adminUserId) {
        User admin = requireAdmin(adminUserId);
        User user = requireUser(userId);
        if (user.getId().equals(admin.getId())) {
            throw new BadRequestException("Admin cannot delete own account");
        }
        user.setDeleted(true);
        user.setBlocked(false);
        user.setUsername("Deleted user " + user.getId());
        user.setEmail("deleted-" + user.getId() + "@deleted.local");
        user.setPasswordHash(null);
        user.setAvatarUrl(null);
        userRepository.save(user);
    }

    @Transactional
    public ForumGameResponse createGame(Long adminUserId, AdminGameRequest request) {
        requireAdmin(adminUserId);
        String title = clean(request.title(), "Forum title is required");
        String slug = cleanSlug(request.slug() == null || request.slug().isBlank() ? slugify(title) : request.slug());
        if (gameRepository.existsBySlug(slug)) {
            throw new BadRequestException("Forum slug already exists");
        }
        Game game = new Game();
        game.setTitle(title);
        game.setSlug(slug);
        Game saved = gameRepository.save(game);
        ensureDefaultCategories(saved);
        return new ForumGameResponse(saved.getId(), saved.getTitle(), saved.getSlug());
    }

    @Transactional
    public void deleteGame(Long gameId, Long adminUserId) {
        requireAdmin(adminUserId);
        Game game = gameRepository.findById(gameId).orElseThrow(() -> new NotFoundException("Forum not found"));
        gameRepository.delete(game);
    }

    @Transactional
    public void deleteTopic(Long topicId, Long adminUserId) {
        requireAdmin(adminUserId);
        ForumTopic topic = topicRepository.findById(topicId).orElseThrow(() -> new NotFoundException("Topic not found"));
        topicRepository.delete(topic);
    }

    @Transactional
    public void deleteComment(Long commentId, Long adminUserId) {
        requireAdmin(adminUserId);
        ForumComment comment = commentRepository.findById(commentId).orElseThrow(() -> new NotFoundException("Comment not found"));
        ForumTopic topic = comment.getTopic();
        commentRepository.delete(comment);
        topic.setCommentsCount(commentRepository.countByTopicId(topic.getId()));
        topic.setLastActivityAt(LocalDateTime.now());
        topicRepository.save(topic);
    }

    private void ensureDefaultCategories(Game game) {
        Map<String, ForumCategory> existingBySlug = new LinkedHashMap<>();
        for (ForumCategory category : categoryRepository.findByGameIdOrderByNameAsc(game.getId())) {
            existingBySlug.putIfAbsent(category.getSlug(), category);
        }
        for (Map.Entry<String, String> entry : DEFAULT_CATEGORIES.entrySet()) {
            if (existingBySlug.containsKey(entry.getKey())) {
                continue;
            }
            ForumCategory category = new ForumCategory();
            setField(category, "game", game);
            setField(category, "name", entry.getValue());
            setField(category, "slug", entry.getKey());
            categoryRepository.save(category);
        }
    }

    private User requireAdmin(Long adminUserId) {
        User user = requireUser(adminUserId);
        if (user.isDeleted() || !user.isAdmin()) {
            throw new ForbiddenException("Admin access required");
        }
        return user;
    }

    private User requireUser(Long userId) {
        if (userId == null) {
            throw new ForbiddenException("Authentication required");
        }
        return userRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
    }

    private AdminUserResponse toUserResponse(User user) {
        return new AdminUserResponse(
            user.getId(),
            user.isDeleted() ? "Deleted user" : user.getUsername(),
            user.isDeleted() ? null : user.getEmail(),
            user.getAvatarUrl(),
            user.isAdmin(),
            user.isBlocked(),
            user.isDeleted()
        );
    }

    private String clean(String value, String errorMessage) {
        if (value == null || value.trim().isEmpty()) {
            throw new BadRequestException(errorMessage);
        }
        return value.trim();
    }

    private String cleanSlug(String value) {
        String slug = clean(value, "Forum slug is required").toLowerCase(Locale.ROOT);
        if (!slug.matches("[a-z0-9-]+")) {
            throw new BadRequestException("Slug can contain latin letters, numbers and hyphens only");
        }
        return slug;
    }

    private String slugify(String value) {
        String slug = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
        return slug.isBlank() ? "forum-" + System.currentTimeMillis() : slug;
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Cannot initialize forum categories", ex);
        }
    }
}
