package org.anuj.EvenTAura.mapper;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.RegisterRequest;
import org.anuj.EvenTAura.dto.UserResponse;
import org.anuj.EvenTAura.dto.UserUpdateRequest;
import org.anuj.EvenTAura.model.University;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.model.enums.AuthProvider;
import org.anuj.EvenTAura.model.enums.SystemRole;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserMapper {

    public static User toEntity(RegisterRequest request, University university){
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setProvider(AuthProvider.LOCAL);
        user.setUniversity(university);
        user.setSystemRole(SystemRole.USER);
        return user;
    }

    public static UserResponse toResponse(User user){
        String university = null;
        String universityDomain = null;
        if(user.getUniversity()!=null){
            university = user.getUniversity().getName();
            universityDomain = user.getUniversity().getDomain();
        }
        return new UserResponse(user.getUserId(),
                user.getName(),
                user.getEmail(),
                user.getSystemRole(),
                university,
                user.getProvider(),
                universityDomain);
    }

    public static void toUpdatedEntity(User user, UserUpdateRequest request, University university){
        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName());
        }
        if (request.getUniversity() != null && !request.getUniversity().isBlank()) {
            user.setUniversity(university);
        }
        if (request.getPassword() != null) {
            user.setPassword(request.getPassword());
        }
    }

}
