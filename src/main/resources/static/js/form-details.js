// form-details.js — Premium dynamic questionnaire viewer, previewer, and submission processor
const API_CUSTOM_FORM_BASE = "/api/v1/custom-forms";

// State management
let formId = null;
let customFormStructure = null;
let isPreviewMode = false;
let alreadySubmitted = false;

// Element selections
const formLoading = document.getElementById("form-loading");
const formError = document.getElementById("form-error");
const errorMessage = document.getElementById("error-message");
const formContentSection = document.getElementById("form-content-section");
const formBanner = document.getElementById("form-banner");
const scopeBadge = document.getElementById("scope-badge");
const formTitle = document.getElementById("form-title");
const formDescription = document.getElementById("form-description");
const formCreator = document.getElementById("form-creator");
const formUniversity = document.getElementById("form-university");
const formFee = document.getElementById("form-fee");
const formStart = document.getElementById("form-start");
const formDeadline = document.getElementById("form-deadline");
const formEstTime = document.getElementById("form-est-time");

const customAnswersForm = document.getElementById("custom-answers-form");
const formFieldsContainer = document.getElementById("form-fields-container");
const formSubmitBtn = document.getElementById("form-submit-btn");
const formSubmitText = document.getElementById("form-submit-text");

// Progress indicators
const stickyProgress = document.getElementById("sticky-progress-container");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");

// Initialize page
async function initPage() {
    const user = await getCurrentUser();
    if (user && typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(user);
    }

    // Determine form ID and mode
    const pathParts = window.location.pathname.split("/");
    // Preview routes: /form-details/{formId}/preview
    // Regular routes: /form-details/{formId}
    isPreviewMode = window.location.pathname.includes("/preview");

    let idParam = null;
    if (isPreviewMode) {
        // ID is second to last segment
        idParam = pathParts[pathParts.length - 2];
    } else {
        // ID is last segment
        idParam = pathParts[pathParts.length - 1];
    }

    // Fallback to query param
    if (!idParam || isNaN(parseInt(idParam))) {
        const urlParams = new URLSearchParams(window.location.search);
        idParam = urlParams.get("formId");
    }

    if (!idParam || isNaN(parseInt(idParam))) {
        showLoading(false);
        formContentSection.classList.add("hidden");
        formError.classList.remove("hidden");
        errorMessage.textContent = "Invalid custom form ID. Please verify the URL.";
        return;
    }

    formId = parseInt(idParam);
    await loadFormSpecifications();
}

// Show/Hide spinner
function showLoading(show) {
    if (show) {
        formLoading.classList.remove("hidden");
        formContentSection.classList.add("hidden");
        formError.classList.add("hidden");
    } else {
        formLoading.classList.add("hidden");
    }
}

// Fetch form details
async function loadFormSpecifications() {
    showLoading(true);
    const token = localStorage.getItem("accessToken");
    const endpoint = isPreviewMode 
        ? `${API_CUSTOM_FORM_BASE}/${formId}/preview`
        : `${API_CUSTOM_FORM_BASE}/${formId}`;

    try {
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(endpoint, { headers });
        const body = await res.json();

        if (res.ok && body.success && body.data) {
            customFormStructure = body.data;
            populateFormHeader(customFormStructure);
            renderFormFields(customFormStructure.questions || []);
            
            // Set footer metrics
            const fields = customFormStructure.questions || [];
            document.getElementById("footer-total-q").textContent = fields.length;
            document.getElementById("footer-req-q").textContent = fields.filter(f => f.required).length;

            formContentSection.classList.remove("hidden");
            showLoading(false);
            
            if (isPreviewMode) {
                enablePreviewLock();
            } else {
                setupProgressTracking();
            }
        } else {
            throw new Error(body.message || "Failed to load custom form template.");
        }
    } catch (err) {
        console.error("loadFormSpecifications error:", err);
        showLoading(false);
        formContentSection.classList.add("hidden");
        formError.classList.remove("hidden");
        errorMessage.textContent = err.message || "The form you are requesting could not be loaded.";
    }
}

// Populates form header card
function populateFormHeader(form) {
    document.getElementById("header-form-title").textContent = form.title;
    formTitle.textContent = form.title;
    formDescription.textContent = form.description || "Please fill in the questions below.";
    formCreator.textContent = form.createdBy || "University Admin";
    formUniversity.textContent = form.university || "Public Campus";
    formBanner.src = form.bannerUrl || "/images/banner-placeholder.png";

    formFee.textContent = form.registrationFee > 0 ? `$${form.registrationFee.toFixed(2)}` : "Free";
    formStart.textContent = formatDate(form.registrationStart);
    formDeadline.textContent = formatDate(form.registrationDeadline);
    
    // Estimate 1 min per 4 questions if estTime not available
    const qCount = (form.questions && form.questions.length) || 0;
    const estMinutes = Math.max(1, Math.ceil(qCount * 0.4));
    formEstTime.textContent = `${estMinutes} ${estMinutes === 1 ? 'min' : 'mins'}`;

    if (isPreviewMode) {
        scopeBadge.textContent = "Preview Mode";
        scopeBadge.className = "absolute top-4 left-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded shadow-sm border border-amber-600";
    } else {
        if (form.participationType === "PUBLIC") {
            scopeBadge.textContent = "Public Access";
            scopeBadge.className = "absolute top-4 left-4 bg-emerald-50 text-signal border border-green-200 text-xs font-semibold px-3 py-1 rounded shadow-sm";
        } else {
            scopeBadge.textContent = "University Only";
            scopeBadge.className = "absolute top-4 left-4 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold px-3 py-1 rounded shadow-sm";
        }
    }
}

// Render dynamic inputs based on question types
function renderFormFields(fields) {
    formFieldsContainer.innerHTML = "";
    if (fields.length === 0) {
        formFieldsContainer.innerHTML = `
            <div class="text-center py-12 bg-canvas border border-line border-dashed rounded-xl space-y-2 p-6">
                <span class="material-symbols-outlined text-[36px] text-muted-dim">quiz</span>
                <p class="text-sm text-muted font-medium">This form does not contain any questions.</p>
            </div>
        `;
        return;
    }

    fields.forEach((field, idx) => {
        const card = document.createElement("div");
        card.className = "border border-line bg-canvas rounded-xl p-5 md:p-6 space-y-3 shadow-sm transition-all hover:border-line-strong hover:shadow-md question-card";
        card.setAttribute("data-q-index", idx);

        const requiredIndicator = field.required ? `<span class="text-danger font-bold ml-1" title="Required">*</span>` : "";
        const requiredBadge = field.required ? `<span class="bg-red-50 text-danger border border-red-100 text-[10px] px-2 py-0.5 rounded font-semibold uppercase">Required</span>` : "";

        let inputHtml = "";
        const nameAttr = `q_${field.id}`;

        if (field.questionType === "SHORT_ANSWER") {
            inputHtml = `<input type="text" data-field-id="${field.id}" data-type="SHORT_ANSWER" ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder || 'Your answer')}" class="w-full rounded-lg border-line bg-canvas py-2.5 px-4 text-sm text-ink placeholder:text-muted focus:border-action focus:ring-action transition-all" />`;
        } else if (field.questionType === "PARAGRAPH") {
            inputHtml = `<textarea rows="4" data-field-id="${field.id}" data-type="PARAGRAPH" ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder || 'Your long text response')}" class="w-full rounded-lg border-line bg-canvas py-2.5 px-4 text-sm text-ink placeholder:text-muted focus:border-action focus:ring-action transition-all"></textarea>`;
        } else if (field.questionType === "NUMBER") {
            const minStr = field.minValue !== null ? `min="${field.minValue}"` : "";
            const maxStr = field.maxValue !== null ? `max="${field.maxValue}"` : "";
            inputHtml = `<input type="number" data-field-id="${field.id}" data-type="NUMBER" ${minStr} ${maxStr} ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder || 'Your numeric answer')}" class="w-full rounded-lg border-line bg-canvas py-2.5 px-4 text-sm text-ink placeholder:text-muted focus:border-action focus:ring-action transition-all" />`;
        } else if (field.questionType === "EMAIL") {
            inputHtml = `<input type="email" data-field-id="${field.id}" data-type="EMAIL" ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder || 'yourname@example.com')}" class="w-full rounded-lg border-line bg-canvas py-2.5 px-4 text-sm text-ink placeholder:text-muted focus:border-action focus:ring-action transition-all" />`;
        } else if (field.questionType === "PHONE") {
            inputHtml = `<input type="tel" data-field-id="${field.id}" data-type="PHONE" ${field.required ? 'required' : ''} placeholder="${escapeHtml(field.placeholder || '+1234567890')}" class="w-full rounded-lg border-line bg-canvas py-2.5 px-4 text-sm text-ink placeholder:text-muted focus:border-action focus:ring-action transition-all" />`;
        } else if (field.questionType === "DATE") {
            inputHtml = `<input type="date" data-field-id="${field.id}" data-type="DATE" ${field.required ? 'required' : ''} class="w-full rounded-lg border-line bg-canvas py-2.5 px-4 text-sm text-ink focus:border-action focus:ring-action transition-all" />`;
        } else if (field.questionType === "DROPDOWN") {
            inputHtml = `
                <select data-field-id="${field.id}" data-type="DROPDOWN" ${field.required ? 'required' : ''} class="w-full rounded-lg border-line bg-canvas py-2.5 px-4 text-sm text-ink focus:border-action focus:ring-action transition-all">
                    <option value="">Select Option</option>
                    ${field.options.map(opt => `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`).join("")}
                </select>
            `;
        } else if (field.questionType === "MULTIPLE_CHOICE") {
            inputHtml = `
                <div class="space-y-2 pt-1" data-field-id="${field.id}" data-type="MULTIPLE_CHOICE">
                    ${field.options.map((opt, oIdx) => `
                        <label class="flex items-center gap-3 text-sm text-muted hover:text-ink cursor-pointer">
                            <input type="radio" name="${nameAttr}" value="${escapeHtml(opt)}" class="border-line text-action focus:ring-action focus:ring-offset-canvas bg-canvas transition-all" />
                            <span>${escapeHtml(opt)}</span>
                        </label>
                    `).join("")}
                </div>
            `;
        } else if (field.questionType === "CHECKBOXES") {
            inputHtml = `
                <div class="space-y-2 pt-1" data-field-id="${field.id}" data-type="CHECKBOXES">
                    ${field.options.map((opt, oIdx) => `
                        <label class="flex items-center gap-3 text-sm text-muted hover:text-ink cursor-pointer">
                            <input type="checkbox" name="${nameAttr}" value="${escapeHtml(opt)}" class="rounded border-line text-action focus:ring-action focus:ring-offset-canvas bg-canvas transition-all" />
                            <span>${escapeHtml(opt)}</span>
                        </label>
                    `).join("")}
                </div>
            `;
        } else if (field.questionType === "FILE_UPLOAD") {
            inputHtml = `
                <div class="flex flex-col gap-2 pt-1">
                    <div class="flex items-center gap-3">
                        <input type="file" data-field-id="${field.id}" data-type="FILE_UPLOAD" accept=".pdf,image/*" ${field.required ? 'required' : ''} class="hidden file-upload-input" id="file_input_${field.id}" />
                        <label for="file_input_${field.id}" class="cursor-pointer border border-line bg-canvas-sunk hover:bg-canvas-mid text-ink font-semibold py-2 px-4 rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-sm">
                            <span class="material-symbols-outlined text-[16px]">upload</span>
                            <span class="file-btn-text">Choose File</span>
                        </label>
                        <span class="text-xs text-muted file-name-text">No file selected</span>
                    </div>
                    <p class="text-[10px] text-muted-dim">Allowed formats: PNG, JPG, JPEG, PDF. Max size: 5MB.</p>
                </div>
            `;
        }

        const descHtml = field.description ? `<p class="text-xs text-muted-dim">${escapeHtml(field.description)}</p>` : "";

        card.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-[10px] eyebrow text-muted-dim font-semibold font-mono">Question ${idx + 1}</span>
                ${requiredBadge}
            </div>
            <div class="space-y-1">
                <h3 class="text-sm font-bold text-ink flex items-center">${escapeHtml(field.title)}${requiredIndicator}</h3>
                ${descHtml}
            </div>
            <div class="mt-1">
                ${inputHtml}
            </div>
            <p class="error-msg-box text-xs font-semibold text-danger hidden mt-1.5 flex items-center gap-1">
                <span class="material-symbols-outlined text-[14px]">error</span>
                <span class="error-text-container"></span>
            </p>
        `;

        formFieldsContainer.appendChild(card);
    });

    // Bind file labels display refresh
    document.querySelectorAll(".file-upload-input").forEach(inp => {
        inp.addEventListener("change", (e) => {
            const fileNameText = e.target.parentElement.querySelector(".file-name-text");
            const btnText = e.target.parentElement.querySelector(".file-btn-text");
            if (e.target.files && e.target.files.length > 0) {
                fileNameText.textContent = e.target.files[0].name;
                btnText.textContent = "Change File";
            } else {
                fileNameText.textContent = "No file selected";
                btnText.textContent = "Choose File";
            }
        });
    });
}

// Lock all form controls in Preview Mode
function enablePreviewLock() {
    document.getElementById("preview-mode-banner").classList.remove("hidden");
    
    // Hide footer submit section
    const submitFooter = document.getElementById("form-footer-bar");
    if (submitFooter) {
        submitFooter.innerHTML = `
            <div class="text-xs text-muted py-2">
                Preview Mode is active. Form submissions are disabled.
            </div>
        `;
    }

    // Disable all inputs
    const inputs = formFieldsContainer.querySelectorAll("input, select, textarea, button");
    inputs.forEach(inp => {
        inp.disabled = true;
        inp.classList.add("opacity-60", "cursor-not-allowed");
    });

    // Disable upload labels clicking
    const fileLabels = formFieldsContainer.querySelectorAll("label[for^='file_input_']");
    fileLabels.forEach(lbl => {
        lbl.classList.add("opacity-50", "cursor-not-allowed");
        lbl.removeAttribute("for");
    });
}

// Set up dynamic progress tracking widget
function setupProgressTracking() {
    stickyProgress.classList.remove("hidden");
    updateProgressBar();

    // Bind change/input events to all form elements
    formFieldsContainer.addEventListener("input", updateProgressBar);
    formFieldsContainer.addEventListener("change", updateProgressBar);
}

// Recalculate answered fields
function updateProgressBar() {
    if (!customFormStructure || !customFormStructure.questions) return;
    const questions = customFormStructure.questions;
    let answered = 0;

    questions.forEach(q => {
        if (q.questionType === "SHORT_ANSWER" || q.questionType === "PARAGRAPH" || q.questionType === "NUMBER" || q.questionType === "EMAIL" || q.questionType === "PHONE" || q.questionType === "DATE") {
            const input = formFieldsContainer.querySelector(`[data-field-id="${q.id}"]`);
            if (input && input.value.trim() !== "") answered++;
        } else if (q.questionType === "DROPDOWN") {
            const select = formFieldsContainer.querySelector(`[data-field-id="${q.id}"]`);
            if (select && select.value !== "") answered++;
        } else if (q.questionType === "MULTIPLE_CHOICE") {
            const checkedRadio = formFieldsContainer.querySelector(`input[name="q_${q.id}"]:checked`);
            if (checkedRadio) answered++;
        } else if (q.questionType === "CHECKBOXES") {
            const checkedBoxes = formFieldsContainer.querySelectorAll(`input[name="q_${q.id}"]:checked`);
            if (checkedBoxes.length > 0) answered++;
        } else if (q.questionType === "FILE_UPLOAD") {
            const fileInput = document.getElementById(`file_input_${q.id}`);
            if (fileInput && fileInput.files && fileInput.files.length > 0) answered++;
        }
    });

    const total = questions.length;
    progressText.textContent = `${answered} / ${total} Completed`;
    const pct = total > 0 ? (answered / total) * 100 : 0;
    progressBar.style.width = `${pct}%`;
}

// Render validation errors per card
function showFieldValidationError(fieldId, message) {
    const qCard = formFieldsContainer.querySelector(`.question-card [data-field-id="${fieldId}"]`).closest(".question-card");
    if (qCard) {
        const errorBox = qCard.querySelector(".error-msg-box");
        const errorText = qCard.querySelector(".error-text-container");
        const inputControl = qCard.querySelector("input, select, textarea");

        if (inputControl) inputControl.classList.add("border-danger");
        errorText.textContent = message;
        errorBox.classList.remove("hidden");
    }
}

// Global Toast messages
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 pointer-events-auto transform translate-y-[-1rem] opacity-0";

    if (type === "success") {
        toast.classList.add("bg-green-50", "text-emerald-500", "border-green-200");
    } else {
        toast.classList.add("bg-red-50", "text-red-500", "border-red-200");
    }

    const icon = type === "success" ? "check_circle" : "error";
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[20px]">${icon}</span>
        <span class="text-xs font-semibold">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove("translate-y-[-1rem]", "opacity-0");
        toast.classList.add("translate-y-0", "opacity-100");
    }, 10);

    setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-[-1rem]", "opacity-0");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Form Submission handler
customAnswersForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isPreviewMode) return;
    if (alreadySubmitted) {
        showToast("You have already submitted responses in this session.", "error");
        return;
    }

    // Un-highlight previous errors
    formFieldsContainer.querySelectorAll(".error-msg-box").forEach(el => el.classList.add("hidden"));
    formFieldsContainer.querySelectorAll("input, select, textarea").forEach(el => el.classList.remove("border-danger"));

    const token = localStorage.getItem("accessToken");
    if (!token) {
        showToast("You must be logged in to submit this form.", "error");
        return;
    }

    let hasErrors = false;
    const answersList = [];
    const formData = new FormData();

    customFormStructure.questions.forEach(q => {
        const fieldId = q.id;
        let val = "";

        if (q.questionType === "SHORT_ANSWER" || q.questionType === "PARAGRAPH" || q.questionType === "NUMBER" || q.questionType === "EMAIL" || q.questionType === "PHONE" || q.questionType === "DATE") {
            const input = formFieldsContainer.querySelector(`[data-field-id="${fieldId}"]`);
            val = input ? input.value.trim() : "";

            if (q.required && !val) {
                showFieldValidationError(fieldId, "This field is required.");
                hasErrors = true;
            } else if (val) {
                // Email format check
                if (q.questionType === "EMAIL") {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(val)) {
                        showFieldValidationError(fieldId, "Please enter a valid email address.");
                        hasErrors = true;
                    }
                }
                // Phone format check
                else if (q.questionType === "PHONE") {
                    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
                    if (!phoneRegex.test(val.replace(/\s+/g, ""))) {
                        showFieldValidationError(fieldId, "Please enter a valid phone number.");
                        hasErrors = true;
                    }
                }
                // Number range checks
                else if (q.questionType === "NUMBER") {
                    const num = parseFloat(val);
                    if (q.minValue !== null && num < q.minValue) {
                        showFieldValidationError(fieldId, `Value must be at least ${q.minValue}.`);
                        hasErrors = true;
                    }
                    if (q.maxValue !== null && num > q.maxValue) {
                        showFieldValidationError(fieldId, `Value cannot exceed ${q.maxValue}.`);
                        hasErrors = true;
                    }
                }
            }
        } else if (q.questionType === "DROPDOWN") {
            const select = formFieldsContainer.querySelector(`[data-field-id="${fieldId}"]`);
            val = select ? select.value : "";
            if (q.required && !val) {
                showFieldValidationError(fieldId, "Please select an option.");
                hasErrors = true;
            }
        } else if (q.questionType === "MULTIPLE_CHOICE") {
            const checked = formFieldsContainer.querySelector(`input[name="q_${fieldId}"]:checked`);
            val = checked ? checked.value : "";
            if (q.required && !val) {
                // Find selector control to highlight
                const control = formFieldsContainer.querySelector(`[data-field-id="${fieldId}"][data-type="MULTIPLE_CHOICE"]`);
                showFieldValidationError(fieldId, "Please select an option.");
                hasErrors = true;
            }
        } else if (q.questionType === "CHECKBOXES") {
            const checked = Array.from(formFieldsContainer.querySelectorAll(`input[name="q_${fieldId}"]:checked`));
            const vals = checked.map(c => c.value);
            val = vals.join(", ");
            if (q.required && vals.length === 0) {
                showFieldValidationError(fieldId, "Please check at least one option.");
                hasErrors = true;
            }
        } else if (q.questionType === "FILE_UPLOAD") {
            const fileInput = document.getElementById(`file_input_${fieldId}`);
            const file = fileInput && fileInput.files ? fileInput.files[0] : null;

            if (file) {
                // File type checks
                const ext = file.name.substring(file.name.lastIndexOf(".") + 1).toLowerCase();
                const allowedExts = ["png", "jpg", "jpeg", "pdf"];
                if (!allowedExts.includes(ext)) {
                    showFieldValidationError(fieldId, "Only PNG, JPG, JPEG, and PDF file formats are supported.");
                    hasErrors = true;
                }
                // File size checks (5MB)
                else if (file.size > 5 * 1024 * 1024) {
                    showFieldValidationError(fieldId, "File size cannot exceed 5MB.");
                    hasErrors = true;
                } else {
                    // Append file to multipart request with stringified ID as key
                    formData.append(fieldId.toString(), file);
                }
            } else if (q.required) {
                showFieldValidationError(fieldId, "Please upload a file attachment.");
                hasErrors = true;
            }
        }

        answersList.push({
            questionId: fieldId,
            answerValue: val
        });
    });

    if (hasErrors) {
        showToast("Please correct highlighted questions.", "error");
        return;
    }

    // Bind loading submission state
    formSubmitBtn.disabled = true;
    formSubmitBtn.classList.add("opacity-50", "cursor-not-allowed");
    formSubmitText.textContent = "Submitting...";

    // Append JSON answers list wrapper
    formData.append("answers", JSON.stringify({ answers: answersList }));

    try {
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/${formId}/submit`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });

        const body = await res.json();
        if (res.ok && body.success) {
            alreadySubmitted = true;
            showToast("Response submitted successfully!", "success");
            
            // Hide progress and form, render success view
            stickyProgress.classList.add("hidden");
            customAnswersForm.classList.add("hidden");
            document.getElementById("form-success-block").classList.remove("hidden");
        } else {
            throw new Error(body.message || "Submission failed.");
        }
    } catch (err) {
        console.error("Form submit error:", err);
        showToast(err.message || "Failed to submit responses.", "error");
        
        formSubmitBtn.disabled = false;
        formSubmitBtn.classList.remove("opacity-50", "cursor-not-allowed");
        formSubmitText.textContent = "Submit Response";
    }
});

// Helper: formatDate
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Helper: escapeHtml
function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
}

// Helper: escapeJs
function escapeJs(value) {
    return (value || "").replace(/'/g, "\\'").replace(/"/g, '\\"');
}

document.addEventListener("DOMContentLoaded", initPage);
