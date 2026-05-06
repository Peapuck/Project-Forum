package com.projectl.forum.repository;

import com.projectl.forum.entity.ForumCommentLike;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ForumCommentLikeRepository extends JpaRepository<ForumCommentLike, Long> {

    Optional<ForumCommentLike> findByCommentIdAndUserId(Long commentId, Long userId);

    boolean existsByCommentIdAndUserId(Long commentId, Long userId);
}
