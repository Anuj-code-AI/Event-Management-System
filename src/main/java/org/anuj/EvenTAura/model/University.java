package org.anuj.EvenTAura.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "universities")
@Getter @Setter
public class University {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long universityId;

    @Column(unique = true, nullable = false)
    private String name;

    @Column(unique = true)
    private String domain;

    private String logoUrl;

    private Boolean active = true;
}
