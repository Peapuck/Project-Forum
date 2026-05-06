package com.projectl.forum.repository;

import com.projectl.forum.entity.Game;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRepository extends JpaRepository<Game, Long> {

    java.util.List<Game> findAllByOrderByTitleAsc();

    Optional<Game> findBySlug(String slug);

    boolean existsBySlug(String slug);

    List<Game> findTop8ByTitleContainingIgnoreCaseOrderByTitleAsc(String title);
}
