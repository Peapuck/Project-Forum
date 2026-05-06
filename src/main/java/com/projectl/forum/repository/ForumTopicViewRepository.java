package com.projectl.forum.repository;

import com.projectl.forum.entity.ForumTopicView;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ForumTopicViewRepository extends JpaRepository<ForumTopicView, Long> {

    boolean existsByTopicIdAndUserId(Long topicId, Long userId);

    List<ForumTopicView> findByTopicIdOrderByCreatedAtDesc(Long topicId);
}
