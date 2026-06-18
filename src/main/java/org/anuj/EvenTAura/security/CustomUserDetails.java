package org.anuj.EvenTAura.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class CustomUserDetails implements UserDetails {

    private final Long id;
    private final String email;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean isActive;

    public CustomUserDetails(Long id, String email,
                             Collection<? extends  GrantedAuthority> authorities, boolean isActive) {
        this.id = id;
        this.email = email;
        this.authorities = authorities;
        this.isActive = isActive;
    }

    public Long getId() {
        return id;
    }

    @Override
    public String getUsername() {
        return email;
    }


    @Override public String getPassword() { return null; }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return isActive; }
}
