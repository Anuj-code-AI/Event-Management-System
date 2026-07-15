package org.anuj.EvenTAura.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.anuj.EvenTAura.model.enums.QuestionType;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "custom_form_question")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CustomFormQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id", nullable = false)
    private CustomForm customForm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType questionType;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String placeholder;

    @Column(nullable = false)
    private boolean required = false;

    @Column(nullable = false)
    private Integer displayOrder;

    private Integer minLength;

    private Integer maxLength;

    private Integer minValue;

    private Integer maxValue;

    private String regexPattern;

    @OneToMany(
            mappedBy = "question",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OrderBy("displayOrder ASC")
    private List<CustomQuestionOption> options = new ArrayList<>();
}