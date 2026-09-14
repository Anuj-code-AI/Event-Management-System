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
            String formId,
            UpdateCustomFormRequest request,
            Authentication authentication
    );

    CustomFormResponse getCustomForm(String formId);

    CustomFormResponse previewCustomForm(
            String formId,
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
            String formId,
            String answersJson,
            Map<String, MultipartFile> uploadedFiles,
            Authentication authentication
    );

    Page<CustomFormSubmissionResponse> getSubmissions(
            String formId,
            int page,
            int size,
            String query,
            FormSortBy sortBy,
            SortDirection direction,
            Authentication authentication
    );

    CustomFormSubmissionResponse getSubmissionById(
            String formId,
            Long submissionId,
            Authentication authentication
    );

    Page<CustomFormSubmissionResponse> getMySubmissions(
            int page,
            int size,
            Authentication authentication
    );

    byte[] exportCsv(
            String formId,
            Authentication authentication
    ) throws IOException;

    void deleteCustomForm(
            String formId,
            Authentication authentication
    );

    void cancelCustomForm(
            String formId,
            Authentication authentication
    );

    void restoreCustomForm(
            String formId,
            Authentication authentication
    );

    void updateAcceptingResponses(
            String formId,
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

    void approveForm(String formId, Authentication authentication);

    void rejectForm(String formId, Authentication authentication);

}
