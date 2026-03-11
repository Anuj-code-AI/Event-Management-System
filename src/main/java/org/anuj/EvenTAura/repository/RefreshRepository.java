package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.RefreshToken;
import org.anuj.EvenTAura.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshRepository extends JpaRepository<RefreshToken,Long> {
    void deleteByUser(User user);
}
