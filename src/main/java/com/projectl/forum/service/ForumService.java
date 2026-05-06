package com.projectl.forum.service;

import com.projectl.forum.dto.CreateCommentRequest;
import com.projectl.forum.dto.CreateTopicRequest;
import com.projectl.forum.dto.ForumCategoryResponse;
import com.projectl.forum.dto.ForumCommentResponse;
import com.projectl.forum.dto.ForumGameResponse;
import com.projectl.forum.dto.ForumSearchResponse;
import com.projectl.forum.dto.ForumTopUserResponse;
import com.projectl.forum.dto.ForumTopicDetailsResponse;
import com.projectl.forum.dto.ForumTopicSummaryResponse;
import com.projectl.forum.dto.ForumTopicViewerResponse;
import com.projectl.forum.entity.ForumCategory;
import com.projectl.forum.entity.ForumComment;
import com.projectl.forum.entity.ForumCommentLike;
import com.projectl.forum.entity.ForumTopic;
import com.projectl.forum.entity.ForumTopicLike;
import com.projectl.forum.entity.ForumTopicView;
import com.projectl.forum.entity.Game;
import com.projectl.forum.entity.User;
import com.projectl.forum.exception.BadRequestException;
import com.projectl.forum.exception.ForbiddenException;
import com.projectl.forum.exception.NotFoundException;
import com.projectl.forum.repository.ForumCategoryRepository;
import com.projectl.forum.repository.ForumCommentLikeRepository;
import com.projectl.forum.repository.ForumCommentRepository;
import com.projectl.forum.repository.ForumTopicLikeRepository;
import com.projectl.forum.repository.ForumTopicRepository;
import com.projectl.forum.repository.ForumTopicViewRepository;
import com.projectl.forum.repository.GameRepository;
import com.projectl.forum.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ForumService {

    private static final long MAX_ATTACHMENT_BYTES = 900L * 1024L * 1024L;

    private final ForumCategoryRepository categoryRepository;
    private final ForumTopicRepository topicRepository;
    private final ForumCommentRepository commentRepository;
    private final ForumTopicLikeRepository topicLikeRepository;
    private final ForumCommentLikeRepository commentLikeRepository;
    private final GameRepository gameRepository;
    private final ForumTopicViewRepository topicViewRepository;
    private final UserRepository userRepository;

    public ForumService(
        ForumCategoryRepository categoryRepository,
        ForumTopicRepository topicRepository,
        ForumCommentRepository commentRepository,
        ForumTopicLikeRepository topicLikeRepository,
        ForumCommentLikeRepository commentLikeRepository,
        GameRepository gameRepository,
        ForumTopicViewRepository topicViewRepository,
        UserRepository userRepository
    ) {
        this.categoryRepository = categoryRepository;
        this.topicRepository = topicRepository;
        this.commentRepository = commentRepository;
        this.topicLikeRepository = topicLikeRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.gameRepository = gameRepository;
        this.topicViewRepository = topicViewRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public ForumGameResponse getGameById(Long gameId) {
        Game game = requireGame(gameId);
        return new ForumGameResponse(game.getId(), game.getTitle(), game.getSlug());
    }

    @Transactional(readOnly = true)
    public ForumGameResponse getGameBySlug(String slug) {
        Game game = gameRepository.findBySlug(slug)
            .orElseThrow(() -> new NotFoundException("Forum not found"));
        return new ForumGameResponse(game.getId(), game.getTitle(), game.getSlug());
    }

    @Transactional(readOnly = true)
    public List<ForumGameResponse> getAllGames() {
        return gameRepository.findAllByOrderByTitleAsc().stream()
            .map(game -> new ForumGameResponse(game.getId(), game.getTitle(), game.getSlug()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ForumCategoryResponse> getCategoriesByGame(Long gameId) {
        requireGame(gameId);
        return categoryRepository.findCategoriesWithTopicCount(gameId).stream()
            .map(row -> {
                ForumCategory category = (ForumCategory) row[0];
                long count = (Long) row[1];
                return new ForumCategoryResponse(category.getId(), category.getGame().getId(), category.getName(), category.getSlug(), count);
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ForumTopicSummaryResponse> getTopics(Long gameId, Long categoryId, Long currentUserId) {
        requireGame(gameId);
        List<ForumTopic> topics = categoryId == null
            ? topicRepository.findByGameIdOrderByLastActivityAtDescCreatedAtDesc(gameId)
            : topicRepository.findByGameIdAndCategoryIdOrderByLastActivityAtDescCreatedAtDesc(gameId, categoryId);
        return topics.stream().map(topic -> toSummaryResponse(topic, currentUserId)).toList();
    }

    @Transactional(readOnly = true)
    public List<ForumTopicSummaryResponse> getTopicsByUser(Long userId, Long currentUserId) {
        requireUser(userId);
        return topicRepository.findByUserIdOrderByLastActivityAtDescCreatedAtDesc(userId).stream()
            .map(topic -> toSummaryResponse(topic, currentUserId))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ForumTopicSummaryResponse> getPopularTopics(Long currentUserId) {
        return topicRepository.findTop10ByOrderByCommentsCountDescViewsCountDescLastActivityAtDesc().stream()
            .map(topic -> toSummaryResponse(topic, currentUserId))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ForumTopUserResponse> getTopUsers() {
        return userRepository.findAllByOrderByIdAsc().stream()
            .filter(user -> !user.isDeleted())
            .map(user -> new ForumTopUserResponse(
                user.getId(),
                displayUsername(user),
                user.getAvatarUrl(),
                topicRepository.findByUserIdOrderByLastActivityAtDescCreatedAtDesc(user.getId()).stream()
                    .mapToLong(topic -> topic.getLikesCount() == null ? 0L : topic.getLikesCount())
                    .sum()
                    + commentRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                    .mapToLong(comment -> comment.getLikesCount() == null ? 0L : comment.getLikesCount())
                    .sum()
            ))
            .sorted(Comparator.comparingLong(ForumTopUserResponse::likesCount).reversed()
                .thenComparing(ForumTopUserResponse::username, String.CASE_INSENSITIVE_ORDER))
            .limit(5)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ForumTopicSummaryResponse> getGuideTopics(Long currentUserId) {
        return topicRepository.findTop20ByCategorySlugOrderByLastActivityAtDescCreatedAtDesc("guides").stream()
            .map(topic -> toSummaryResponse(topic, currentUserId))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ForumSearchResponse> search(String query) {
        String normalized = clean(query, "Search query is required");
        String searchText = normalized.startsWith("#") ? normalized.substring(1).trim() : normalized;

        List<ForumSearchResponse> forums = gameRepository.findTop8ByTitleContainingIgnoreCaseOrderByTitleAsc(searchText).stream()
            .map(game -> new ForumSearchResponse("forum", game.getId(), game.getTitle(), "Форум", "forum.html?forumSlug=" + game.getSlug()))
            .toList();

        List<ForumTopic> matchedTopics = topicRepository.findTop20ByTitleContainingIgnoreCaseOrTagsContainingIgnoreCaseOrderByLastActivityAtDesc(searchText, searchText);

        List<ForumSearchResponse> tags = matchedTopics.stream()
            .flatMap(topic -> splitTags(topic.getTags()).stream())
            .filter(tag -> tag.toLowerCase(java.util.Locale.ROOT).contains(searchText.toLowerCase(java.util.Locale.ROOT)))
            .distinct()
            .limit(6)
            .map(tag -> new ForumSearchResponse("tag", (long) -Math.abs(tag.toLowerCase(java.util.Locale.ROOT).hashCode()), "#" + tag, "Тег", "index.html#/?tag=" + java.net.URLEncoder.encode(tag, java.nio.charset.StandardCharsets.UTF_8)))
            .toList();

        List<ForumSearchResponse> topics = matchedTopics.stream()
            .limit(10)
            .map(topic -> new ForumSearchResponse("topic", topic.getId(), topic.getTitle(), topic.getGame().getTitle(), "forum_topic.html?topicId=" + topic.getId()))
            .toList();

        return java.util.stream.Stream.concat(tags.stream(), java.util.stream.Stream.concat(forums.stream(), topics.stream())).limit(12).toList();
    }

    @Transactional
    public ForumTopicDetailsResponse getTopic(Long topicId, Long userId) {
        ForumTopic topic = findTopic(topicId);
        if (userId != null && !topicViewRepository.existsByTopicIdAndUserId(topicId, userId)) {
            User user = requireAuthorizedUser(userId);
            ForumTopicView view = new ForumTopicView();
            view.setTopic(topic);
            view.setUser(user);
            topicViewRepository.save(view);
            topic.setViewsCount(topic.getViewsCount() + 1);
            topic = topicRepository.save(topic);
        }
        return toDetailsResponse(topic, userId);
    }

    @Transactional(readOnly = true)
    public List<ForumTopicViewerResponse> getTopicViewers(Long topicId) {
        findTopic(topicId);
        return topicViewRepository.findByTopicIdOrderByCreatedAtDesc(topicId).stream()
            .filter(view -> !view.getUser().isDeleted())
            .map(view -> new ForumTopicViewerResponse(
                view.getUser().getId(),
                displayUsername(view.getUser()),
                view.getUser().getAvatarUrl(),
                view.getCreatedAt()
            ))
            .toList();
    }

    @Transactional
    public ForumTopicDetailsResponse toggleLike(Long topicId, Long userId) {
        User user = requireAuthorizedUser(userId);
        ForumTopic topic = findTopic(topicId);

        topicLikeRepository.findByTopicIdAndUserId(topicId, user.getId())
            .ifPresentOrElse(existingLike -> {
                topicLikeRepository.delete(existingLike);
                topic.setLikesCount(Math.max(0, topic.getLikesCount() - 1));
            }, () -> {
                ForumTopicLike like = new ForumTopicLike();
                like.setTopic(topic);
                like.setUser(user);
                topicLikeRepository.save(like);
                topic.setLikesCount(topic.getLikesCount() + 1);
            });

        return toDetailsResponse(topicRepository.save(topic), userId);
    }

    @Transactional(readOnly = true)
    public List<ForumCommentResponse> getComments(Long topicId, String sort, Long currentUserId) {
        ForumTopic topic = findTopic(topicId);
        List<ForumComment> comments = "likes".equalsIgnoreCase(sort)
            ? commentRepository.findByTopicIdOrderByLikesCountDescCreatedAtDesc(topicId)
            : commentRepository.findByTopicIdOrderByCreatedAtAsc(topicId);

        Comparator<ForumComment> comparator = "likes".equalsIgnoreCase(sort)
            ? Comparator.comparing(ForumComment::isPinned).reversed()
                .thenComparing(ForumComment::getLikesCount, Comparator.reverseOrder())
                .thenComparing(ForumComment::getCreatedAt, Comparator.reverseOrder())
            : Comparator.comparing(ForumComment::isPinned).reversed()
                .thenComparing(ForumComment::getCreatedAt, Comparator.reverseOrder());

        return comments.stream()
            .sorted(comparator.thenComparing(ForumComment::getId))
            .map(comment -> toCommentResponse(comment, currentUserId, topic.getUser().getId()))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<ForumCommentResponse> getCommentsByUser(Long userId) {
        requireUser(userId);
        return commentRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(comment -> toCommentResponse(comment, null, comment.getTopic().getUser().getId()))
            .toList();
    }

    @Transactional
    public ForumTopicDetailsResponse createTopic(Long userId, CreateTopicRequest request) {
        User author = requireContentAuthor(userId);
        Game game = requireGame(request.gameId());
        ForumCategory category = categoryRepository.findByIdAndGameId(request.categoryId(), request.gameId())
            .orElseThrow(() -> new BadRequestException("Category does not belong to the selected forum"));
        String attachmentType = validateAttachment(request.attachmentUrl(), request.attachmentType());

        ForumTopic topic = new ForumTopic();
        topic.setGame(game);
        topic.setCategory(category);
        topic.setUser(author);
        topic.setTitle(clean(request.title(), "Topic title is required"));
        topic.setContent(clean(request.content(), "Topic content is required"));
        topic.setAttachmentUrl(blankToNull(request.attachmentUrl()));
        topic.setAttachmentType(attachmentType);
        applyTopicExtras(topic, request);

        return toDetailsResponse(topicRepository.save(topic), userId);
    }

    @Transactional
    public ForumCommentResponse createComment(Long topicId, Long userId, CreateCommentRequest request) {
        User author = requireContentAuthor(userId);
        ForumTopic topic = findTopic(topicId);
        String attachmentType = validateAttachment(request.attachmentUrl(), request.attachmentType());

        ForumComment comment = new ForumComment();
        comment.setTopic(topic);
        comment.setUser(author);
        comment.setContent(clean(request.content(), "Comment content is required"));
        comment.setAttachmentUrl(blankToNull(request.attachmentUrl()));
        comment.setAttachmentType(attachmentType);
        if (request.parentCommentId() != null) {
            ForumComment parent = findComment(request.parentCommentId());
            if (!parent.getTopic().getId().equals(topicId)) {
                throw new BadRequestException("Reply must belong to the same topic");
            }
            comment.setParentComment(parent);
        }

        ForumComment savedComment = commentRepository.save(comment);
        syncTopicCounters(topic);
        return toCommentResponse(savedComment, userId, topic.getUser().getId());
    }

    @Transactional
    public ForumCommentResponse toggleCommentLike(Long commentId, Long userId) {
        User user = requireAuthorizedUser(userId);
        ForumComment comment = findComment(commentId);

        commentLikeRepository.findByCommentIdAndUserId(commentId, user.getId())
            .ifPresentOrElse(existingLike -> {
                commentLikeRepository.delete(existingLike);
                comment.setLikesCount(Math.max(0, comment.getLikesCount() - 1));
            }, () -> {
                ForumCommentLike like = new ForumCommentLike();
                like.setComment(comment);
                like.setUser(user);
                commentLikeRepository.save(like);
                comment.setLikesCount(comment.getLikesCount() + 1);
            });

        ForumComment savedComment = commentRepository.save(comment);
        return toCommentResponse(savedComment, userId, savedComment.getTopic().getUser().getId());
    }

    @Transactional
    public ForumCommentResponse togglePinnedComment(Long commentId, Long userId) {
        ForumComment comment = findComment(commentId);
        ForumTopic topic = comment.getTopic();
        validateOwnership(userId, topic.getUser().getId());

        commentRepository.findByTopicIdOrderByCreatedAtAsc(topic.getId()).stream()
            .filter(ForumComment::isPinned)
            .filter(existing -> !existing.getId().equals(commentId))
            .forEach(existing -> {
                existing.setPinned(false);
                commentRepository.save(existing);
            });

        comment.setPinned(!comment.isPinned());
        return toCommentResponse(commentRepository.save(comment), userId, topic.getUser().getId());
    }

    @Transactional
    public ForumTopicDetailsResponse updateTopic(Long topicId, Long userId, CreateTopicRequest request) {
        ForumTopic topic = findTopic(topicId);
        validateOwnership(userId, topic.getUser().getId());
        topic.setTitle(clean(request.title(), "Topic title is required"));
        topic.setContent(clean(request.content(), "Topic content is required"));
        topic.setAttachmentUrl(blankToNull(request.attachmentUrl()));
        topic.setAttachmentType(validateAttachment(request.attachmentUrl(), request.attachmentType()));
        applyTopicExtras(topic, request);
        topic.setLastActivityAt(LocalDateTime.now());
        return toDetailsResponse(topicRepository.save(topic), userId);
    }

    @Transactional
    public ForumCommentResponse updateComment(Long commentId, Long userId, CreateCommentRequest request) {
        ForumComment comment = findComment(commentId);
        validateOwnership(userId, comment.getUser().getId());
        comment.setContent(clean(request.content(), "Comment content is required"));
        comment.setAttachmentUrl(blankToNull(request.attachmentUrl()));
        comment.setAttachmentType(validateAttachment(request.attachmentUrl(), request.attachmentType()));
        comment.setEdited(true);
        ForumComment savedComment = commentRepository.save(comment);
        syncTopicCounters(savedComment.getTopic());
        return toCommentResponse(savedComment, userId, savedComment.getTopic().getUser().getId());
    }

    @Transactional
    public void deleteTopic(Long topicId, Long userId) {
        ForumTopic topic = findTopic(topicId);
        validateDeletionPermission(userId, topic.getUser().getId());
        topicRepository.delete(topic);
    }

    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        ForumComment comment = findComment(commentId);
        validateDeletionPermission(userId, comment.getUser().getId());
        ForumTopic topic = comment.getTopic();
        commentRepository.delete(comment);
        syncTopicCounters(topic);
    }

    private void syncTopicCounters(ForumTopic topic) {
        topic.setCommentsCount(commentRepository.countByTopicId(topic.getId()));
        topic.setLastActivityAt(LocalDateTime.now());
        topicRepository.save(topic);
    }

    private ForumTopicSummaryResponse toSummaryResponse(ForumTopic topic) {
        return toSummaryResponse(topic, null);
    }

    private ForumTopicSummaryResponse toSummaryResponse(ForumTopic topic, Long currentUserId) {
        String plainContent = plainText(topic.getContent());
        String excerpt = plainContent.length() > 160 ? plainContent.substring(0, 160) + "..." : plainContent;
        boolean likedByCurrentUser = currentUserId != null && topicLikeRepository.existsByTopicIdAndUserId(topic.getId(), currentUserId);
        return new ForumTopicSummaryResponse(
            topic.getId(),
            topic.getGame().getId(),
            topic.getGame().getTitle(),
            topic.getGame().getSlug(),
            topic.getCategory().getId(),
            topic.getCategory().getName(),
            topic.getUser().getId(),
            displayUsername(topic.getUser()),
            topic.getUser().getAvatarUrl(),
            topic.getTitle(),
            excerpt,
            topic.getTags(),
            topic.getCommentsCount(),
            topic.getLikesCount(),
            topic.getViewsCount(),
            likedByCurrentUser,
            topic.getCreatedAt(),
            topic.getUpdatedAt(),
            topic.getLastActivityAt()
        );
    }

    private String plainText(String value) {
        if (value == null || value.isBlank()) return "";
        return value
            .replaceAll("(?is)<script.*?>.*?</script>", "")
            .replaceAll("(?is)<style.*?>.*?</style>", "")
            .replaceAll("(?i)<br\\s*/?>", "\n")
            .replaceAll("(?i)</(p|div|li|h[1-6])>", "\n")
            .replaceAll("<[^>]+>", "")
            .replace("&nbsp;", " ")
            .replace("&quot;", "\"")
            .replace("&#34;", "\"")
            .replace("&apos;", "'")
            .replace("&#39;", "'")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&amp;", "&")
            .replaceAll("[ \\t]+\\n", "\n")
            .replaceAll("\\n{3,}", "\n\n")
            .trim();
    }

    private ForumTopicDetailsResponse toDetailsResponse(ForumTopic topic, Long currentUserId) {
        boolean likedByCurrentUser = currentUserId != null && topicLikeRepository.existsByTopicIdAndUserId(topic.getId(), currentUserId);
        return new ForumTopicDetailsResponse(
            topic.getId(),
            topic.getGame().getId(),
            topic.getGame().getTitle(),
            topic.getGame().getSlug(),
            topic.getCategory().getId(),
            topic.getCategory().getName(),
            topic.getUser().getId(),
            displayUsername(topic.getUser()),
            topic.getUser().getAvatarUrl(),
            topic.getTitle(),
            topic.getContent(),
            topic.getAttachmentUrl(),
            topic.getAttachmentType(),
            topic.getTags(),
            topic.getPollQuestion(),
            topic.getPollOptions(),
            topic.getCodeBlock(),
            topic.getCodeLanguage(),
            topic.getCommentsCount(),
            topic.getLikesCount(),
            topic.getViewsCount(),
            likedByCurrentUser,
            topic.getCreatedAt(),
            topic.getUpdatedAt(),
            topic.getLastActivityAt()
        );
    }

    private ForumCommentResponse toCommentResponse(ForumComment comment, Long currentUserId, Long topicAuthorId) {
        boolean likedByCurrentUser = currentUserId != null && commentLikeRepository.existsByCommentIdAndUserId(comment.getId(), currentUserId);
        return new ForumCommentResponse(
            comment.getId(),
            comment.getTopic().getId(),
            comment.getTopic().getTitle(),
            comment.getTopic().getGame().getId(),
            comment.getTopic().getGame().getTitle(),
            comment.getParentComment() == null ? null : comment.getParentComment().getId(),
            comment.getUser().getId(),
            displayUsername(comment.getUser()),
            comment.getUser().getAvatarUrl(),
            comment.getContent(),
            comment.getAttachmentUrl(),
            comment.getAttachmentType(),
            comment.getLikesCount(),
            likedByCurrentUser,
            comment.isPinned(),
            comment.getUser().getId().equals(topicAuthorId),
            comment.getCreatedAt(),
            comment.getUpdatedAt(),
            comment.isEdited()
        );
    }

    private String displayUsername(User user) {
        return user.isDeleted() ? "Deleted user" : user.getUsername();
    }

    private User requireAuthorizedUser(Long userId) {
        if (userId == null) {
            throw new ForbiddenException("Authentication required");
        }
        User user = requireUser(userId);
        if (user.isDeleted()) {
            throw new ForbiddenException("Deleted account cannot perform this action");
        }
        return user;
    }

    private User requireContentAuthor(Long userId) {
        User user = requireAuthorizedUser(userId);
        if (user.isBlocked()) {
            throw new ForbiddenException("Your account has restricted access");
        }
        return user;
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ForbiddenException("User not found"));
    }

    private void validateOwnership(Long userId, Long ownerId) {
        User user = requireAuthorizedUser(userId);
        if (!user.getId().equals(ownerId)) {
            throw new ForbiddenException("You can edit only your own content");
        }
    }

    private void validateDeletionPermission(Long userId, Long ownerId) {
        User user = requireAuthorizedUser(userId);
        if (!user.isAdmin() && !user.getId().equals(ownerId)) {
            throw new ForbiddenException("You can delete only your own content");
        }
    }

    private Game requireGame(Long gameId) {
        return gameRepository.findById(gameId)
            .orElseThrow(() -> new NotFoundException("Forum not found"));
    }

    private ForumTopic findTopic(Long topicId) {
        return topicRepository.findById(topicId)
            .orElseThrow(() -> new NotFoundException("Topic not found"));
    }

    private ForumComment findComment(Long commentId) {
        return commentRepository.findById(commentId)
            .orElseThrow(() -> new NotFoundException("Comment not found"));
    }

    private String clean(String value, String errorMessage) {
        if (value == null || value.trim().isEmpty()) {
            throw new BadRequestException(errorMessage);
        }
        return value.trim();
    }

    private String validateAttachment(String attachmentUrl, String attachmentType) {
        String url = blankToNull(attachmentUrl);
        String type = blankToNull(attachmentType);
        if (url == null) {
            return null;
        }
        if ("application/json".equals(type)) {
            long estimatedBytes = (long) url.length() * 2L;
            if (estimatedBytes > MAX_ATTACHMENT_BYTES) {
                throw new BadRequestException("Attachments payload is too large");
            }
            return type;
        }
        if (type == null || !isAllowedAttachmentType(type)) {
            throw new BadRequestException("Attachment type is not supported");
        }
        String expectedPrefix = "data:" + type + ";base64,";
        if (!url.startsWith(expectedPrefix)) {
            throw new BadRequestException("Attachment data does not match its type");
        }
        String base64 = url.substring(expectedPrefix.length());
        long estimatedBytes = (base64.length() * 3L) / 4L;
        if (estimatedBytes > MAX_ATTACHMENT_BYTES) {
            throw new BadRequestException("Attachment must not exceed 10 MB");
        }
        return type;
    }

    private boolean isAllowedAttachmentType(String type) {
        return "image/png".equals(type)
            || "image/jpeg".equals(type)
            || "image/webp".equals(type)
            || "image/gif".equals(type)
            || "video/webm".equals(type)
            || "video/mp4".equals(type)
            || "audio/mpeg".equals(type)
            || "audio/wav".equals(type)
            || "audio/ogg".equals(type)
            || "application/pdf".equals(type)
            || "text/plain".equals(type)
            || "application/zip".equals(type)
            || "application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(type)
            || "application/json".equals(type);
    }

    private void applyTopicExtras(ForumTopic topic, CreateTopicRequest request) {
        topic.setTags(normalizeTags(request.tags()));
        topic.setPollQuestion(blankToNull(request.pollQuestion()));
        topic.setPollOptions(normalizePollOptions(request.pollOptions()));
        topic.setCodeBlock(blankToNull(request.codeBlock()));
        topic.setCodeLanguage(blankToNull(request.codeLanguage()));
    }

    private String normalizeTags(String tags) {
        String value = blankToNull(tags);
        if (value == null) {
            return null;
        }
        return java.util.Arrays.stream(value.split("[,;#\\n]"))
            .map(String::trim)
            .filter(item -> !item.isEmpty())
            .distinct()
            .limit(8)
            .reduce((left, right) -> left + "," + right)
            .orElse(null);
    }

    private List<String> splitTags(String tags) {
        if (tags == null || tags.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(tags.split(","))
            .map(String::trim)
            .filter(item -> !item.isEmpty())
            .toList();
    }

    private String normalizePollOptions(String pollOptions) {
        String value = blankToNull(pollOptions);
        if (value == null) {
            return null;
        }
        String normalized = java.util.Arrays.stream(value.split("\\n"))
            .map(String::trim)
            .filter(item -> !item.isEmpty())
            .limit(6)
            .reduce((left, right) -> left + "\n" + right)
            .orElse(null);
        return normalized;
    }

    private String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
