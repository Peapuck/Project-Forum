package com.projectl.forum.dto;

import java.time.OffsetDateTime;

public record AiTopicSummaryResponse(
    Long topicId,
    String model,
    String summary,
    OffsetDateTime generatedAt
) {
}
