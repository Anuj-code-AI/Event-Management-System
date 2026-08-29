package org.anuj.EvenTAura.ai_feature.service;

import org.anuj.EvenTAura.ai_feature.response.AIDescriptionResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface AiDescriptionService {
    AIDescriptionResponse generateDescription( MultipartFile bannerImage ) throws IOException;
}
