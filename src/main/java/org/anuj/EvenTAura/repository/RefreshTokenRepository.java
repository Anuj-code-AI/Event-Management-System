package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.RefreshToken;
import org.anuj.EvenTAura.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken,Long> {
    void deleteAllByUser(User user);
    Optional<RefreshToken> findByToken(String refreshToken);
}
