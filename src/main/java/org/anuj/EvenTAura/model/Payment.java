package org.anuj.EvenTAura.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.anuj.EvenTAura.model.enums.PaymentStatus;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long paymentId;

    private Double amount;

    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    private String paymentMethod;   // UPI / CARD / NETBANKING

    private String transactionId;   // gateway transaction id

    private LocalDateTime paidAt;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "event_id")
    private Event event;
}