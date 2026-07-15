package org.anuj.EvenTAura.controller;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.model.enums.FormSortBy;
import org.anuj.EvenTAura.model.enums.SortDirection;
import org.anuj.EvenTAura.payload.ApiResponse;
import org.anuj.EvenTAura.service.CloudinaryService;
import org.anuj.EvenTAura.service.CustomFormService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CustomFormController {

    private final CustomFormService customFormService;
    private final CloudinaryService cloudinaryService;

    // Create a Standalone Custom Form
    @PostMapping("/custom-forms")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<CustomFormResponse>> createCustomForm(
            @ModelAttribute CreateCustomFormRequest request,
            @RequestParam(value = "banner",required = false) MultipartFile banner,
            @RequestParam(value = "paymentQr", required = false) MultipartFile paymentQr,
            Authentication authentication
    ) {
        if (request.getRegistrationFee() != null && request.getRegistrationFee() > 0) {
            if (paymentQr == null || paymentQr.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Payment QR required for paid events"));
            }
        }
        if(request.getRegistrationStart().isAfter(request.getRegistrationDeadline())){
            return ResponseEntity.badRequest().body(ApiResponse.error("Last registration date should be before event date"));
        }
        String paymentQrUrl = null;
        if (paymentQr != null && !paymentQr.isEmpty()) {
            paymentQrUrl = cloudinaryService.uploadImage(paymentQr, "paymentQr");
        }

        String bannerUrl = null;
        if (banner != null && !banner.isEmpty()) {
            bannerUrl = cloudinaryService.uploadImage(banner, "banner");
        }
        request.setBannerUrl(bannerUrl);
        request.setPaymentQrUrl(paymentQrUrl);

        return ResponseEntity.ok(ApiResponse.success("Custom form requested successfully", customFormService.createCustomForm(request, authentication)));
    }

    // Update a Standalone Custom Form
    @PutMapping(value = "/custom-forms/{formId}")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<CustomFormResponse>> updateCustomForm(
            @PathVariable Long formId,
            @ModelAttribute UpdateCustomFormRequest request,
            @RequestParam(value = "banner", required = false) MultipartFile banner,
            @RequestParam(value = "paymentQr", required = false) MultipartFile paymentQr,
            Authentication authentication
    ) {
        if (banner != null && !banner.isEmpty()) {
            request.setBannerUrl(cloudinaryService.uploadImage(banner, "banner"));
        }
        if (paymentQr != null && !paymentQr.isEmpty()) {
            request.setPaymentQrUrl(cloudinaryService.uploadImage(paymentQr, "paymentQr"));
        }
        return ResponseEntity.ok(ApiResponse.success("Custom form updated successfully", customFormService.updateCustomForm(formId, request, authentication)));
    }

    // Delete custom form
    @DeleteMapping("/custom-forms/{formId}")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<Void>> deleteCustomForm(@PathVariable Long formId, Authentication authentication) {
        customFormService.deleteCustomForm(formId, authentication);
        return ResponseEntity.ok(ApiResponse.success("Custom form deleted successfully", null));
    }

    // Cancel custom form
    @PatchMapping("/custom-forms/{formId}/cancel")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<Void>> cancelCustomForm(@PathVariable Long formId, Authentication authentication) {
        customFormService.cancelCustomForm(formId, authentication);
        return ResponseEntity.ok(ApiResponse.success("Custom form deleted successfully", null));
    }

    // Restore custom form
    @PatchMapping("/custom-forms/{formId}/restore")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<Void>> restoreCustomForm(@PathVariable Long formId, Authentication authentication) {
        customFormService.restoreCustomForm(formId, authentication);
        return ResponseEntity.ok(ApiResponse.success("Custom form deleted successfully", null));
    }

    // Accepting Responses
    @PatchMapping("/custom-forms/{formId}/accepting-responses")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<Void>> updateAcceptingResponses(@PathVariable Long formId,@RequestBody boolean acceptingResponses, Authentication authentication) {
        customFormService.updateAcceptingResponses(formId, acceptingResponses,authentication);
        return ResponseEntity.ok(ApiResponse.success("Custom form deleted successfully", null));
    }

    // Get form by id
    @GetMapping("/custom-forms/{formId}")
    public ResponseEntity<ApiResponse<CustomFormResponse>> getCustomForm(@PathVariable Long formId) {
        return ResponseEntity.ok(ApiResponse.success("Custom form structure loaded successfully", customFormService.getCustomForm(formId)));
    }

    // Preview form (Creator / HOD / Admin)
    @GetMapping("/custom-forms/{formId}/preview")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<CustomFormResponse>> previewCustomForm(
            @PathVariable Long formId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                ApiResponse.success("Custom form preview loaded successfully", customFormService.previewCustomForm(formId, authentication))
        );
    }

    // Retrieve all active, public custom forms
    @GetMapping("/custom-forms/public-forms")
    public ResponseEntity<ApiResponse<Page<CustomFormSummaryResponse>>> getGlobalForms(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Public custom forms retrieved successfully",
                        customFormService.getGlobalForms(query, page, size)
                )
        );
    }

    // Retrieve all active, campus-only custom forms for user's university
    @GetMapping("/custom-forms/university-forms")
    public ResponseEntity<ApiResponse<Page<CustomFormSummaryResponse>>> getCampusForms(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Campus custom forms retrieved successfully",
                        customFormService.getCampusForms(query, page, size, authentication)
                )
        );
    }

    // Retrieve forms created by current host
    @GetMapping("/custom-forms/my-forms")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<Page<CustomFormSummaryResponse>>> getHostedForms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.success("Hosted custom forms retrieved successfully", customFormService.getHostedForms(page, size, authentication)));
    }

    // Submit answers to a custom form
    @PostMapping("/custom-forms/{formId}/submit")
    public ResponseEntity<ApiResponse<CustomFormSubmissionResponse>> submitCustomFormAnswers(
            @PathVariable Long formId,
            @RequestParam("answers") String answersJson,
            MultipartHttpServletRequest request,
            Authentication authentication
    ) {
        Map<String, MultipartFile> fileMap = request.getFileMap();
        CustomFormSubmissionResponse response = customFormService.submitFormAnswers(
                formId, answersJson, fileMap, authentication
        );
        return ResponseEntity.ok(ApiResponse.success("Responses submitted successfully", response));
    }

    // Retrieve custom form submissions made by current user
    @GetMapping("/custom-forms/my-submissions")
    public ResponseEntity<ApiResponse<Page<CustomFormSubmissionResponse>>> getMySubmissions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.success("My custom form submissions retrieved successfully", customFormService.getMySubmissions(page, size, authentication)));
    }


    // Retrieve list of custom responses for form creator
    @GetMapping("/custom-forms/{formId}/responses")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<Page<CustomFormSubmissionResponse>>> getCustomFormSubmissions(
            @PathVariable Long formId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "SUBMITTED_AT") FormSortBy sortBy,
            @RequestParam(defaultValue = "desc") SortDirection direction,
            Authentication authentication
    ) {

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Custom form submissions loaded successfully",
                        customFormService.getSubmissions(
                                formId,
                                page,
                                size,
                                query,
                                sortBy,
                                direction,
                                authentication
                        )
                )
        );
    }

    // Retrieve a particular submission of a custom form
    @GetMapping("/{formId}/responses/{submissionId}")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<CustomFormSubmissionResponse>> getCustomFormSubmissionById(
            @PathVariable Long formId,
            @PathVariable Long submissionId,
            Authentication authentication
    ) {
        CustomFormSubmissionResponse response =
                customFormService.getSubmissionById(formId, submissionId, authentication);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Custom form submission retrieved successfully",
                        response
                )
        );
    }



    // Stream CSV export of custom form responses
    @GetMapping("/custom-forms/{formId}/responses/export")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<byte[]> exportResponsesCsv(
            @PathVariable Long formId,
            Authentication authentication
    ) throws IOException {
        byte[] csvBytes = customFormService.exportCsv(formId, authentication);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"custom_form_responses_" + formId + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvBytes);
    }


}
