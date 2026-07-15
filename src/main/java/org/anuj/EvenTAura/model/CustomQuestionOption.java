package org.anuj.EvenTAura.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "custom_question_option")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CustomQuestionOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private CustomFormQuestion question;

    @Column(nullable = false)
    private String optionText;

    @Column(nullable = false)
    private Integer displayOrder;
}
