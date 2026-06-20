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

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UniversityServiceImpl implements UniversityService {

    private final UniversityRepository universityRepository;


    @Override
    @Transactional
    public UniversityResponse addUniversity(UniversityRequest request, Authentication authentication) {

        Optional<University> existingUniversity =
                universityRepository.findByNameContainingIgnoreCase(request.getName());

        if (existingUniversity.isPresent()) {
            University university = existingUniversity.get();

            if (!university.getActive()) {
                university.setActive(true);
                universityRepository.save(university);
                return UniversityMapper.toResponse(university);
            }

            throw new RuntimeException("University already exists");
        }

        University university = UniversityMapper.toEntity(request);
        university.setActive(true); // optional, if default is not already true
        university = universityRepository.save(university);
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
        university = universityRepository.save(university);
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
        universityRepository.save(university);
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
    public Page<UniversityResponse> getAllUniversity(int page, int size, String query){
        Sort sort = Sort.by("name").ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<University> universities;

        if (query == null || query.isBlank()){
            universities = universityRepository.findByActive(true, pageable);
        } else {
            universities = universityRepository.findByActiveAndNameContainingIgnoreCase(true , query, pageable);
        }
        return universities
                .map(university -> new UniversityResponse(
                        university.getUniversityId(),
                        university.getName(),
                        university.getDomain(),
                        university.getLogoUrl()
                ));
    }

}
