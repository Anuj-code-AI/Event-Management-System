package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.model.enums.FormSortBy;
import org.anuj.EvenTAura.model.enums.FormStatus;
import org.anuj.EvenTAura.model.enums.SortDirection;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

public interface CustomFormService {

    CustomFormResponse createCustomForm(
            CreateCustomFormRequest request,
            Authentication authentication
    );

    CustomFormResponse updateCustomForm(
            Long formId,
            UpdateCustomFormRequest request,
            Authentication authentication
    );

    CustomFormResponse getCustomForm(Long formId);

    CustomFormResponse previewCustomForm(
            Long formId,
            Authentication authentication
    );

    Page<CustomFormSummaryResponse> getHostedForms(
            int page,
            int size,
            Authentication authentication
    );

    Page<CustomFormSummaryResponse> getGlobalForms(
            String query,
            int page,
            int size
    );

    Page<CustomFormSummaryResponse> getCampusForms(
            String query,
            int page,
            int size,
            Authentication authentication
    );

    CustomFormSubmissionResponse submitFormAnswers(
            Long formId,
            String answersJson,
            Map<String, MultipartFile> uploadedFiles,
            Authentication authentication
    );

    Page<CustomFormSubmissionResponse> getSubmissions(
            Long formId,
            int page,
            int size,
            String query,
            FormSortBy sortBy,
            SortDirection direction,
            Authentication authentication
    );

    CustomFormSubmissionResponse getSubmissionById(
            Long formId,
            Long submissionId,
            Authentication authentication
    );

    Page<CustomFormSubmissionResponse> getMySubmissions(
            int page,
            int size,
            Authentication authentication
    );

    byte[] exportCsv(
            Long formId,
            Authentication authentication
    ) throws IOException;

    void deleteCustomForm(
            Long formId,
            Authentication authentication
    );

    void cancelCustomForm(
            Long formId,
            Authentication authentication
    );

    void restoreCustomForm(
            Long formId,
            Authentication authentication
    );

    void updateAcceptingResponses(
            Long formId,
            boolean acceptingResponses,
            Authentication authentication
    );

    Page<CustomFormSummaryResponse> getFormsByStatus(
            FormStatus status,
            String query,
            int page,
            int size,
            FormSortBy sortBy,
            SortDirection direction,
            Authentication authentication
    );

    void approveForm(Long formId, Authentication authentication);

    void rejectForm(Long formId, Authentication authentication);

}
