package com.projectl.forum.repository;

import com.projectl.forum.entity.ForumTopicLike;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ForumTopicLikeRepository extends JpaRepository<ForumTopicLike, Long> {

    boolean existsByTopicIdAndUserId(Long topicId, Long userId);

    long countByTopicId(Long topicId);

    Optional<ForumTopicLike> findByTopicIdAndUserId(Long topicId, Long userId);
}
