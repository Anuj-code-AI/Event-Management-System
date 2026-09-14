package org.anuj.EvenTAura.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.anuj.EvenTAura.model.enums.FormStatus;
import org.anuj.EvenTAura.model.enums.ParticipationType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "custom_form")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CustomForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "unique_id", nullable = false, unique = true, length = 36)
    private String uniqueId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column
    private String bannerUrl;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "university_id", nullable = false)
    private University university;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FormStatus status = FormStatus.PENDING;

    @Column(nullable = false)
    private boolean acceptingResponses = true;

    private LocalDateTime registrationStart;

    private LocalDateTime registrationDeadline;

    private Integer maxSubmissions;

    @Column(nullable = false)
    private boolean allowMultipleSubmissions = false;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ParticipationType participationType;

    @Version
    private Long version;

    @OneToMany(
            mappedBy = "customForm",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OrderBy("displayOrder ASC")
    private List<CustomFormQuestion> questions = new ArrayList<>();

    @OneToMany(
            mappedBy = "customForm",
            cascade = CascadeType.ALL
    )
    private List<CustomFormSubmission> submissions = new ArrayList<>();

    private boolean paymentRequired = false;

    private Double registrationFee;

    private String paymentQrUrl;

    @Column(columnDefinition = "TEXT")
    private String paymentInstructions;

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @PrePersist
    public void generateUniqueId() {
        if (uniqueId == null || uniqueId.isBlank()) {
            uniqueId = UUID.randomUUID().toString();
        }
    }
}