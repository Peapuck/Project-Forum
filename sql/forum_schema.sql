DO $$
BEGIN
    IF to_regclass('public.forums') IS NULL AND to_regclass('public.games') IS NOT NULL THEN
        ALTER TABLE games RENAME TO forums;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS forums (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE
);

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

CREATE TABLE IF NOT EXISTS forum_categories (
    id BIGSERIAL PRIMARY KEY,
    forum_id BIGINT NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (forum_id, slug)
);

CREATE TABLE IF NOT EXISTS forum_topics (
    id BIGSERIAL PRIMARY KEY,
    forum_id BIGINT NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    views_count BIGINT NOT NULL DEFAULT 0,
    comments_count BIGINT NOT NULL DEFAULT 0,
    likes_count BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE forum_topics
ADD COLUMN IF NOT EXISTS likes_count BIGINT NOT NULL DEFAULT 0;

ALTER TABLE forum_topics
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

ALTER TABLE forum_topics
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(80);

ALTER TABLE forum_topics
ADD COLUMN IF NOT EXISTS tags TEXT;

ALTER TABLE forum_topics
ADD COLUMN IF NOT EXISTS poll_question VARCHAR(240);

ALTER TABLE forum_topics
ADD COLUMN IF NOT EXISTS poll_options TEXT;

ALTER TABLE forum_topics
ADD COLUMN IF NOT EXISTS code_block TEXT;

ALTER TABLE forum_topics
ADD COLUMN IF NOT EXISTS code_language VARCHAR(80);

CREATE TABLE IF NOT EXISTS forum_comments (
    id BIGSERIAL PRIMARY KEY,
    topic_id BIGINT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id BIGINT REFERENCES forum_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    likes_count BIGINT NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    edited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE forum_comments
ADD COLUMN IF NOT EXISTS parent_comment_id BIGINT REFERENCES forum_comments(id) ON DELETE CASCADE;

ALTER TABLE forum_comments
ADD COLUMN IF NOT EXISTS likes_count BIGINT NOT NULL DEFAULT 0;

ALTER TABLE forum_comments
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE forum_comments
ADD COLUMN IF NOT EXISTS edited BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE forum_comments
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

ALTER TABLE forum_comments
ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(80);

CREATE TABLE IF NOT EXISTS forum_topic_views (
    id BIGSERIAL PRIMARY KEY,
    topic_id BIGINT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (topic_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_topic_likes (
    id BIGSERIAL PRIMARY KEY,
    topic_id BIGINT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (topic_id, user_id)
);

CREATE TABLE IF NOT EXISTS forum_comment_likes (
    id BIGSERIAL PRIMARY KEY,
    comment_id BIGINT NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (comment_id, user_id)
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS bio TEXT;

CREATE INDEX IF NOT EXISTS idx_forum_categories_forum_id ON forum_categories (forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_forum_id ON forum_topics (forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_category_id ON forum_topics (category_id);
CREATE INDEX IF NOT EXISTS idx_forum_topics_last_activity_at ON forum_topics (last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_comments_topic_id ON forum_comments (topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_parent_comment_id ON forum_comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_forum_topic_views_topic_id ON forum_topic_views (topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_topic_likes_topic_id ON forum_topic_likes (topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_comment_likes_comment_id ON forum_comment_likes (comment_id);

CREATE OR REPLACE FUNCTION set_forum_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_topics_updated_at ON forum_topics;
CREATE TRIGGER trg_forum_topics_updated_at
BEFORE UPDATE ON forum_topics
FOR EACH ROW EXECUTE FUNCTION set_forum_updated_at();

DROP TRIGGER IF EXISTS trg_forum_comments_updated_at ON forum_comments;
CREATE TRIGGER trg_forum_comments_updated_at
BEFORE UPDATE ON forum_comments
FOR EACH ROW EXECUTE FUNCTION set_forum_updated_at();

CREATE OR REPLACE FUNCTION sync_topic_counters()
RETURNS TRIGGER AS $$
DECLARE
    affected_topic_id BIGINT;
BEGIN
    affected_topic_id = COALESCE(NEW.topic_id, OLD.topic_id);

    UPDATE forum_topics
       SET comments_count = (
               SELECT COUNT(*)
               FROM forum_comments
               WHERE topic_id = affected_topic_id
           ),
           last_activity_at = CURRENT_TIMESTAMP
     WHERE id = affected_topic_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_topic_counters_insert ON forum_comments;
CREATE TRIGGER trg_sync_topic_counters_insert
AFTER INSERT ON forum_comments
FOR EACH ROW EXECUTE FUNCTION sync_topic_counters();

DROP TRIGGER IF EXISTS trg_sync_topic_counters_update ON forum_comments;
CREATE TRIGGER trg_sync_topic_counters_update
AFTER UPDATE ON forum_comments
FOR EACH ROW EXECUTE FUNCTION sync_topic_counters();

DROP TRIGGER IF EXISTS trg_sync_topic_counters_delete ON forum_comments;
CREATE TRIGGER trg_sync_topic_counters_delete
AFTER DELETE ON forum_comments
FOR EACH ROW EXECUTE FUNCTION sync_topic_counters();

INSERT INTO forum_categories (forum_id, name, slug)
SELECT g.id, category_name, category_slug
FROM forums g
CROSS JOIN (
    VALUES
        ('Обычные обсуждения', 'general-discussions'),
        ('Баги и проблемы', 'bugs-and-issues'),
        ('Помощь', 'help'),
        ('Руководства', 'guides')
) AS defaults(category_name, category_slug)
ON CONFLICT (forum_id, slug) DO NOTHING;
