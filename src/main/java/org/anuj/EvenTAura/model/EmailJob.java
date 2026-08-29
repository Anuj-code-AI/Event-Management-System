package org.anuj.EvenTAura.model;

import jakarta.persistence.*;
import lombok.*;
import org.anuj.EvenTAura.model.enums.JobStatus;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "email_jobs",
        indexes = {
                @Index(
                        name = "idx_email_jobs_status_scheduled",
                        columnList = "status, scheduledAt"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long ticketId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime scheduledAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    private int retryCount = 0;

    private int maxRetries = 3;

    @Column(length = 2000)
    private String lastError;

    private LocalDateTime processingStartedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}