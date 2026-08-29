package org.anuj.EvenTAura.ai_feature.service;


import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.ai_feature.response.AIDescriptionResponse;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiDescriptionServiceImpl implements AiDescriptionService {

    private final GoogleGenAiChatModel chatModel;

    public AIDescriptionResponse generateDescription(
            MultipartFile bannerImage
    ) throws IOException {

        if (bannerImage == null || bannerImage.isEmpty()) {
            throw new IllegalArgumentException(
                    "Banner image is required"
            );
        }

        if (!bannerImage.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException(
                    "Only image files are allowed"
            );
        }

        Resource imageResource =
                new ByteArrayResource(bannerImage.getBytes());

        Media media = new Media(
                MimeType.valueOf(bannerImage.getContentType()),
                imageResource
        );

        String instruction = """
                Analyze this event banner and create a professional
                event description for CampusHive.

                Extract information that is clearly visible in the image,
                such as:
                - Event name
                - Date
                - Time
                - Venue
                - Important activities or highlights

                Write a concise and attractive description suitable for
                displaying on an event-management website.

                IMPORTANT:
                - Do not invent information that is not present in the image.
                - Do not assume missing dates, venues, prices, speakers,
                  organizers, or other details.
                - If some information is unclear or unavailable, simply
                  omit it.
                - Return only the final event description.
                - Add emojis if possible
                - keep it under 1000 words
                """;

        UserMessage message = UserMessage.builder()
                .text(instruction)
                .media(List.of(media))
                .build();

        ChatResponse response =
                chatModel.call(new Prompt(message));

        if (response == null ||
                response.getResult() == null ||
                response.getResult().getOutput() == null) {

            throw new RuntimeException(
                    "Unable to generate event description"
            );
        }

        String description =
                response.getResult()
                        .getOutput()
                        .getText();

        return new AIDescriptionResponse(description);
    }
}
