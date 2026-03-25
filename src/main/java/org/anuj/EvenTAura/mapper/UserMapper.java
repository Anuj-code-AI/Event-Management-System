package org.anuj.EvenTAura.mapper;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.UserRequest;
import org.anuj.EvenTAura.dto.UserResponse;
import org.anuj.EvenTAura.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserMapper {

    private final PasswordEncoder passwordEncoder;

    public UserResponse toResponse(User user){
        return new UserResponse(user.getName(), user.getEmail());
    }

    public void updateUserfromRequest(UserRequest request, User user){
        if(request.getName() != null){
            user.setName(request.getName());
        }
        if(request.getPassword() != null){
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
    }
}
