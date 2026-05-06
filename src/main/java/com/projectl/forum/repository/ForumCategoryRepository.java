package com.projectl.forum.repository;

import com.projectl.forum.entity.ForumCategory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ForumCategoryRepository extends JpaRepository<ForumCategory, Long> {

    List<ForumCategory> findByGameIdOrderByNameAsc(Long gameId);

    List<ForumCategory> findByGameId(Long gameId);

    Optional<ForumCategory> findByIdAndGameId(Long id, Long gameId);

    @Query("""
        select c, count(t.id)
        from ForumCategory c
        left join ForumTopic t on t.category.id = c.id
        where c.game.id = :gameId
        group by c
        order by c.name asc
        """)
    List<Object[]> findCategoriesWithTopicCount(Long gameId);
}
