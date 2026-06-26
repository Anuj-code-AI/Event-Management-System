package org.anuj.EvenTAura.model;


import jakarta.persistence.*;
import lombok.*;
import org.anuj.EvenTAura.model.enums.AuthProvider;
import org.anuj.EvenTAura.model.enums.SystemRole;

@Entity
@Table(name="users")
@AllArgsConstructor @NoArgsConstructor
@Getter @Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    private String name;

    @Column(name = "email", unique = true, nullable = false)
    private String primaryEmail;

    @Column(name = "secondary_email")
    private String secondaryEmail;

    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SystemRole systemRole;

    @ManyToOne
    @JoinColumn(name = "university_id")
    private University university;

    @Column(nullable = false)
    private Boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider provider;

}
