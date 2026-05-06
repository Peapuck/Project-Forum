# Forum Backend

1. Выполните SQL из `sql/forum_schema.sql`.
2. Настройте подключение к PostgreSQL в `src/main/resources/application.properties`.
3. Запустите Spring Boot:

```bash
mvn spring-boot:run
```

Если Maven не установлен глобально, можно использовать локальную копию:

```bash
apache-maven-3.9.14/bin/mvn spring-boot:run
```

Базовый URL API: `http://localhost:8081/api/forum`

Для простой интеграции текущий пользователь передаётся в заголовке `X-User-Id`.

## ИИ-разбор темы

На странице темы кнопка со звездой запрашивает `POST /api/forum/topics/{topicId}/ai-summary`.
Backend читает текст темы и комментарии, отправляет их локальной модели Ollama и возвращает краткий разбор обсуждения.

По умолчанию используется локальный провайдер Ollama и модель `llama3:latest`:

```powershell
ollama pull llama3
ollama serve
```

Модель можно заменить через `AI_MODEL`. Для OpenAI можно вернуть облачный режим:

```powershell
$env:AI_PROVIDER="openai"
$env:AI_MODEL="gpt-4.1-mini"
$env:OPENAI_API_KEY="your_api_key"
```
