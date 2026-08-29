package org.anuj.EvenTAura.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.exception.AllExceptions.*;
import org.anuj.EvenTAura.mapper.CustomFormMapper;
import org.anuj.EvenTAura.model.*;
import org.anuj.EvenTAura.model.enums.*;
import org.anuj.EvenTAura.repository.*;
import org.anuj.EvenTAura.security.CustomUserDetails;
import org.apache.tomcat.util.http.fileupload.ByteArrayOutputStream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;

import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomFormServiceImpl implements CustomFormService {

    private final CustomFormRepository customFormRepository;
    private final CustomFormQuestionRepository questionRepository;
    private final CustomFormSubmissionRepository submissionRepository;
    private final CustomFormAnswerRepository answerRepository;
    private final UserRepository userRepository;
    private final UniversityRepository universityRepository;
    private final ObjectMapper objectMapper;
    private final CloudinaryService cloudinaryService;

    @Override
    @Transactional
    public CustomFormResponse createCustomForm(
            CreateCustomFormRequest request,
            Authentication authentication
    ) {

        User user = getAuthenticatedUser(authentication);

        CustomForm customForm = new CustomForm();

        customForm.setTitle(request.getTitle());
        customForm.setDescription(request.getDescription());
        customForm.setBannerUrl(request.getBannerUrl());

        customForm.setCreatedBy(user);
        customForm.setUniversity(user.getUniversity());

        customForm.setStatus(FormStatus.PENDING);

        customForm.setParticipationType(request.getParticipationType());

        customForm.setAcceptingResponses(request.isAcceptingResponses());

        customForm.setRegistrationStart(request.getRegistrationStart());
        customForm.setRegistrationDeadline(request.getRegistrationDeadline());

        customForm.setMaxSubmissions(request.getMaxSubmissions());
        customForm.setAllowMultipleSubmissions(
                request.isAllowMultipleSubmissions()
        );

        customForm.setPaymentRequired(request.isPaymentRequired());
        customForm.setRegistrationFee(request.getRegistrationFee());
        customForm.setPaymentQrUrl(request.getPaymentQrUrl());
        customForm.setPaymentInstructions(request.getPaymentInstructions());

        customForm.setCreatedAt(LocalDateTime.now());

        CustomForm savedForm = customFormRepository.save(customForm);

        List<CustomFormQuestion> questions = new ArrayList<>();

        for (CreateQuestionRequest dto : request.getQuestions()) {

            validateQuestion(dto);

            CustomFormQuestion question = new CustomFormQuestion();

            question.setCustomForm(savedForm);
            question.setQuestionType(dto.getQuestionType());

            question.setTitle(dto.getTitle());
            question.setDescription(dto.getDescription());
            question.setPlaceholder(dto.getPlaceholder());

            question.setRequired(dto.isRequired());

            question.setDisplayOrder(dto.getDisplayOrder());

            question.setMinLength(dto.getMinLength());
            question.setMaxLength(dto.getMaxLength());

            question.setMinValue(dto.getMinValue());
            question.setMaxValue(dto.getMaxValue());

            question.setRegexPattern(dto.getRegexPattern());

            List<CustomQuestionOption> options = new ArrayList<>();

            if (dto.getOptions() != null) {

                int order = 1;

                for (String optionText : dto.getOptions()) {

                    CustomQuestionOption option =
                            new CustomQuestionOption();

                    option.setQuestion(question);
                    option.setOptionText(optionText);
                    option.setDisplayOrder(order++);

                    options.add(option);
                }

            }

            question.setOptions(options);

            questions.add(question);

        }

        questionRepository.saveAll(questions);

        savedForm.setQuestions(questions);

        return CustomFormMapper.toResponse(savedForm);

    }

    @Override
    @Transactional
    public CustomFormResponse updateCustomForm(
            Long formId,
            UpdateCustomFormRequest request,
            Authentication authentication
    ) {

        User user = getAuthenticatedUser(authentication);

        CustomForm form = getForm(formId);

        validateOwner(form, user);

        form.setTitle(request.getTitle());
        form.setDescription(request.getDescription());
        form.setBannerUrl(request.getBannerUrl());

        form.setParticipationType(request.getParticipationType());

        form.setRegistrationStart(request.getRegistrationStart());
        form.setRegistrationDeadline(request.getRegistrationDeadline());

        form.setMaxSubmissions(request.getMaxSubmissions());
        form.setAllowMultipleSubmissions(request.isAllowMultipleSubmissions());
        form.setAcceptingResponses(request.isAcceptingResponses());

        form.setPaymentRequired(request.isPaymentRequired());
        form.setRegistrationFee(request.getRegistrationFee());
        form.setPaymentQrUrl(request.getPaymentQrUrl());
        form.setPaymentInstructions(request.getPaymentInstructions());

        /*
         * Existing Questions
         */
        Map<Long, CustomFormQuestion> existingQuestions =
                form.getQuestions()
                        .stream()
                        .collect(Collectors.toMap(
                                CustomFormQuestion::getId,
                                Function.identity()
                        ));

        List<CustomFormQuestion> updatedQuestions = new ArrayList<>();

        for (UpdateQuestionRequest dto : request.getQuestions()) {

            validateQuestion(dto);

            CustomFormQuestion question;

            /*
             * Existing Question
             */
            if (dto.getId() != null) {

                question = existingQuestions.remove(dto.getId());

                if (question == null) {
                    throw new ResourceNotFoundException(
                            "Question not found : " + dto.getId()
                    );
                }

            }

            /*
             * New Question
             */
            else {

                question = new CustomFormQuestion();
                question.setCustomForm(form);

            }

            question.setTitle(dto.getTitle());
            question.setDescription(dto.getDescription());
            question.setPlaceholder(dto.getPlaceholder());

            question.setQuestionType(dto.getQuestionType());

            question.setRequired(dto.isRequired());

            question.setDisplayOrder(dto.getDisplayOrder());

            question.setMinLength(dto.getMinLength());
            question.setMaxLength(dto.getMaxLength());

            question.setMinValue(dto.getMinValue());
            question.setMaxValue(dto.getMaxValue());

            question.setRegexPattern(dto.getRegexPattern());

            /*
             * Replace Options
             */
            question.getOptions().clear();

            if (dto.getOptions() != null) {

                int order = 1;

                for (String optionText : dto.getOptions()) {

                    CustomQuestionOption option =
                            new CustomQuestionOption();

                    option.setQuestion(question);
                    option.setOptionText(optionText);
                    option.setDisplayOrder(order++);

                    question.getOptions().add(option);

                }

            }

            updatedQuestions.add(question);

        }

        /*
         * Remove Deleted Questions
         */
        form.getQuestions().clear();
        form.getQuestions().addAll(updatedQuestions);

        CustomForm saved =
                customFormRepository.save(form);

        return CustomFormMapper.toResponse(saved);

    }

    @Override
    @Transactional(readOnly = true)
    public CustomFormResponse getCustomForm(Long formId) {
        CustomForm customForm = getForm(formId);
        return CustomFormMapper.toResponse(customForm);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomFormResponse previewCustomForm(
            Long formId,
            Authentication authentication
    ) {

        User user = getAuthenticatedUser(authentication);
        CustomForm form = getForm(formId);
        validateOwner(form, user);
        return CustomFormMapper.toResponse(form);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomFormSummaryResponse> getHostedForms(
            int page,
            int size,
            Authentication authentication
    ) {

        User user = getAuthenticatedUser(authentication);

        Pageable pageable = PageRequest.of(page, size);

        Page<CustomForm> responses = customFormRepository.findByCreatedBy(user, pageable);

        return responses.map(CustomFormMapper::toSummaryResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomFormSummaryResponse> getGlobalForms(
            String query,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page,size);

        Page<CustomForm> response;

        if(query!=null && !query.isBlank()){
            response = customFormRepository.search(query, FormStatus.APPROVED, ParticipationType.PUBLIC, pageable);
        } else {
            response = customFormRepository.findByStatusAndParticipationType(
                    FormStatus.APPROVED,
                    ParticipationType.PUBLIC,
                    pageable
            );
        }
        return response.map(
                CustomFormMapper::toSummaryResponse
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomFormSummaryResponse> getCampusForms(
            String query,
            int page,
            int size,
            Authentication authentication
    ) {
        User user = getAuthenticatedUser(authentication);
        University university = user.getUniversity();
        Pageable pageable = PageRequest.of(page, size);
        Page<CustomForm> responses;
        if (university == null) {
            return Page.empty(pageable);
        }
        if (query != null && !query.isBlank()) {

            responses = customFormRepository.searchByUniversityAndStatus(
                    university,
                    FormStatus.APPROVED,
                    query,
                    pageable
            );

        } else {

            responses = customFormRepository.findByUniversityAndStatus(
                    university,
                    FormStatus.APPROVED,
                    pageable
            );

        }
        return responses.map(
                CustomFormMapper::toSummaryResponse
        );
    }

    @Override
    @Transactional
    public CustomFormSubmissionResponse submitFormAnswers(
            Long formId,
            String answersJson,
            Map<String, MultipartFile> uploadedFiles,
            Authentication authentication
    ) {

        User user = getAuthenticatedUser(authentication);

        CustomForm form = getForm(formId);

        // University restriction
        if (form.getParticipationType() == ParticipationType.UNIVERSITY_ONLY) {
            University userUniversity = user.getUniversity();
            if (userUniversity == null ||
                    !form.getUniversity().getUniversityId().equals(userUniversity.getUniversityId())) {
                throw new UnauthorizedException("This form belongs to another university.");
            }
        }
        // Form validations
        if (form.getStatus() != FormStatus.APPROVED) {
            throw new BadRequestException("This form is not available.");
        }

        validateSubmissionAllowed(form);

        validateSubmissionLimit(form);

        validateMultipleSubmission(form, user);



        // Parse answers JSON
        SubmitCustomFormRequest request = parseAnswers(answersJson);

        Map<Long, CustomFormQuestion> questionMap = questionMap(form);

        CustomFormSubmission submission = new CustomFormSubmission();

        submission.setCustomForm(form);
        submission.setSubmittedBy(user);
        submission.setSubmissionCode(generateSubmissionCode());
        submission.setSubmittedAt(LocalDateTime.now());

        submission = submissionRepository.save(submission);

        List<CustomFormAnswer> answers = new ArrayList<>();

        for (AnswerRequest dto : request.getAnswers()) {

            CustomFormQuestion question =
                    questionMap.get(dto.getQuestionId());

            if (question == null) {
                throw new BadRequestException(
                        "Invalid question id : " + dto.getQuestionId()
                );
            }

            CustomFormAnswer answer = new CustomFormAnswer();

            answer.setSubmission(submission);
            answer.setQuestion(question);

            /*
             * FILE_UPLOAD
             */
            if (question.getQuestionType() == QuestionType.FILE_UPLOAD) {

                MultipartFile file =
                        uploadedFiles.get(
                                dto.getQuestionId().toString()
                        );

                validateUploadedFile(question, file);

                answer.setFileUrl(uploadAnswerFile(file));

            }

            /*
             * Normal Questions
             */
            else {

                if (question.isRequired() &&
                        (dto.getAnswerValue() == null ||
                                dto.getAnswerValue().isBlank())) {

                    throw new BadRequestException(
                            question.getTitle() + " is required."
                    );
                }
                validateAnswer(question, dto);
                answer.setAnswerValue(dto.getAnswerValue());

            }

            answers.add(answer);

        }

        answerRepository.saveAll(answers);

        submission.setAnswers(answers);

        return CustomFormMapper.toSubmissionResponse(submission);

    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomFormSubmissionResponse> getSubmissions(
            Long formId,
            int page,
            int size,
            String query,
            FormSortBy sortBy,
            SortDirection direction,
            Authentication authentication
    ) {

        User user = getAuthenticatedUser(authentication);

        CustomForm form = getForm(formId);

        validateOwner(form, user);

        String field = resolveSortField(sortBy);

        Sort sort = direction == SortDirection.ASC
                ? Sort.by(field).ascending()
                : Sort.by(field).descending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CustomFormSubmission> submissions;

        /*
         * Search
         */
        if (query != null && !query.isBlank()) {
            submissions =
                    submissionRepository.search(form,query,pageable);
        } else {
            submissions =
                    submissionRepository.findByCustomForm(form,pageable);
        }

        return submissions.map(
                CustomFormMapper::toSubmissionResponse
        );

    }

    @Override
    @Transactional(readOnly = true)
    public CustomFormSubmissionResponse getSubmissionById(
            Long formId,
            Long submissionId,
            Authentication authentication
    ) {

        User user = getAuthenticatedUser(authentication);

        CustomForm form = getForm(formId);

        validateOwner(form, user);

        CustomFormSubmission submission =
                getSubmission(submissionId);

        validateSubmissionBelongsToForm(
                submission,
                form
        );
        return CustomFormMapper.toSubmissionResponse(
                submission
        );

    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomFormSubmissionResponse> getMySubmissions(
            int page,
            int size,
            Authentication authentication
    ) {

        User user = getAuthenticatedUser(authentication);
        Pageable pageable = PageRequest.of(page, size);
        Page<CustomFormSubmission> submissions = submissionRepository.findBySubmittedBy(user, pageable);

        return submissions.map(
                CustomFormMapper::toSubmissionResponse
        );
    }


    @Override
    @Transactional(readOnly = true)
    public byte[] exportCsv(
            Long formId,
            Authentication authentication
    ) throws IOException {

        User user = getAuthenticatedUser(authentication);

        CustomForm form = getForm(formId);

        validateOwner(form, user);

        List<CustomFormSubmission> submissions =
                submissionRepository.findByCustomForm(form);

        ByteArrayOutputStream outputStream =
                new ByteArrayOutputStream();

        CSVPrinter csvPrinter = new CSVPrinter(
                new PrintWriter(outputStream),
                CSVFormat.DEFAULT.builder().get()
        );

        /*
         * Header
         */
        List<String> headers = new ArrayList<>();

        headers.add("Submission Code");
        headers.add("Submitted By");
        headers.add("Email");
        headers.add("Submitted At");

        form.getQuestions()
                .stream()
                .sorted(Comparator.comparing(
                        CustomFormQuestion::getDisplayOrder
                ))
                .forEach(question ->
                        headers.add(question.getTitle())
                );

        csvPrinter.printRecord(headers);

        /*
         * Rows
         */
        for (CustomFormSubmission submission : submissions) {

            List<String> row = new ArrayList<>();

            row.add(submission.getSubmissionCode());

            row.add(submission.getSubmittedBy().getName());

            row.add(submission.getSubmittedBy().getPrimaryEmail());

            row.add(submission.getSubmittedAt().toString());

            Map<Long, CustomFormAnswer> answerMap =
                    submission.getAnswers()
                            .stream()
                            .collect(Collectors.toMap(
                                    answer -> answer.getQuestion().getId(),
                                    Function.identity()
                            ));

            for (CustomFormQuestion question :
                    form.getQuestions()
                            .stream()
                            .sorted(Comparator.comparing(
                                    CustomFormQuestion::getDisplayOrder
                            ))
                            .toList()) {

                CustomFormAnswer answer =
                        answerMap.get(question.getId());

                if (answer == null) {

                    row.add("");

                } else if (question.getQuestionType()
                        == QuestionType.FILE_UPLOAD) {

                    row.add(answer.getFileUrl());

                } else {

                    row.add(answer.getAnswerValue());

                }

            }

            csvPrinter.printRecord(row);

        }

        csvPrinter.flush();

        return outputStream.toByteArray();

    }


    @Override
    @Transactional
    public void deleteCustomForm(Long formId, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        CustomForm customForm = getForm(formId);
        validateOwner(customForm, user);
        customFormRepository.delete(customForm);
    }

    @Override
    @Transactional
    public void cancelCustomForm(Long formId, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        CustomForm form = getForm(formId);
        validateOwner(form, user);
        if(form.getStatus() == FormStatus.REJECTED){
            throw new BadRequestException("Rejected forms can't be cancelled");
        }
        if (form.getStatus() == FormStatus.CANCELLED) {
            throw new BadRequestException("Form is already cancelled.");
        }
        form.setStatus(FormStatus.CANCELLED);
        form.setAcceptingResponses(false);
    }

    @Override
    @Transactional
    public void restoreCustomForm(Long formId, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        CustomForm form = getForm(formId);
        validateOwner(form, user);
        if(form.getStatus() == FormStatus.REJECTED){
            throw new BadRequestException("Rejected forms can't be restore");
        }
        if (form.getStatus() != FormStatus.CANCELLED) {
            throw new BadRequestException(
                    "Only cancelled forms can be restored."
            );
        }
        boolean canAccept =
                form.getRegistrationDeadline() == null
                        || LocalDateTime.now().isBefore(form.getRegistrationDeadline());

        form.setAcceptingResponses(canAccept);
        form.setStatus(FormStatus.APPROVED);
    }

    @Override
    @Transactional
    public void updateAcceptingResponses(Long formId, boolean acceptingResponses, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        CustomForm form = getForm(formId);
        validateOwner(form, user);
        form.setAcceptingResponses(acceptingResponses);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomFormSummaryResponse> getFormsByStatus(
            FormStatus status,
            String query,
            int page,
            int size,
            FormSortBy sortBy,
            SortDirection direction,
            Authentication authentication
    ) {

        User user = getAuthenticatedUser(authentication);

        if (user.getSystemRole() != SystemRole.HOD) {
            throw new UnauthorizedException(
                    "Only HOD can access this resource."
            );
        }
        String field = resolveSortField(sortBy);

        Sort sort = direction == SortDirection.ASC
                ? Sort.by(field).ascending()
                : Sort.by(field).descending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CustomForm> forms;

        java.util.List<FormStatus> statusList = status == FormStatus.APPROVED
                ? java.util.List.of(FormStatus.APPROVED, FormStatus.CANCELLED)
                : java.util.List.of(status);

        if (query != null && !query.isBlank()) {
            if (statusList.size() > 1) {
                forms = customFormRepository.searchByUniversityAndStatusIn(
                        user.getUniversity(),
                        statusList,
                        query,
                        pageable
                );
            } else {
                forms = customFormRepository.searchByUniversityAndStatus(
                        user.getUniversity(),
                        status,
                        query,
                        pageable
                );
            }
        } else {
            if (statusList.size() > 1) {
                forms = customFormRepository.findByUniversityAndStatusIn(
                        user.getUniversity(),
                        statusList,
                        pageable
                );
            } else {
                forms = customFormRepository.findByUniversityAndStatus(
                        user.getUniversity(),
                        status,
                        pageable
                );
            }
        }

        return forms.map(CustomFormMapper::toSummaryResponse);

    }
    @Override
    @Transactional
    public void approveForm(Long formId, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        CustomForm form = getForm(formId);
        validateOwner(form, user);
        if(form.getStatus()==FormStatus.APPROVED){
            throw new BadRequestException("Form already approved");
        }
        form.setStatus(FormStatus.APPROVED);
    }

    @Override
    @Transactional
    public void rejectForm(Long formId, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        CustomForm form = getForm(formId);
        validateOwner(form, user);
        if(form.getStatus()==FormStatus.REJECTED){
            throw new BadRequestException("Form already rejected");
        }
        form.setStatus(FormStatus.REJECTED);
    }

    private User getAuthenticatedUser(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    private CustomForm getForm(Long formId) {
        return customFormRepository.findById(formId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Custom Form not found"));
    }

    private CustomFormSubmission getSubmission(Long submissionId) {
        return submissionRepository.findById(submissionId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Submission not found"));
    }

    private void validateOwner(CustomForm form, User user) {

        boolean isOwner = form.getCreatedBy()
                .getUserId()
                .equals(user.getUserId());

        boolean isUniversityHod =
                user.getSystemRole() == SystemRole.HOD
                        && form.getUniversity()
                        .getUniversityId()
                        .equals(user.getUniversity().getUniversityId());

        if (!isOwner && !isUniversityHod) {
            throw new UnauthorizedException(
                    "You are not authorized to perform this operation."
            );
        }
    }

    private void validateSubmissionAllowed(CustomForm form) {

        if (!form.isAcceptingResponses()) {
            throw new IllegalOperationException(
                    "This form is no longer accepting responses."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        if (form.getRegistrationStart() != null &&
                now.isBefore(form.getRegistrationStart())) {

            throw new IllegalOperationException(
                    "Registration has not started yet."
            );
        }

        if (form.getRegistrationDeadline() != null &&
                now.isAfter(form.getRegistrationDeadline())) {

            throw new IllegalOperationException(
                    "Registration has ended."
            );
        }

    }

    private void validateMultipleSubmission(
            CustomForm form,
            User user
    ) {

        if (!form.isAllowMultipleSubmissions()) {

            boolean exists =
                    submissionRepository.existsByCustomFormAndSubmittedBy(
                            form,
                            user
                    );

            if (exists) {
                throw new IllegalOperationException(
                        "You have already submitted this form."
                );
            }

        }
    }

    private void validateSubmissionLimit(CustomForm form) {

        if (form.getMaxSubmissions() == null)
            return;

        long count =
                submissionRepository.countByCustomForm(form);

        if (count >= form.getMaxSubmissions()) {
            throw new IllegalOperationException(
                    "Maximum submissions reached."
            );
        }

    }

    private Map<Long, CustomFormQuestion> questionMap(CustomForm form) {

        return form.getQuestions()
                .stream()
                .collect(Collectors.toMap(
                        CustomFormQuestion::getId,
                        Function.identity()
                ));

    }

    private SubmitCustomFormRequest parseAnswers(
            String answersJson
    ) {

        try {

            return objectMapper.readValue(
                    answersJson,
                    SubmitCustomFormRequest.class
            );

        } catch (Exception e) {

            throw new BadRequestException(
                    "Invalid answers JSON."
            );

        }

    }

    private String generateSubmissionCode() {

        return UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 10)
                .toUpperCase();

    }

    private String uploadAnswerFile(
            MultipartFile file
    ) {

        if (file == null || file.isEmpty()) {
            return null;
        }

        return cloudinaryService.uploadImage(
                file,
                "customFormAnswers"
        );

    }

    private void validateSubmissionBelongsToForm(
            CustomFormSubmission submission,
            CustomForm form
    ) {

        if (!submission.getCustomForm()
                .getId()
                .equals(form.getId())) {

            throw new BadRequestException(
                    "Submission does not belong to this form."
            );

        }

    }

    private void validateQuestion(QuestionRequest question) {

        switch (question.getQuestionType()) {

            case MULTIPLE_CHOICE:
            case CHECKBOXES:
            case DROPDOWN:

                if (question.getOptions() == null || question.getOptions().size() < 2) {
                    throw new BadRequestException(
                            "Choice questions must contain at least two options."
                    );
                }

                break;

            case SHORT_ANSWER:
            case PARAGRAPH:

                if (question.getMinLength() != null &&
                        question.getMaxLength() != null &&
                        question.getMinLength() > question.getMaxLength()) {

                    throw new BadRequestException(
                            "Minimum length cannot be greater than maximum length."
                    );
                }

                break;

            case NUMBER:

                if (question.getMinValue() != null &&
                        question.getMaxValue() != null &&
                        question.getMinValue() > question.getMaxValue()) {

                    throw new BadRequestException(
                            "Minimum value cannot be greater than maximum value."
                    );
                }

                break;

            case EMAIL:
            case PHONE:
            case DATE:
            case FILE_UPLOAD:

                // No additional validation currently.

                break;

            default:
                throw new BadRequestException("Unsupported question type.");

        }

    }

    private University getUniversity(Long universityId) {

        return universityRepository.findById(universityId)
                .orElseThrow(() ->
                        new UniversityNotFoundException(
                                "University not found"
                        ));

    }

    private Map<Long, AnswerRequest> answerMap(
            SubmitCustomFormRequest request
    ) {

        return request.getAnswers()
                .stream()
                .collect(Collectors.toMap(
                        AnswerRequest::getQuestionId,
                        Function.identity()
                ));

    }

    private void validateAnswer(
            CustomFormQuestion question,
            AnswerRequest answer
    ) {

        String value = answer.getAnswerValue();

        /*
         * Required Validation
         */
        if (question.isRequired()) {

            if (value == null || value.isBlank()) {
                throw new BadRequestException(
                        question.getTitle() + " is required."
                );
            }

        }

        if (value == null || value.isBlank()) {
            return;
        }

        switch (question.getQuestionType()) {

            case SHORT_ANSWER:
            case PARAGRAPH:

                if (question.getMinLength() != null &&
                        value.length() < question.getMinLength()) {

                    throw new BadRequestException(
                            question.getTitle() + " is too short."
                    );

                }

                if (question.getMaxLength() != null &&
                        value.length() > question.getMaxLength()) {

                    throw new BadRequestException(
                            question.getTitle() + " exceeds maximum length."
                    );

                }

                break;

            case NUMBER:

                try {

                    int number = Integer.parseInt(value);

                    if (question.getMinValue() != null &&
                            number < question.getMinValue()) {

                        throw new BadRequestException(
                                question.getTitle() + " is below minimum value."
                        );

                    }

                    if (question.getMaxValue() != null &&
                            number > question.getMaxValue()) {

                        throw new BadRequestException(
                                question.getTitle() + " exceeds maximum value."
                        );

                    }

                } catch (NumberFormatException e) {

                    throw new BadRequestException(
                            question.getTitle() + " must be a valid number."
                    );

                }

                break;

            case EMAIL:

                if (!value.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {

                    throw new BadRequestException(
                            "Invalid email address."
                    );

                }

                break;

            case PHONE:

                if (!value.matches("^[0-9]{10}$")) {

                    throw new BadRequestException(
                            "Invalid phone number."
                    );

                }

                break;

            case MULTIPLE_CHOICE:
            case DROPDOWN:

                boolean found = question.getOptions()
                        .stream()
                        .anyMatch(option ->
                                option.getOptionText().equals(value));

                if (!found) {

                    throw new BadRequestException(
                            "Invalid option selected."
                    );

                }

                break;

            case CHECKBOXES:

                List<String> selected =
                        Arrays.stream(value.split(","))
                                .map(String::trim)
                                .toList();

                for (String option : selected) {

                    boolean exists = question.getOptions()
                            .stream()
                            .anyMatch(o ->
                                    o.getOptionText().equals(option));

                    if (!exists) {

                        throw new BadRequestException(
                                "Invalid checkbox option : " + option
                        );

                    }

                }

                break;

            case DATE:

                try {

                    LocalDate.parse(value);

                } catch (Exception e) {

                    throw new BadRequestException(
                            "Invalid date."
                    );

                }

                break;

            case FILE_UPLOAD:

                /*
                 * Already validated separately.
                 */

                break;

        }

    }

    private void validateUploadedFile(
            CustomFormQuestion question,
            MultipartFile file
    ) {

        if (question.getQuestionType() != QuestionType.FILE_UPLOAD) {
            return;
        }

        if (question.isRequired() && (file == null || file.isEmpty())) {
            throw new BadRequestException(
                    question.getTitle() + " is required."
            );
        }

        if (file == null || file.isEmpty()) {
            return;
        }

        // Maximum file size (10 MB)
        long maxSize = 10 * 1024 * 1024;

        if (file.getSize() > maxSize) {
            throw new BadRequestException(
                    "Maximum allowed file size is 10 MB."
            );
        }

        // Allowed content types
        List<String> allowedTypes = List.of(
                "application/pdf",
                "image/jpeg",
                "image/png",
                "image/jpg",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );

        if (!allowedTypes.contains(file.getContentType())) {
            throw new BadRequestException(
                    "Unsupported file type."
            );
        }

    }

    private String resolveSortField(FormSortBy sortBy) {
        return switch (sortBy) {
            case CREATED_AT -> "createdAt";
            case TITLE -> "title";
            case SUBMITTED_AT -> "submittedAt";
        };
    }

}
