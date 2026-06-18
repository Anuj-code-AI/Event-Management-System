package org.anuj.EvenTAura.service;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.UniversityRequest;
import org.anuj.EvenTAura.dto.UniversityResponse;
import org.anuj.EvenTAura.exception.AllExceptions.UniversityNotFoundException;
import org.anuj.EvenTAura.mapper.UniversityMapper;
import org.anuj.EvenTAura.model.University;
import org.anuj.EvenTAura.repository.UniversityRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UniversityServiceImpl implements UniversityService {

    private final UniversityRepository universityRepository;


    @Override
    @Transactional
    public UniversityResponse addUniversity(UniversityRequest request, Authentication authentication) {
        University university = UniversityMapper.toEntity(request);
        universityRepository.save(university);
        return UniversityMapper.toResponse(university);
    }

    @Override
    @Transactional
    public UniversityResponse updateUniversity(Long universityId, UniversityRequest request, Authentication authentication) {
        University university = universityRepository.findByUniversityId(universityId)
                .orElseThrow(() -> new UniversityNotFoundException("University with this id doesn't exist"));
        if(!university.getActive()){
            throw new UniversityNotFoundException("University not found");
        }
        UniversityMapper.toUpdateEntity(university, request);
        return UniversityMapper.toResponse(university);
    }

    @Override
    @Transactional
    public Void deleteUniversity(Long universityId, Authentication authentication) {
        University university = universityRepository.findByUniversityId(universityId)
                .orElseThrow(() -> new UniversityNotFoundException("University with this id doesn't exist"));
        if(!university.getActive()){
            throw new UniversityNotFoundException("University not found");
        }
        university.setActive(false);
        return null;
    }

    @Override
    public UniversityResponse getUniversityById(Long universityId, Authentication authentication) {
        University university = universityRepository.findByUniversityId(universityId)
                .orElseThrow(() -> new UniversityNotFoundException("University with this id doesn't exist"));
        if(!university.getActive()){
            throw new UniversityNotFoundException("University not found");
        }
        return UniversityMapper.toResponse(university);
    }

    @Override
    public Page<UniversityResponse> getAllUniversity(int page, int size, Authentication authentication){
        Sort sort = Sort.by("name").ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return universityRepository.findByActive(true,pageable)
                .map(university -> new UniversityResponse(
                        university.getUniversityId(),
                        university.getName(),
                        university.getDomain(),
                        university.getLogoUrl()
                ));
    }

}
