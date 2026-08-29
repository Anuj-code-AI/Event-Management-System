package org.anuj.EvenTAura.ai_feature.controller;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.ai_feature.response.AIDescriptionResponse;
import org.anuj.EvenTAura.ai_feature.service.AiDescriptionService;
import org.anuj.EvenTAura.payload.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiDescriptionService aiDescriptionService;

    @PostMapping("/generate-description")
    public ResponseEntity<ApiResponse<AIDescriptionResponse>> generateDescription(
            @RequestParam("bannerImage") MultipartFile bannerImage
    ) throws IOException {

        AIDescriptionResponse response =
                aiDescriptionService.generateDescription(bannerImage);

        return ResponseEntity.ok(
                ApiResponse.success("Response generated successfully", response));
    }
}