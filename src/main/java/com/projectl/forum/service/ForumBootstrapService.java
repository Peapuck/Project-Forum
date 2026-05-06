package com.projectl.forum.service;

import com.projectl.forum.entity.ForumCategory;
import com.projectl.forum.entity.ForumComment;
import com.projectl.forum.entity.ForumTopic;
import com.projectl.forum.entity.Game;
import com.projectl.forum.entity.User;
import com.projectl.forum.repository.ForumCategoryRepository;
import com.projectl.forum.repository.ForumCommentRepository;
import com.projectl.forum.repository.ForumTopicRepository;
import com.projectl.forum.repository.GameRepository;
import com.projectl.forum.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ForumBootstrapService {

    private static final Map<String, String> DEFAULT_CATEGORIES = new LinkedHashMap<>();

    static {
        DEFAULT_CATEGORIES.put("general-discussions", "Обычные обсуждения");
        DEFAULT_CATEGORIES.put("bugs-and-issues", "Баги и проблемы");
        DEFAULT_CATEGORIES.put("help", "Помощь");
        DEFAULT_CATEGORIES.put("guides", "Руководства");
    }

    private final GameRepository gameRepository;
    private final ForumCategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ForumTopicRepository topicRepository;
    private final ForumCommentRepository commentRepository;
    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public ForumBootstrapService(
        GameRepository gameRepository,
        ForumCategoryRepository categoryRepository,
        UserRepository userRepository,
        ForumTopicRepository topicRepository,
        ForumCommentRepository commentRepository,
        JdbcTemplate jdbcTemplate
    ) {
        this.gameRepository = gameRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.topicRepository = topicRepository;
        this.commentRepository = commentRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    @Transactional
    public void ensureDefaultCategories() {
        ensureSchema();
        ensureAdminUser();
        ensureDefaultForums();
        for (Game game : gameRepository.findAll()) {
            Map<String, ForumCategory> existingBySlug = new LinkedHashMap<>();
            for (ForumCategory category : categoryRepository.findByGameIdOrderByNameAsc(game.getId())) {
                existingBySlug.putIfAbsent(category.getSlug(), category);
            }

            for (Map.Entry<String, String> entry : DEFAULT_CATEGORIES.entrySet()) {
                ForumCategory existing = existingBySlug.get(entry.getKey());
                if (existing != null) {
                    if (!entry.getValue().equals(existing.getName())) {
                        setField(existing, "name", entry.getValue());
                        categoryRepository.save(existing);
                    }
                    continue;
                }

                ForumCategory category = new ForumCategory();
                setField(category, "game", game);
                setField(category, "name", entry.getValue());
                setField(category, "slug", entry.getKey());
                categoryRepository.save(category);
            }
        }
        ensureRedditDemoContent();
    }

    private void ensureSchema() {
        jdbcTemplate.execute("""
            DO $$
            BEGIN
                IF to_regclass('public.forums') IS NULL AND to_regclass('public.games') IS NOT NULL THEN
                    ALTER TABLE games RENAME TO forums;
                END IF;
            END $$;
            """);
        jdbcTemplate.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'forum_categories' AND column_name = 'game_id'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'forum_categories' AND column_name = 'forum_id'
                ) THEN
                    ALTER TABLE forum_categories RENAME COLUMN game_id TO forum_id;
                END IF;
            END $$;
            """);
        jdbcTemplate.execute("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'forum_topics' AND column_name = 'game_id'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'forum_topics' AND column_name = 'forum_id'
                ) THEN
                    ALTER TABLE forum_topics RENAME COLUMN game_id TO forum_id;
                END IF;
            END $$;
            """);
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE");
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT FALSE");
        jdbcTemplate.execute("ALTER TABLE forum_topics ADD COLUMN IF NOT EXISTS attachment_url TEXT");
        jdbcTemplate.execute("ALTER TABLE forum_topics ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(80)");
        jdbcTemplate.execute("ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS attachment_url TEXT");
        jdbcTemplate.execute("ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(80)");
    }

    private void ensureAdminUser() {
        userRepository.findByEmail("admin@forum.local").ifPresentOrElse(admin -> {
            if (!admin.isAdmin()) {
                admin.setAdmin(true);
                admin.setBlocked(false);
                userRepository.save(admin);
            }
        }, () -> {
            User admin = new User();
            admin.setUsername("Admin");
            admin.setEmail("admin@forum.local");
            admin.setPasswordHash(passwordEncoder.encode("admin12345"));
            admin.setAdmin(true);
            admin.setBlocked(false);
            userRepository.save(admin);
        });
    }

    private void ensureRedditDemoContent() {
        renameLegacyDemoUsers();
        List<User> users = List.of(
            ensureDemoUser("demo_user_04", "maxim_cache", "demo04@forum.local", "Backend developer, likes JVM internals and production war stories."),
            ensureDemoUser("demo_user_05", "katya_dev", "demo05@forum.local", "Python user who likes practical tooling discussions."),
            ensureDemoUser("demo_user_06", "mira_reads", "demo06@forum.local", "Game and movie chatter, mostly looking for good recommendations."),
            ensureDemoUser("demo_user_07", "alex_runtime", "demo07@forum.local", "Java and infrastructure notes from small production systems."),
            ensureDemoUser("demo_user_08", "dima_script", "demo08@forum.local", "Automation, Python tooling and small CLI utilities."),
            ensureDemoUser("demo_user_09", "nora_frames", "demo09@forum.local", "Movies, animation and quiet recommendation threads."),
            ensureDemoUser("demo_user_10", "ilya_pixel", "demo10@forum.local", "Games, JRPGs and old PC releases."),
            ensureDemoUser("demo_user_11", "sonya_lang", "demo11@forum.local", "Language learning, Russian grammar and translation questions."),
            ensureDemoUser("demo_user_12", "timur_stack", "demo12@forum.local", "Backend architecture and database tradeoffs."),
            ensureDemoUser("demo_user_13", "lena_sparks", "demo13@forum.local", "Limbus Company teams and gacha meta."),
            ensureDemoUser("demo_user_14", "roman_queue", "demo14@forum.local", "Distributed systems, queues and caches."),
            ensureDemoUser("demo_user_15", "vera_cinema", "demo15@forum.local", "Sci-fi, thrillers and movies best watched blind."),
            ensureDemoUser("demo_user_16", "nikita_loop", "demo16@forum.local", "Python, notebooks and data tooling.")
        );

        for (SeedTopic seed : demoTopics(users)) {
            Optional<Game> forum = findForum(seed.forumTerms());
            if (forum.isEmpty()) {
                continue;
            }
            Optional<ForumCategory> category = findDefaultCategory(forum.get());
            if (category.isEmpty()) {
                continue;
            }
            upsertTopic(seed, forum.get(), category.get());
        }
    }

    private void ensureDefaultForums() {
        ensureForum("Russian Language", "russian-language");
        ensureForum("Databases", "databases");
        ensureForum("Web Development", "web-development");
        ensureForum("Anime & Manga", "anime-manga");
    }

    private void ensureForum(String title, String slug) {
        if (gameRepository.existsBySlug(slug)) {
            return;
        }
        Game game = new Game();
        game.setTitle(title);
        game.setSlug(slug);
        gameRepository.save(game);
    }

    private List<SeedTopic> demoTopics(List<User> users) {
        User maxim = users.get(0);
        User katya = users.get(1);
        User mira = users.get(2);
        User alex = users.get(3);
        User dima = users.get(4);
        User nora = users.get(5);
        User ilya = users.get(6);
        User sonya = users.get(7);
        User timur = users.get(8);
        User lena = users.get(9);
        User roman = users.get(10);
        User vera = users.get(11);
        User nikita = users.get(12);

        return List.of(
            new SeedTopic(
                List.of("java"),
                maxim,
                "How often do you use embedded distributed cache?",
                """
                Whenever you need to share state among distributed services, it is common to run a dedicated cluster like Redis. In the JVM ecosystem, data grids such as Infinispan, Hazelcast and Ignite still come up sometimes, especially for coordination and low-latency state.

                Do you use distributed caches in production? How much does the consistency model matter when you choose one?

                Source: https://www.reddit.com/r/java/comments/1t0dnza/how_often_do_you_use_embedded_distributed_cache/
                """,
                "java, cache, distributed-systems",
                31L,
                5L,
                List.of(
                    new SeedComment(mira, "If you are on the JVM, Netflix Hollow is amazing for mostly read-only reference data.", 4L, null),
                    new SeedComment(katya, "I would still default to Redis unless the latency or topology really forces an embedded grid.", 2L, null),
                    new SeedComment(maxim, "That matches my experience too: the tech can be solid, but deployments and rolling restarts become the real cost.", 1L, 1),
                    new SeedComment(roman, "The split-brain and warm-up stories are usually more important than the benchmark numbers.", 2L, null)
                )
            ),
            new SeedTopic(
                List.of("java"),
                alex,
                "Have you started using Virtual Threads in production apps?",
                """
                A recent r/java thread asked whether teams have moved virtual threads into production. The interesting replies were not about hype, but about boring request/response services where thread pool tuning mostly disappeared.

                Are virtual threads already your default, or are you still waiting?

                Source: https://www.reddit.com/r/java/comments/1svhjvb/have_you_started_using_virtual_threads_in_your/
                """,
                "java, virtual-threads, production",
                18L,
                3L,
                List.of(
                    new SeedComment(maxim, "For regular blocking HTTP/database work, they feel ready enough. The main thing is still watching for pinning.", 3L, null),
                    new SeedComment(timur, "I like that it makes the simple code path viable again without jumping into reactive for everything.", 2L, null),
                    new SeedComment(alex, "Same here. I would not rewrite a working reactive stack just for fun, but new services are easier to justify.", 1L, 1)
                )
            ),
            new SeedTopic(
                List.of("python"),
                katya,
                "Should I use Pydantic for all my classes?",
                """
                I keep seeing a split between dataclasses, plain classes and Pydantic models. For internal code, type hints plus dataclasses can be enough, but for boundary data Pydantic feels nice because parsing and validation are explicit.

                Where do you draw the line in real projects?

                Source: https://www.reddit.com/r/Python/comments/1c9h0mh/should_i_use_pydantic_for_all_my_classes/
                """,
                "python, pydantic, dataclasses",
                24L,
                4L,
                List.of(
                    new SeedComment(nikita, "I use Pydantic at API boundaries and dataclasses for boring internal containers. It keeps the intent visible.", 3L, null),
                    new SeedComment(dima, "Same. Pydantic everywhere starts nice, then later you notice the app has validation logic in places that never receive untrusted data.", 2L, null),
                    new SeedComment(katya, "That is the line I was looking for: trust boundary first, convenience second.", 1L, 0)
                )
            ),
            new SeedTopic(
                List.of("python"),
                dima,
                "uv or pip for Python package management?",
                """
                The r/learnpython thread had a practical split: uv is much faster and can manage more of the workflow, while pip plus venv is still mature and enough for many small projects.

                If you moved to uv, did it actually simplify your day-to-day work?

                Source: https://www.reddit.com/r/learnpython/comments/1snqpnx/uv_or_pip_for_python_package_management/
                """,
                "python, uv, pip, tooling",
                16L,
                3L,
                List.of(
                    new SeedComment(katya, "For new projects I like uv init, add, sync, run. It removes a surprising amount of ceremony.", 3L, null),
                    new SeedComment(nikita, "I still use plain venv for tiny scripts, but uv is noticeably faster even on small dependency sets.", 1L, null),
                    new SeedComment(dima, "The best part for teams is probably the lockfile story, not just install speed.", 2L, null)
                )
            ),
            new SeedTopic(
                List.of("limbus", "limbus-company"),
                lena,
                "Okay so is Heathcliff Wild Hunt good?",
                """
                I got Wild Hunt Heathcliff and he feels strong on teams that can stack Sinking, but I am not sure how flexible he is outside that setup.

                People in the original thread mostly describe him as very good, especially once Coffin stacks and Dullahan are online. What teams are you using him with?

                Source: https://www.reddit.com/r/limbuscompany/comments/1f4043a/okay_so_is_heathcliff_wild_hunt_good/
                """,
                "limbus-company, heathcliff, team-building",
                37L,
                6L,
                List.of(
                    new SeedComment(ilya, "He does not need Sinking to be useful, but Sinking makes the damage spikes much more obvious.", 4L, null),
                    new SeedComment(mira, "Longer fights are where he feels best. Short fights can end before the ramp-up really matters.", 2L, null),
                    new SeedComment(lena, "I tried him with Boatworks Ishmael and Rime Shank Rodya and it finally clicked.", 1L, 0),
                    new SeedComment(alex, "If the fight resets too often, he feels less dramatic than the highlight clips suggest.", 1L, null)
                )
            ),
            new SeedTopic(
                List.of("limbus", "limbus-company"),
                mira,
                "Is Wild Hunt still relevant anymore?",
                """
                Another Limbus thread was more mixed: people still call Wild Hunt viable, but several replies point out that newer IDs and shorter fights make his ramp-up less dominant than before.

                Do you still keep him on the field, or mostly on support?

                Source: https://www.reddit.com/r/limbus_company/comments/1rxt8x9/is_wild_hunt_relevant_anymore/
                """,
                "limbus-company, heathcliff, meta",
                22L,
                4L,
                List.of(
                    new SeedComment(lena, "I still use him because he is fun, not because he is always optimal.", 3L, null),
                    new SeedComment(ilya, "That feels like the healthiest answer for gacha balance anyway.", 1L, 0),
                    new SeedComment(mira, "For Sinking he is still comfortable, but he is not the automatic answer for every slot now.", 2L, null)
                )
            ),
            new SeedTopic(
                List.of("movie", "movies", "film", "films"),
                vera,
                "Underrated sci-fi movies that are actually worth watching",
                """
                A Reddit thread about underrated sci-fi quickly turned into a long list of familiar picks, but it still had some good recommendations: Strange Days, Silent Running, Millennium, Edge of Tomorrow and Final Cut came up in different replies.

                What would you add that is not already on every list?

                Source: https://www.reddit.com/r/scifi/comments/1rzozyd/underrated_scifi_movies/
                """,
                "movies, sci-fi, recommendations",
                19L,
                3L,
                List.of(
                    new SeedComment(nora, "Strange Days is still the one I recommend first. It feels messy in a good, lived-in way.", 2L, null),
                    new SeedComment(timur, "Edge of Tomorrow is probably no longer underrated, but it is still one of the easiest sci-fi recommendations.", 1L, null),
                    new SeedComment(vera, "Silent Running is the kind of older pick I wanted from that thread.", 1L, null)
                )
            ),
            new SeedTopic(
                List.of("movie", "movies", "film", "films"),
                nora,
                "Movies you wish you could watch again for the first time",
                """
                Someone on r/MovieSuggestions mentioned The Fifth Element as a movie they wish they could experience blind again. Replies brought up The Matrix, Inception, The Prestige, The Sixth Sense and a bunch of comfort picks.

                Which movie only really had that first-time magic once?

                Source: https://www.reddit.com/r/MovieSuggestions/comments/1l0r7e2/movies_you_wish_you_could_watch_again_for_the/
                """,
                "movies, recommendations, first-watch",
                14L,
                2L,
                List.of(
                    new SeedComment(vera, "The Prestige is my pick. The second watch is great, but the first one has a special kind of confusion.", 2L, null),
                    new SeedComment(mira, "Arrival for me. I still like rewatching it, but the first emotional hit is hard to repeat.", 2L, null),
                    new SeedComment(nora, "The Matrix probably depends a lot on when you first saw it, but it is still a great answer.", 1L, null)
                )
            ),
            new SeedTopic(
                List.of("video", "game", "games"),
                ilya,
                "The game with the strongest first hour",
                """
                For me it is BioShock. That opening had me locked in fast.

                Some games hook you with mechanics, others with atmosphere, and a few do both immediately. What is your pick for the strongest first hour?

                Source: https://www.reddit.com/r/gaming/comments/1rmnlqt/the_game_with_the_strongest_first_hour/
                """,
                "games, recommendations, discussion",
                27L,
                5L,
                List.of(
                    new SeedComment(mira, "Disco Elysium, easily. You wake up confused, then the writing carries everything.", 4L, null),
                    new SeedComment(dima, "Portal 2 is almost unfair here. It teaches the whole language of the game before you notice.", 2L, null),
                    new SeedComment(ilya, "BioShock is still hard to beat because the opening sells the whole world immediately.", 2L, null)
                )
            ),
            new SeedTopic(
                List.of("video", "game", "games"),
                ilya,
                "JRPG that gets a newbie hooked in the first hour?",
                """
                In a JRPG recommendation thread, people were looking for games that hook a new player quickly without overwhelming them. FF7 Remake, Chrono Trigger and other fast openings came up as easy entry points.

                What would you recommend to someone who bounces off slow JRPG starts?

                Source: https://www.reddit.com/r/JRPG/comments/1s5jef9/a_jrpg_that_would_get_a_newbie_hooked_in_the/
                """,
                "games, jrpg, recommendations",
                12L,
                2L,
                List.of(
                    new SeedComment(sonya, "Chrono Trigger is still the cleanest recommendation. It starts simple and never wastes much time.", 2L, null),
                    new SeedComment(maxim, "FF7 Remake has a strong opening, but it also sets expectations for a very cinematic style.", 1L, null),
                    new SeedComment(ilya, "Persona 5 is great, just not the one I would pick for someone asking for a fast first hour.", 1L, null)
                )
            ),
            new SeedTopic(List.of("java"), roman, "Когда Redis проще встроенного кэша?", """
                В обсуждениях про embedded cache часто всплывает один и тот же вывод: если нет жёстких требований по latency, отдельный Redis проще сопровождать, мониторить и выкатывать.

                Где у вас проходит граница между «поставим Redis» и «нужна сетка внутри JVM»?

                Source: https://www.reddit.com/r/java/comments/1t0dnza/how_often_do_you_use_embedded_distributed_cache/
                """, "java, redis, кэш", 13L, 2L, List.of(
                    new SeedComment(timur, "Для маленькой команды Redis почти всегда дешевле по сопровождению.", 2L, null),
                    new SeedComment(alex, "Встроенный кэш я бы брал только если архитектура уже вокруг него построена.", 1L, null),
                    new SeedComment(roman, "Да, особенно когда деплой должен оставаться stateless.", 1L, 0)
                )),
            new SeedTopic(List.of("python"), nikita, "Стоит ли переходить с requirements.txt на pyproject.toml?", """
                В тредах про uv часто советуют не обязательно менять весь инструмент сразу, но хотя бы перейти на pyproject.toml. Это даёт общий формат для pip, uv, Poetry и других инструментов.

                Кто уже переносил старые проекты, были ли неприятные сюрпризы?

                Source: https://www.reddit.com/r/learnpython/comments/1snqpnx/uv_or_pip_for_python_package_management/
                """, "python, pyproject, tooling", 11L, 2L, List.of(
                    new SeedComment(katya, "Если проект маленький, перенос обычно занимает меньше времени, чем кажется.", 2L, null),
                    new SeedComment(dima, "Самое приятное - зависимости и метаданные наконец лежат рядом.", 1L, null),
                    new SeedComment(nikita, "Я бы всё равно делал это отдельным PR, чтобы не смешивать с изменениями кода.", 1L, null)
                )),
            new SeedTopic(List.of("limbus", "limbus-company"), lena, "Какие Sinking-юниты сейчас самые комфортные?", """
                После обсуждений Wild Hunt Heathcliff стало интересно собрать более общий список. Одни игроки советуют Rime Shank Rodya, другие чаще вспоминают Boatworks Ishmael и Butler Outis.

                Что у вас реально работает в длинных боях, а не только на скриншотах урона?

                Source: https://www.reddit.com/r/limbuscompany/comments/1f4043a/okay_so_is_heathcliff_wild_hunt_good/
                """, "limbus-company, sinking, meta", 17L, 3L, List.of(
                    new SeedComment(mira, "Rime Shank всё ещё выглядит как самый заметный апгрейд для команды.", 2L, null),
                    new SeedComment(ilya, "Мне Butler Outis нравится больше из-за стабильности, даже если цифры не самые смешные.", 1L, null),
                    new SeedComment(lena, "Согласна, стабильность в MD ощущается сильнее, чем разовый пик урона.", 1L, 1)
                )),
            new SeedTopic(List.of("movie", "movies", "film", "films"), vera, "Фильмы, которые лучше смотреть вообще без трейлера", """
                В треде про фильмы, которые хочется увидеть впервые снова, часто всплывают The Prestige, The Sixth Sense, The Matrix и похожие картины. Для таких фильмов трейлер иногда уже слишком много рассказывает.

                Какие фильмы вы бы советовали смотреть вслепую?

                Source: https://www.reddit.com/r/MovieSuggestions/comments/1l0r7e2/movies_you_wish_you_could_watch_again_for_the/
                """, "фильмы, рекомендации, спойлеры", 21L, 4L, List.of(
                    new SeedComment(nora, "The Prestige точно. Чем меньше знаешь, тем лучше работает весь фокус.", 3L, null),
                    new SeedComment(mira, "Ещё Arrival. Даже жанр лучше объяснять очень осторожно.", 2L, null),
                    new SeedComment(vera, "Да, Arrival легко испортить одной лишней фразой.", 1L, 1)
                )),
            new SeedTopic(List.of("video", "game", "games"), ilya, "Игры, которые цепляют за первый час", """
                В r/gaming обсуждали сильнейший первый час игры: BioShock, Ghost of Tsushima, The Last of Us, Half-Life и Portal вспоминали чаще всего.

                Мне нравятся открытия, где обучение спрятано внутри действия. Какие игры делают это лучше всего?

                Source: https://www.reddit.com/r/gaming/comments/1rmnlqt/the_game_with_the_strongest_first_hour/
                """, "игры, рекомендации, первые-впечатления", 25L, 5L, List.of(
                    new SeedComment(dima, "Portal 2 почти идеален: ты учишься, но не чувствуешь урок.", 3L, null),
                    new SeedComment(vera, "BioShock выигрывает атмосферой. Геймплей можно спорить, но вход в мир мощный.", 2L, null),
                    new SeedComment(ilya, "Half-Life до сих пор хорош именно тем, что не торопится и всё равно держит.", 2L, null)
                )),
            new SeedTopic(List.of("java"), timur, "Database-first или cache-first для справочников?", """
                После чтения обсуждений Netflix Hollow и распределённых кэшей задумался о справочниках: иногда хочется держать всё рядом с приложением, но обновления и наблюдаемость становятся сложнее.

                Для read-mostly данных вы чаще выбираете базу, Redis или отдельный in-memory слой?

                Source: https://www.reddit.com/r/java/comments/1pnwmiv/introduction_to_netflix_hollow/
                """, "java, architecture, reference-data", 15L, 2L, List.of(
                    new SeedComment(roman, "Если данные read-mostly и обновляются пакетно, Hollow правда выглядит интересно.", 2L, null),
                    new SeedComment(maxim, "Но команда должна понимать модель публикации данных, иначе будет магия.", 1L, null),
                    new SeedComment(timur, "Вот этого и боюсь: технология хорошая, а mental model не бесплатная.", 1L, 1)
                )),
            new SeedTopic(List.of("python"), katya, "Do you still use Poetry after trying uv?", """
                The uv discussions are usually positive, but some people still prefer Poetry because it is mature and familiar. Speed is not the only axis; publishing, lockfiles and team habits matter too.

                If you tried both, what stayed in your daily workflow?

                Source: https://www.reddit.com/r/learnpython/comments/1snqpnx/uv_or_pip_for_python_package_management/
                """, "python, poetry, uv", 18L, 3L, List.of(
                    new SeedComment(nikita, "I kept Poetry at work because the project already had good conventions around it.", 2L, null),
                    new SeedComment(dima, "For side projects uv won immediately. It is just less waiting.", 2L, null),
                    new SeedComment(katya, "That sounds like the reasonable split: boring at work, fast experiments at home.", 1L, 1)
                )),
            new SeedTopic(List.of("movie", "movies", "film", "films"), nora, "Hidden sci-fi that is not just the same five movies", """
                The underrated sci-fi thread had a funny problem: half the replies were famous films. Still, it produced a few useful names if you ignore the obvious classics.

                What is your actual hidden pick, not just a beloved blockbuster?

                Source: https://www.reddit.com/r/scifi/comments/1rzozyd/underrated_scifi_movies/
                """, "movies, sci-fi, hidden-gems", 16L, 2L, List.of(
                    new SeedComment(vera, "Coherence is my default low-budget recommendation.", 2L, null),
                    new SeedComment(timur, "Primer is good, but I never know if I am recommending a movie or homework.", 1L, null),
                    new SeedComment(nora, "That is exactly why it works as a forum recommendation.", 1L, 1)
                )),
            new SeedTopic(List.of("video", "game", "games"), ilya, "Games where the tutorial does not feel like a tutorial", """
                A lot of best-first-hour replies are really about onboarding: the game teaches movement, combat and stakes without stopping everything for a classroom moment.

                Which game taught you the most naturally?

                Source: https://www.reddit.com/r/gaming/comments/1rmnlqt/the_game_with_the_strongest_first_hour/
                """, "games, design, onboarding", 15L, 2L, List.of(
                    new SeedComment(maxim, "Mario games are still the cleanest examples: one screen, one idea, no lecture.", 2L, null),
                    new SeedComment(katya, "Celeste does this beautifully too. Mechanics first, explanation second.", 1L, null),
                    new SeedComment(ilya, "Good point. Celeste teaches failure as part of the loop almost instantly.", 1L, 1)
                )),
            new SeedTopic(List.of("russian", "language"), sonya, "Как учить падежи: правила или много примеров?", """
                В r/russian часто спорят, можно ли выучить падежи «естественно». Хороший ответ звучит так: правила нужны, но без большого количества живых примеров они не превращаются в навык.

                Что вам помогло: таблицы, карточки, чтение или преподаватель?

                Source: https://www.reddit.com/r/russian/comments/k4pf20/learning_russian_cases/
                """, "русский-язык, обучение, grammar", 20L, 4L, List.of(
                    new SeedComment(mira, "Мне помогло учить не окончания отдельно, а короткие фразы с предлогами.", 3L, null),
                    new SeedComment(nikita, "Таблицы нужны как карта, но говорить по карте всё равно не получится.", 2L, null),
                    new SeedComment(sonya, "Очень точная формулировка. Карта спасает, но маршрут надо пройти ногами.", 1L, 1)
                )),
            new SeedTopic(List.of("russian", "language"), sonya, "Почему русские падежи кажутся такими сложными?", """
                В свежем треде r/russian обсуждали, правда ли русские падежи намного сложнее других языков. Многие сошлись на том, что дело не только в сложности, но и в неожиданности для людей после английского.

                Как бы вы объяснили падежи человеку, который впервые видит такую систему?

                Source: https://www.reddit.com/r/russian/comments/1qw5436/are_russian_cases_really_that_much_more_complicated_compared_to_other_case_heavy_languages/
                """, "русский-язык, падежи, language-learning", 18L, 3L, List.of(
                    new SeedComment(katya, "Я бы начала с идеи роли слова в предложении, а не с шести названий падежей.", 2L, null),
                    new SeedComment(dima, "Да, названия пугают сильнее, чем сама логика.", 1L, null),
                    new SeedComment(sonya, "Потом уже можно показывать, как окончания заменяют часть предлогов и порядок слов.", 1L, 0)
                )),
            new SeedTopic(List.of("movie", "movies", "film", "films"), vera, "Какие фильмы стали лучше на втором просмотре?", """
                В обсуждениях фильмов «как в первый раз» часто вспоминают картины с твистами. Но есть обратная категория: фильмы, которые раскрываются именно на пересмотре, когда знаешь развязку.

                Что у вас стало лучше со второго раза?

                Source: https://www.reddit.com/r/MovieSuggestions/comments/12k6anr/movies_you_wish_you_could_watch_for_the_first/
                """, "фильмы, пересмотр, обсуждение", 13L, 2L, List.of(
                    new SeedComment(nora, "Memento на втором просмотре смотрится почти как другой фильм.", 2L, null),
                    new SeedComment(roman, "The Prestige тоже. Начинаешь замечать, что подсказки были на виду.", 2L, null),
                    new SeedComment(vera, "Вот за такие пересмотры я и люблю фильмы с честной структурой.", 1L, 1)
                )),
            new SeedTopic(List.of("limbus", "limbus-company"), lena, "Wild Hunt как generalist: стоит ли брать без Sinking?", """
                В старом обсуждении многие писали, что Wild Hunt может работать и без Sinking, просто команда с Sinking раскрывает его заметно лучше.

                Если у новичка нет полной Sinking-команды, он всё ещё стоит ресурсов?

                Source: https://www.reddit.com/r/limbuscompany/comments/1f4043a/okay_so_is_heathcliff_wild_hunt_good/
                """, "limbus-company, heathcliff, новичкам", 14L, 2L, List.of(
                    new SeedComment(ilya, "Я бы сказал: брать можно, но не ждать магии без поддержки.", 2L, null),
                    new SeedComment(mira, "Новичку важнее понять, нравится ли стиль боя. Ресурсы всё равно ограничены.", 1L, null),
                    new SeedComment(lena, "Согласна. Если нравится персонаж, он достаточно сильный, чтобы не жалеть.", 1L, null)
                )),
            new SeedTopic(List.of("java"), alex, "Reactive stack после Virtual Threads всё ещё нужен?", """
                В тредах про virtual threads часто звучит мысль, что реактивный стек больше не обязателен для обычных blocking workloads. Но для streaming, backpressure и сложной композиции он всё ещё может быть к месту.

                Где вы оставляете reactive, а где уже пишете обычный код?

                Source: https://www.reddit.com/r/java/comments/1gn6twu/virtual_threads_platform_threads_reactive_programming/
                """, "java, reactive, virtual-threads", 19L, 3L, List.of(
                    new SeedComment(timur, "Reactive остаётся там, где backpressure часть домена, а не случайная сложность.", 3L, null),
                    new SeedComment(maxim, "Для CRUD-сервиса virtual threads читаются намного проще.", 2L, null),
                    new SeedComment(alex, "Вот это и хочется: выбирать модель под задачу, а не под моду.", 1L, 0)
                )),
            new SeedTopic(List.of("video", "game", "games"), mira, "Which JRPG is easiest to recommend to a total beginner?", """
                The JRPG thread was useful because it focused on the first hour, not just the best game overall. A beginner-friendly opening needs pace, readable systems and a reason to care quickly.

                Which JRPG would you hand to someone who mostly plays action games?

                Source: https://www.reddit.com/r/JRPG/comments/1s5jef9/a_jrpg_that_would_get_a_newbie_hooked_in_the/
                """, "games, jrpg, beginners", 12L, 2L, List.of(
                    new SeedComment(ilya, "FF7 Remake is probably the easiest bridge from action games.", 2L, null),
                    new SeedComment(nora, "Chrono Trigger if they are okay with older presentation.", 1L, null),
                    new SeedComment(mira, "That split makes sense: modern spectacle or timeless pacing.", 1L, null)
                )),
            new SeedTopic(List.of("python"), dima, "Small Python scripts: project structure or one file?", """
                Tooling threads often assume a full project, but many Python users are writing tiny scripts. uv can run single-file scripts nicely, while plain python plus venv is still enough for quick automation.

                When does your script become a real project?

                Source: https://www.reddit.com/r/learnpython/comments/1snqpnx/uv_or_pip_for_python_package_management/
                """, "python, scripts, tooling", 10L, 1L, List.of(
                    new SeedComment(nikita, "When I need tests or a second module, I make it a project.", 2L, null),
                    new SeedComment(katya, "Same. Before that, one file and a clear README is plenty.", 1L, null),
                    new SeedComment(dima, "Good threshold. Tests are usually the moment structure starts paying rent.", 1L, 0)
                ))
            ,
            new SeedTopic(List.of("database", "databases"), timur, "Postgres indexes: когда btree уже недостаточно?", """
                В небольших проектах btree почти всегда закрывает базовые запросы, но потом появляются полнотекстовый поиск, JSONB, массивы и геоданные. Тогда приходится выбирать GIN, GiST или отдельный поисковый движок.

                Какие индексы реально помогали вам в проде, а какие только усложняли поддержку?
                """, "postgres, indexes, database", 14L, 3L, List.of(
                    new SeedComment(roman, "GIN по JSONB спасал, но только после нормального EXPLAIN ANALYZE.", 2L, null),
                    new SeedComment(maxim, "Я бы сначала проверял, можно ли упростить запрос. Индекс не всегда лечит модель.", 2L, null),
                    new SeedComment(timur, "Да, иногда правильный partial index лучше, чем ещё один универсальный.", 1L, 1)
                )),
            new SeedTopic(List.of("database", "databases"), roman, "Миграции базы: Flyway или Liquibase?", """
                Для маленькой команды Flyway выглядит проще: SQL-файлы, понятный порядок, меньше магии. Liquibase удобнее, когда нужна декларативность, rollback и больше контроля над changelog.

                Что у вас меньше ломалось на долгой дистанции?
                """, "database, migrations, flyway", 12L, 2L, List.of(
                    new SeedComment(timur, "Flyway проще объяснить новому человеку за пять минут.", 2L, null),
                    new SeedComment(katya, "Liquibase у нас был полезен из-за разных окружений, но changelog быстро разрастался.", 1L, null),
                    new SeedComment(roman, "Похоже, выбор зависит от того, насколько сложная релизная политика.", 1L, 1)
                )),
            new SeedTopic(List.of("web", "frontend"), dima, "CSS Grid или Flex для layout страницы?", """
                Для компонентов я всё ещё чаще беру flex, но для страницы с сайдбаром, списком и адаптивными колонками grid читается намного спокойнее.

                Где у вас проходит граница между grid и flex?
                """, "css, layout, frontend", 17L, 3L, List.of(
                    new SeedComment(nikita, "Grid для двумерной раскладки, flex для ряда элементов. Банально, но почти всегда работает.", 3L, null),
                    new SeedComment(vera, "Мне grid особенно нравится для карточек, где не хочется прыгучей ширины.", 1L, null),
                    new SeedComment(dima, "Да, auto-fit/minmax сильно упрощают жизнь.", 1L, 0)
                )),
            new SeedTopic(List.of("web", "frontend"), nikita, "React state: когда нужен useReducer?", """
                useState отлично держится, пока состояние не начинает обновляться из пяти разных действий. После этого reducer часто делает код скучнее, но предсказуемее.

                Вы когда переходите на useReducer или сразу берёте store?
                """, "react, state, frontend", 15L, 2L, List.of(
                    new SeedComment(katya, "Если action можно нормально назвать, reducer уже имеет смысл.", 2L, null),
                    new SeedComment(timur, "Store беру только когда состояние реально разделяется между экранами.", 1L, null),
                    new SeedComment(nikita, "Хороший критерий. Локальную сложность не всегда надо делать глобальной.", 1L, 1)
                )),
            new SeedTopic(List.of("anime", "manga"), nora, "Манга, где адаптация аниме реально лучше?", """
                Обычно говорят наоборот, но иногда режиссура, музыка и монтаж вытаскивают материал сильнее, чем статичная страница. Особенно если история держится на атмосфере.

                Какие адаптации вы бы советовали смотреть вместо чтения?
                """, "anime, manga, adaptation", 13L, 2L, List.of(
                    new SeedComment(vera, "Mob Psycho 100 для меня пример, где анимация добавила огромный слой.", 2L, null),
                    new SeedComment(ilya, "Made in Abyss звучанием и цветом тоже сильно выигрывает.", 1L, null),
                    new SeedComment(nora, "Да, музыка там делает половину тревоги.", 1L, 1)
                )),
            new SeedTopic(List.of("anime", "manga"), mira, "Что читать после Chainsaw Man?", """
                Хочется чего-то с похожей смесью абсурда, боли и резкой смены тона, но не просто копию. Dorohedoro и Fire Punch обычно вспоминают первыми.

                Что бы вы добавили в такой список?
                """, "manga, recommendations, chainsaw-man", 16L, 3L, List.of(
                    new SeedComment(nora, "Dorohedoro точно. Оно странное, грязное и при этом очень человечное.", 3L, null),
                    new SeedComment(lena, "Fire Punch ближе по авторскому ощущению, но предупреждений там надо больше.", 2L, null),
                    new SeedComment(mira, "Поняла, начну с Dorohedoro, а Fire Punch оставлю на нужное настроение.", 1L, 0)
                )),
            new SeedTopic(List.of("limbus", "limbus-company"), lena, "Mirror Dungeon gifts: что брать в первую очередь?", """
                Хочется обсудить не конкретного Heathcliff, а общую экономику Mirror Dungeon. Иногда подарок выглядит слабым отдельно, но полностью меняет темп команды.

                Какие gifts вы берёте почти автоматически?
                """, "limbus-company, mirror-dungeon, gifts", 18L, 3L, List.of(
                    new SeedComment(ilya, "Я почти всегда беру то, что усиливает основной статус команды, даже если бонус небольшой.", 2L, null),
                    new SeedComment(mira, "Для Bleed-команд snowball важнее одиночного сильного EGO gift.", 1L, null),
                    new SeedComment(lena, "Да, стабильность по этажам обычно ценнее одного красивого боя.", 1L, 0)
                )),
            new SeedTopic(List.of("limbus", "limbus-company"), mira, "Railway teams без идеального roster", """
                Многие гайды предполагают, что у тебя есть все лучшие ID и EGO. Но реальный аккаунт часто собран кусками, особенно у новых игроков.

                Как вы заменяете недостающие ключевые ID в Railway?
                """, "limbus-company, railway, team-building", 15L, 2L, List.of(
                    new SeedComment(lena, "Сначала закрываю роли: clash, sustain, damage. Потом уже думаю про идеальный статус.", 2L, null),
                    new SeedComment(alex, "Иногда медленнее, но стабильнее - лучше, чем пытаться повторить speedrun-команду.", 1L, null),
                    new SeedComment(mira, "Вот это звучит полезнее большинства tier list для новичков.", 1L, 0)
                )),
            new SeedTopic(List.of("russian", "language"), sonya, "Как объяснить вид глагола без таблицы на стену?", """
                Совершенный и несовершенный вид часто путают сильнее падежей, потому что в английском нет прямой кнопки для такого выбора.

                Какие короткие объяснения или примеры у вас срабатывали?
                """, "русский-язык, глаголы, обучение", 16L, 3L, List.of(
                    new SeedComment(katya, "Я начинаю с результата: сделал или делал. Потом уже добавляю контекст.", 2L, null),
                    new SeedComment(sonya, "Да, пара написать/писать обычно помогает быстрее, чем длинная теория.", 2L, null),
                    new SeedComment(dima, "Ещё хорошо работает пример с читать книгу и прочитать книгу.", 1L, null)
                )),
            new SeedTopic(List.of("russian", "language"), sonya, "Почему «на Украине» и «в Украине» вызывает столько споров?", """
                Это не только грамматика, но и политика, привычка, регион и уважение к самоназванию. Поэтому сухого правила тут мало.

                Как бы вы объяснили выбор предлога изучающему русский без лишнего конфликта?
                """, "русский-язык, предлоги, usage", 11L, 1L, List.of(
                    new SeedComment(mira, "Я бы сказала: в современной нейтральной речи лучше использовать «в Украине».", 2L, null),
                    new SeedComment(sonya, "И добавить, что старые тексты могут использовать другой вариант.", 1L, null),
                    new SeedComment(timur, "Контекст важнее попытки найти одно вечное правило.", 1L, null)
                ))
        );
    }

    private void renameLegacyDemoUsers() {
        renameIfAvailable("demo_user_01", "olga_thread");
        renameIfAvailable("demo_user_02", "andrei_notes");
        renameIfAvailable("demo_user_03", "sergey_build");
    }

    private void renameIfAvailable(String oldUsername, String newUsername) {
        userRepository.findByUsernameIgnoreCase(oldUsername).ifPresent(user -> {
            Optional<User> target = userRepository.findByUsernameIgnoreCase(newUsername);
            if (target.isEmpty() || target.get().getId().equals(user.getId())) {
                user.setUsername(newUsername);
                if (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()) {
                    user.setAvatarUrl(avatarUrl(newUsername));
                }
                userRepository.save(user);
            }
        });
    }

    private User ensureDemoUser(String legacyUsername, String username, String email, String bio) {
        return userRepository.findByUsernameIgnoreCase(username)
            .or(() -> userRepository.findByUsernameIgnoreCase(legacyUsername))
            .or(() -> userRepository.findByEmail(email))
            .map(user -> {
            boolean changed = false;
            if (!username.equals(user.getUsername()) && usernameAvailableFor(user, username)) {
                user.setUsername(username);
                changed = true;
            }
            if (user.getEmail() == null || user.getEmail().isBlank()) {
                user.setEmail(email);
                changed = true;
            }
            if (user.getBio() == null || user.getBio().isBlank()) {
                user.setBio(bio);
                changed = true;
            }
            if (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()) {
                user.setAvatarUrl(avatarUrl(username));
                changed = true;
            }
            if (user.isBlocked()) {
                user.setBlocked(false);
                changed = true;
            }
            return changed ? userRepository.save(user) : user;
        }).orElseGet(() -> {
            User user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setPasswordHash(passwordEncoder.encode("demo12345"));
            user.setAvatarUrl(avatarUrl(username));
            user.setBio(bio);
            user.setBlocked(false);
            user.setAdmin(false);
            return userRepository.save(user);
        });
    }

    private boolean usernameAvailableFor(User user, String username) {
        return userRepository.findByUsernameIgnoreCase(username)
            .map(existing -> existing.getId().equals(user.getId()))
            .orElse(true);
    }

    private String avatarUrl(String seed) {
        return "https://api.dicebear.com/9.x/initials/svg?seed=" + seed;
    }

    private Optional<Game> findForum(List<String> terms) {
        return gameRepository.findAllByOrderByTitleAsc().stream()
            .filter(game -> terms.stream().anyMatch(term -> matchesForum(game, term)))
            .findFirst();
    }

    private boolean matchesForum(Game game, String term) {
        String normalizedTerm = term.toLowerCase();
        return game.getSlug().toLowerCase().contains(normalizedTerm)
            || game.getTitle().toLowerCase().contains(normalizedTerm);
    }

    private Optional<ForumCategory> findDefaultCategory(Game game) {
        List<ForumCategory> categories = categoryRepository.findByGameIdOrderByNameAsc(game.getId());
        return categories.stream()
            .filter(category -> "general-discussions".equals(category.getSlug()))
            .findFirst()
            .or(() -> categories.stream().findFirst());
    }

    private void upsertTopic(SeedTopic seed, Game game, ForumCategory category) {
        ForumTopic topic = findSeededTopic(seed.title()).orElseGet(ForumTopic::new);
        topic.setGame(game);
        topic.setCategory(category);
        topic.setUser(seed.author());
        topic.setTitle(seed.title());
        topic.setContent(seed.content().trim());
        topic.setTags(seed.tags());
        topic.setViewsCount(seed.views());
        topic.setLikesCount(seed.likes());
        topic.setLastActivityAt(LocalDateTime.now());
        ForumTopic savedTopic = topicRepository.save(topic);

        ensureSeedComments(savedTopic, seed.comments());
        savedTopic.setCommentsCount(commentRepository.countByTopicId(savedTopic.getId()));
        savedTopic.setLastActivityAt(LocalDateTime.now());
        topicRepository.save(savedTopic);
    }

    private Optional<ForumTopic> findSeededTopic(String title) {
        return topicRepository.findAll().stream()
            .filter(topic -> topic.getTitle().equalsIgnoreCase(title))
            .findFirst();
    }

    private void ensureSeedComments(ForumTopic topic, List<SeedComment> seedComments) {
        List<ForumComment> existing = commentRepository.findByTopicIdOrderByCreatedAtAsc(topic.getId());
        List<ForumComment> seeded = new ArrayList<>();
        for (SeedComment seedComment : seedComments) {
            Optional<ForumComment> existingComment = existing.stream()
                .filter(comment -> comment.getContent().equals(seedComment.content()))
                .findFirst();
            ForumComment comment = existingComment.orElseGet(ForumComment::new);
            comment.setTopic(topic);
            comment.setUser(seedComment.author());
            comment.setContent(seedComment.content());
            comment.setLikesCount(seedComment.likes());
            if (seedComment.parentIndex() != null && seedComment.parentIndex() < seeded.size()) {
                comment.setParentComment(seeded.get(seedComment.parentIndex()));
            }
            seeded.add(commentRepository.save(comment));
        }
    }

    private record SeedTopic(
        List<String> forumTerms,
        User author,
        String title,
        String content,
        String tags,
        Long views,
        Long likes,
        List<SeedComment> comments
    ) {
    }

    private record SeedComment(User author, String content, Long likes, Integer parentIndex) {
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Cannot initialize forum categories", ex);
        }
    }
}
