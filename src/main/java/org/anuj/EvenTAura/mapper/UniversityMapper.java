package org.anuj.EvenTAura.mapper;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.UniversityRequest;
import org.anuj.EvenTAura.dto.UniversityResponse;
import org.anuj.EvenTAura.model.University;
import org.anuj.EvenTAura.repository.UniversityRepository;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UniversityMapper {

    private final UniversityRepository universityRepository;

    public static University toEntity(UniversityRequest request){
        University university = new University();
        university.setName(request.getName());
        university.setDomain(request.getDomain());
        university.setLogoUrl(request.getLogoUrl());
        return university;
    }

    public static UniversityResponse toResponse(University university){
         return new UniversityResponse(
                university.getUniversityId(),
                university.getName(),
                university.getDomain(),
                university.getLogoUrl()
        );
    }

    public static void toUpdateEntity(University university, UniversityRequest request){
        if(request.getName()!=null){
            university.setName(request.getName());
        }
        if(request.getDomain()!=null){
            university.setDomain(request.getDomain());
        }
        if(request.getLogoUrl()!=null){
            university.setLogoUrl(request.getLogoUrl());
        }
    }

}
