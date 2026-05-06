package com.projectl.forum.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.projectl.forum.dto.AiTopicSummaryResponse;
import com.projectl.forum.entity.ForumComment;
import com.projectl.forum.entity.ForumTopic;
import com.projectl.forum.exception.AiServiceException;
import com.projectl.forum.exception.BadRequestException;
import com.projectl.forum.exception.NotFoundException;
import com.projectl.forum.repository.ForumCommentRepository;
import com.projectl.forum.repository.ForumTopicRepository;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiTopicSummaryService {

    private static final int MAX_COMMENTS = 80;
    private static final int MAX_CONTEXT_CHARS = 18_000;

    private final ForumTopicRepository topicRepository;
    private final ForumCommentRepository commentRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String provider;
    private final String apiKey;
    private final String model;
    private final String ollamaUrl;

    public AiTopicSummaryService(
        ForumTopicRepository topicRepository,
        ForumCommentRepository commentRepository,
        ObjectMapper objectMapper,
        @Value("${ai.provider:ollama}") String provider,
        @Value("${openai.api-key:}") String apiKey,
        @Value("${ai.model:${ollama.model:llama3.1:8b}}") String model,
        @Value("${ollama.url:http://localhost:11434}") String ollamaUrl
    ) {
        this.topicRepository = topicRepository;
        this.commentRepository = commentRepository;
        this.objectMapper = objectMapper;
        this.provider = provider;
        this.apiKey = apiKey;
        this.model = model;
        this.ollamaUrl = ollamaUrl;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    }

    @Transactional(readOnly = true)
    public AiTopicSummaryResponse summarizeTopic(Long topicId) {
        ForumTopic topic = topicRepository.findById(topicId)
            .orElseThrow(() -> new NotFoundException("Topic not found"));
        List<ForumComment> comments = commentRepository.findByTopicIdOrderByCreatedAtAsc(topicId).stream()
            .limit(MAX_COMMENTS)
            .toList();

        String prompt = buildPrompt(topic, comments);
        String summary = requestSummary(prompt);
        return new AiTopicSummaryResponse(topicId, provider + ":" + model, summary, OffsetDateTime.now());
    }

    private String buildPrompt(ForumTopic topic, List<ForumComment> comments) {
        StringBuilder builder = new StringBuilder();
        builder.append("Тема форума: ").append(topic.getTitle()).append('\n');
        builder.append("Форум: ").append(topic.getGame().getTitle()).append('\n');
        builder.append("Раздел: ").append(topic.getCategory().getName()).append('\n');
        builder.append("Автор темы: ").append(displayUsername(topic.getUser().getUsername())).append('\n');
        builder.append("Пост автора:\n").append(stripHtml(topic.getContent())).append("\n\n");

        if (comments.isEmpty()) {
            builder.append("Комментариев пока нет.\n");
        } else {
            builder.append("Комментарии пользователей:\n");
            for (int index = 0; index < comments.size(); index++) {
                ForumComment comment = comments.get(index);
                builder.append(index + 1)
                    .append(". ")
                    .append(displayUsername(comment.getUser().getUsername()))
                    .append(": ")
                    .append(stripHtml(comment.getContent()))
                    .append('\n');
                if (builder.length() >= MAX_CONTEXT_CHARS) {
                    builder.append("\nОстальная часть обсуждения обрезана из-за лимита контекста.\n");
                    break;
                }
            }
        }
        return builder.substring(0, Math.min(builder.length(), MAX_CONTEXT_CHARS));
    }

    private String requestSummary(String prompt) {
        if ("openai".equalsIgnoreCase(provider)) {
            return requestOpenAiSummary(prompt);
        }
        if ("ollama".equalsIgnoreCase(provider)) {
            return requestOllamaSummary(prompt);
        }
        throw new BadRequestException("Unknown AI provider: " + provider);
    }

    private String requestOpenAiSummary(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new BadRequestException("OpenAI API key is not configured. Set OPENAI_API_KEY before using AI summaries.");
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("instructions", buildInstructions());
            body.put("input", prompt);
            body.put("max_output_tokens", 900);

            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.openai.com/v1/responses"))
                .timeout(Duration.ofSeconds(45))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(response.body());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = root.path("error").path("message").asText("AI service request failed");
                throw new AiServiceException(toUserFriendlyError(message));
            }

            String text = root.path("output_text").asText();
            if (text == null || text.isBlank()) {
                text = extractTextFromOutput(root);
            }
            if (text == null || text.isBlank()) {
                throw new AiServiceException("AI service returned an empty summary");
            }
            return text.trim();
        } catch (IOException ex) {
            throw new AiServiceException("Could not prepare AI summary request", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new AiServiceException("AI summary request was interrupted", ex);
        }
    }

    private String requestOllamaSummary(String prompt) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("prompt", buildInstructions() + "\n\n" + prompt);
            body.put("stream", false);
            body.put("options", Map.of("temperature", 0.2, "num_predict", 900));

            HttpRequest request = HttpRequest.newBuilder(URI.create(ollamaUrl + "/api/generate"))
                .timeout(Duration.ofMinutes(3))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode root = objectMapper.readTree(response.body());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = root.path("error").asText("Ollama request failed");
                throw new AiServiceException(toOllamaFriendlyError(message));
            }
            String text = root.path("response").asText();
            if (text == null || text.isBlank()) {
                throw new AiServiceException("Ollama returned an empty summary");
            }
            return text.trim();
        } catch (IOException ex) {
            throw new AiServiceException("ИИ недоступен: Ollama не запущен или модель не установлена.", ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new AiServiceException("AI summary request was interrupted", ex);
        }
    }

    private String extractTextFromOutput(JsonNode root) {
        StringBuilder text = new StringBuilder();
        for (JsonNode item : root.path("output")) {
            for (JsonNode content : item.path("content")) {
                String value = content.path("text").asText("");
                if (!value.isBlank()) {
                    text.append(value).append('\n');
                }
            }
        }
        return text.toString();
    }

    private String toUserFriendlyError(String message) {
        String normalized = message == null ? "" : message.toLowerCase();
        if (normalized.contains("quota") || normalized.contains("billing")) {
            return "ИИ временно недоступен: на OpenAI API-ключе закончилась квота или не настроена оплата.";
        }
        if (normalized.contains("invalid api key") || normalized.contains("incorrect api key")) {
            return "ИИ временно недоступен: OpenAI API-ключ недействителен.";
        }
        if (normalized.contains("model") && normalized.contains("not")) {
            return "ИИ временно недоступен: выбранная модель OpenAI недоступна для этого ключа.";
        }
        return message == null || message.isBlank()
            ? "ИИ временно недоступен. Попробуйте позже."
            : message;
    }

    private String toOllamaFriendlyError(String message) {
        String normalized = message == null ? "" : message.toLowerCase();
        if (normalized.contains("not found") || normalized.contains("model")) {
            return "ИИ недоступен: модель Ollama `" + model + "` не установлена. Выполните `ollama pull " + model + "`.";
        }
        return message == null || message.isBlank()
            ? "ИИ недоступен: Ollama вернул ошибку."
            : message;
    }

    private String buildInstructions() {
        return """
            Do not use markdown, bullet lists, numbered lists, hashes, asterisks or list markers. Write only short paragraphs separated by blank lines.
            Ты помощник форума. Прочитай пост и комментарии, затем объясни обсуждение простым русским языком.
            Ответ должен быть полезен пользователю, который не хочет читать всю ветку.
            Не выдумывай факты, не добавляй внешнюю информацию и явно отмечай, если по комментариям нет единого мнения.
            Структура ответа:
            1. Коротко о теме
            2. Что уже ответили
            3. Главные мнения пользователей
            4. Что осталось неясным
            5. Итог
            """;
    }

    private String stripHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
            .replaceAll("(?is)<script.*?</script>", " ")
            .replaceAll("<[^>]+>", " ")
            .replaceAll("\\s+", " ")
            .trim();
    }

    private String displayUsername(String username) {
        return username == null || username.isBlank() ? "Пользователь" : username;
    }
}
