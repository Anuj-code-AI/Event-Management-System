package org.anuj.EvenTAura.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name="host_profile")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class HostProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long hostId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String collegeEmail;

    private String phone;

    @Enumerated(EnumType.STRING)
    private Status status;

    @CreationTimestamp
    private LocalDateTime appliedAt;
}
