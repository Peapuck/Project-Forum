package com.projectl.forum.repository;

import com.projectl.forum.entity.ForumTopic;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ForumTopicRepository extends JpaRepository<ForumTopic, Long> {

    @EntityGraph(attributePaths = {"game", "category", "user"})
    List<ForumTopic> findByGameIdOrderByLastActivityAtDescCreatedAtDesc(Long gameId);

    @EntityGraph(attributePaths = {"game", "category", "user"})
    List<ForumTopic> findByGameIdAndCategoryIdOrderByLastActivityAtDescCreatedAtDesc(Long gameId, Long categoryId);

    @EntityGraph(attributePaths = {"game", "category", "user"})
    List<ForumTopic> findByUserIdOrderByLastActivityAtDescCreatedAtDesc(Long userId);

    @EntityGraph(attributePaths = {"game", "category", "user"})
    List<ForumTopic> findTop10ByOrderByCommentsCountDescViewsCountDescLastActivityAtDesc();

    @EntityGraph(attributePaths = {"game", "category", "user"})
    List<ForumTopic> findTop20ByCategorySlugOrderByLastActivityAtDescCreatedAtDesc(String slug);

    @EntityGraph(attributePaths = {"game", "category", "user"})
    List<ForumTopic> findTop10ByTitleContainingIgnoreCaseOrderByLastActivityAtDesc(String title);

    @EntityGraph(attributePaths = {"game", "category", "user"})
    List<ForumTopic> findTop20ByTitleContainingIgnoreCaseOrTagsContainingIgnoreCaseOrderByLastActivityAtDesc(String title, String tags);
}
