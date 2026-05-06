package com.projectl.forum.controller;

import com.projectl.forum.dto.CreateCommentRequest;
import com.projectl.forum.dto.CreateTopicRequest;
import com.projectl.forum.dto.AiTopicSummaryResponse;
import com.projectl.forum.dto.ForumCategoryResponse;
import com.projectl.forum.dto.ForumCommentResponse;
import com.projectl.forum.dto.ForumGameResponse;
import com.projectl.forum.dto.ForumTopUserResponse;
import com.projectl.forum.dto.ForumTopicDetailsResponse;
import com.projectl.forum.dto.ForumTopicSummaryResponse;
import com.projectl.forum.dto.ForumTopicViewerResponse;
import com.projectl.forum.service.AiTopicSummaryService;
import com.projectl.forum.service.ForumService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/forum")
public class ForumController {

    private final ForumService forumService;
    private final AiTopicSummaryService aiTopicSummaryService;

    public ForumController(ForumService forumService, AiTopicSummaryService aiTopicSummaryService) {
        this.forumService = forumService;
        this.aiTopicSummaryService = aiTopicSummaryService;
    }

    @GetMapping({"/forums/{gameId}", "/games/{gameId}"})
    public ForumGameResponse getGameById(@PathVariable Long gameId) {
        return forumService.getGameById(gameId);
    }

    @GetMapping({"/forums/slug/{slug}", "/games/slug/{slug}"})
    public ForumGameResponse getGameBySlug(@PathVariable String slug) {
        return forumService.getGameBySlug(slug);
    }

    @GetMapping({"/forums", "/games"})
    public List<ForumGameResponse> getGames() {
        return forumService.getAllGames();
    }

    @GetMapping({"/forums/{gameId}/categories", "/games/{gameId}/categories"})
    public List<ForumCategoryResponse> getCategories(@PathVariable Long gameId) {
        return forumService.getCategoriesByGame(gameId);
    }

    @GetMapping({"/forums/{gameId}/topics", "/games/{gameId}/topics"})
    public List<ForumTopicSummaryResponse> getTopics(
        @PathVariable Long gameId,
        @RequestParam(required = false) Long categoryId,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.getTopics(gameId, categoryId, userId);
    }

    @GetMapping("/topics/popular")
    public List<ForumTopicSummaryResponse> getPopularTopics(
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.getPopularTopics(userId);
    }

    @GetMapping("/users/top")
    public List<ForumTopUserResponse> getTopUsers() {
        return forumService.getTopUsers();
    }

    @GetMapping("/topics/guides")
    public List<ForumTopicSummaryResponse> getGuideTopics(
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.getGuideTopics(userId);
    }

    @GetMapping("/search")
    public List<com.projectl.forum.dto.ForumSearchResponse> search(@RequestParam String query) {
        return forumService.search(query);
    }

    @GetMapping("/users/{userId}/topics")
    public List<ForumTopicSummaryResponse> getUserTopics(
        @PathVariable Long userId,
        @RequestHeader(value = "X-User-Id", required = false) Long currentUserId
    ) {
        return forumService.getTopicsByUser(userId, currentUserId);
    }

    @GetMapping("/topics/{topicId}")
    public ForumTopicDetailsResponse getTopic(
        @PathVariable Long topicId,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.getTopic(topicId, userId);
    }

    @GetMapping("/topics/{topicId}/viewers")
    public List<ForumTopicViewerResponse> getTopicViewers(@PathVariable Long topicId) {
        return forumService.getTopicViewers(topicId);
    }

    @PostMapping("/topics/{topicId}/ai-summary")
    public AiTopicSummaryResponse summarizeTopic(@PathVariable Long topicId) {
        return aiTopicSummaryService.summarizeTopic(topicId);
    }

    @PostMapping("/topics/{topicId}/like")
    public ForumTopicDetailsResponse toggleLike(
        @PathVariable Long topicId,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.toggleLike(topicId, userId);
    }

    @GetMapping("/topics/{topicId}/comments")
    public List<ForumCommentResponse> getComments(
        @PathVariable Long topicId,
        @RequestParam(defaultValue = "newest") String sort,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.getComments(topicId, sort, userId);
    }

    @GetMapping("/users/{userId}/comments")
    public List<ForumCommentResponse> getUserComments(@PathVariable Long userId) {
        return forumService.getCommentsByUser(userId);
    }

    @PostMapping("/topics")
    @ResponseStatus(HttpStatus.CREATED)
    public ForumTopicDetailsResponse createTopic(
        @Valid @RequestBody CreateTopicRequest request,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.createTopic(userId, request);
    }

    @PostMapping("/topics/{topicId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public ForumCommentResponse createComment(
        @PathVariable Long topicId,
        @Valid @RequestBody CreateCommentRequest request,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.createComment(topicId, userId, request);
    }

    @PostMapping("/comments/{commentId}/like")
    public ForumCommentResponse toggleCommentLike(
        @PathVariable Long commentId,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.toggleCommentLike(commentId, userId);
    }

    @PostMapping("/comments/{commentId}/pin")
    public ForumCommentResponse togglePinnedComment(
        @PathVariable Long commentId,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.togglePinnedComment(commentId, userId);
    }

    @PutMapping("/topics/{topicId}")
    public ForumTopicDetailsResponse updateTopic(
        @PathVariable Long topicId,
        @Valid @RequestBody CreateTopicRequest request,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.updateTopic(topicId, userId, request);
    }

    @PutMapping("/comments/{commentId}")
    public ForumCommentResponse updateComment(
        @PathVariable Long commentId,
        @Valid @RequestBody CreateCommentRequest request,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        return forumService.updateComment(commentId, userId, request);
    }

    @DeleteMapping("/topics/{topicId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTopic(
        @PathVariable Long topicId,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        forumService.deleteTopic(topicId, userId);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(
        @PathVariable Long commentId,
        @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        forumService.deleteComment(commentId, userId);
    }
}
