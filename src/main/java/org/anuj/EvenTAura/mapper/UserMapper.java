package org.anuj.EvenTAura.mapper;

import org.anuj.EvenTAura.dto.UserResponse;
import org.anuj.EvenTAura.model.User;

public class UserMapper {
    public static UserResponse toResponse(User user){
        return new UserResponse(user.getName(),user.getEmail());
    }
}
