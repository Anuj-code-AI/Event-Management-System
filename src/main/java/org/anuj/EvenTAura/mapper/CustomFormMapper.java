package org.anuj.EvenTAura.mapper;

import org.anuj.EvenTAura.model.CustomForm;

import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.model.*;

import java.util.Collections;
import java.util.stream.Collectors;

public final class CustomFormMapper {

    // ==========================================================
    // Custom Form
    // ==========================================================

    public static CustomFormResponse toResponse(CustomForm form) {

        return new CustomFormResponse(
                form.getUniqueId(),
                form.getTitle(),
                form.getDescription(),
                form.getCreatedBy() != null
                        ? form.getCreatedBy().getName()
                        : null,
                form.getCreatedAt(),
                form.getBannerUrl(),
                form.getUniversity() != null
                        ? form.getUniversity().getName()
                        : null,
                form.getParticipationType(),
                form.getStatus(),
                form.isAcceptingResponses(),
                form.getRegistrationStart(),
                form.getRegistrationDeadline(),
                form.getMaxSubmissions(),
                form.isAllowMultipleSubmissions(),
                form.isPaymentRequired(),
                form.getPaymentQrUrl(),
                form.getRegistrationFee(),
                form.getPaymentInstructions(),
                form.getQuestions() == null
                        ? Collections.emptyList()
                        : form.getQuestions()
                          .stream()
                          .map(CustomFormMapper::toQuestionResponse)
                          .collect(Collectors.toList())
        );
    }

    // ==========================================================
    // Custom Form Summary
    // ==========================================================


    public static CustomFormSummaryResponse toSummaryResponse(CustomForm form) {

        return new CustomFormSummaryResponse(
                form.getUniqueId(),
                form.getTitle(),
                form.getBannerUrl(),
                form.getRegistrationDeadline(),
                form.getStatus(),
                form.getUniversity().getLogoUrl(),
                form.isAcceptingResponses()
        );
    }

    // ==========================================================
    // Question
    // ==========================================================

    public static QuestionResponse toQuestionResponse(
            CustomFormQuestion question
    ) {
        return new QuestionResponse(
                question.getId(),
                question.getTitle(),
                question.getDescription(),
                question.getPlaceholder(),
                question.getQuestionType(),
                question.isRequired(),
                question.getDisplayOrder(),
                question.getMinLength(),
                question.getMaxLength(),
                question.getMinValue(),
                question.getMaxValue(),
                question.getRegexPattern(),
                question.getOptions() == null
                        ? Collections.emptyList()
                        : question.getOptions()
                          .stream()
                          .map(CustomQuestionOption::getOptionText)
                          .collect(Collectors.toList())
        );
    }

    // ==========================================================
    // Submission
    // ==========================================================

    public static CustomFormSubmissionResponse toSubmissionResponse(
            CustomFormSubmission submission
    ) {
        return new CustomFormSubmissionResponse(
                submission.getId(),
                submission.getSubmissionCode(),
                submission.getSubmittedBy().getUserId(),
                submission.getSubmittedBy().getName(),
                submission.getSubmittedBy().getEmail(),
                submission.getSubmittedAt(),
                submission.getAnswers()
                        .stream()
                        .map(CustomFormMapper::toAnswerResponse)
                        .collect(Collectors.toList()),
                submission.getCustomForm().getId(),
                submission.getCustomForm().getTitle(),
                submission.getCustomForm().getBannerUrl()
        );
    }

    // ==========================================================
    // Answer
    // ==========================================================

    public static AnswerResponse toAnswerResponse(
            CustomFormAnswer answer
    ) {
        return new AnswerResponse(
                answer.getQuestion().getId(),
                answer.getQuestion().getTitle(),
                answer.getAnswerValue(),
                answer.getFileUrl()
        );
    }

}
