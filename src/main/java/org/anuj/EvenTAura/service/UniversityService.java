package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.UniversityRequest;
import org.anuj.EvenTAura.dto.UniversityResponse;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;

public interface UniversityService {
    UniversityResponse addUniversity(UniversityRequest request, Authentication authentication);
    UniversityResponse updateUniversity(Long universityId, UniversityRequest request, Authentication authentication);
    UniversityResponse getUniversityById(Long universityId, Authentication authentication);
    Page<UniversityResponse> getAllUniversity(int page, int size, Authentication authentication);
    Void deleteUniversity(Long universityId, Authentication authentication);
}
