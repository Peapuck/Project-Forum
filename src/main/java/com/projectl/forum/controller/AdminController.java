package com.projectl.forum.controller;

import com.projectl.forum.dto.AdminGameRequest;
import com.projectl.forum.dto.AdminUserResponse;
import com.projectl.forum.dto.AdminUserStatusRequest;
import com.projectl.forum.dto.ForumGameResponse;
import com.projectl.forum.service.AdminService;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public List<AdminUserResponse> getUsers(@RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return adminService.getUsers(userId);
    }

    @PutMapping("/users/{userId}/status")
    public AdminUserResponse updateUserStatus(
        @PathVariable Long userId,
        @RequestHeader(value = "X-User-Id", required = false) Long adminUserId,
        @RequestBody AdminUserStatusRequest request
    ) {
        return adminService.updateUserStatus(userId, adminUserId, request);
    }

    @DeleteMapping("/users/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(
        @PathVariable Long userId,
        @RequestHeader(value = "X-User-Id", required = false) Long adminUserId
    ) {
        adminService.deleteUser(userId, adminUserId);
    }

    @PostMapping({"/forums", "/games"})
    @ResponseStatus(HttpStatus.CREATED)
    public ForumGameResponse createGame(
        @Valid @RequestBody AdminGameRequest request,
        @RequestHeader(value = "X-User-Id", required = false) Long adminUserId
    ) {
        return adminService.createGame(adminUserId, request);
    }

    @DeleteMapping({"/forums/{gameId}", "/games/{gameId}"})
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGame(
        @PathVariable Long gameId,
        @RequestHeader(value = "X-User-Id", required = false) Long adminUserId
    ) {
        adminService.deleteGame(gameId, adminUserId);
    }

    @DeleteMapping("/topics/{topicId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTopic(
        @PathVariable Long topicId,
        @RequestHeader(value = "X-User-Id", required = false) Long adminUserId
    ) {
        adminService.deleteTopic(topicId, adminUserId);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(
        @PathVariable Long commentId,
        @RequestHeader(value = "X-User-Id", required = false) Long adminUserId
    ) {
        adminService.deleteComment(commentId, adminUserId);
    }
}
