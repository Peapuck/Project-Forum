package com.projectl.forum.repository;

import com.projectl.forum.entity.ForumComment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ForumCommentRepository extends JpaRepository<ForumComment, Long> {

    List<ForumComment> findByTopicIdOrderByCreatedAtAsc(Long topicId);

    List<ForumComment> findByTopicIdOrderByLikesCountDescCreatedAtDesc(Long topicId);

    long countByTopicId(Long topicId);

    List<ForumComment> findByUserIdOrderByCreatedAtDesc(Long userId);
}
