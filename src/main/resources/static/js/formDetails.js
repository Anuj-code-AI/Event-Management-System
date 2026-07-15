// formDetails.js — Handles loading and submitting custom form questionnaires
const API_CUSTOM_FORM_BASE = "/api/v1/custom-forms";

// State
let formId = null;
let customFormStructure = null;

// Element selections
const formLoading = document.getElementById("form-loading");
const formError = document.getElementById("form-error");
const errorMessage = document.getElementById("error-message");
const formContentSection = document.getElementById("form-content-section");
const formBanner = document.getElementById("form-banner");
const scopeBadge = document.getElementById("scope-badge");
const formTitle = document.getElementById("form-title");
const formDescription = document.getElementById("form-description");
const formOrganizer = document.getElementById("form-organizer");
const scopeDescription = document.getElementById("scope-description");
const formAlert = document.getElementById("form-alert");
const customAnswersForm = document.getElementById("custom-answers-form");
const formFieldsContainer = document.getElementById("form-fields-container");
const formSubmitBtn = document.getElementById("form-submit-btn");
const formSubmitText = document.getElementById("form-submit-text");

// Initialize page
async function initPage() {
    const user = await getCurrentUser();

    // Sidebar render
    if (user && typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(user);
    }

    // Extract formId from URL query parameters (e.g. /formDetails?formId=123)
    const urlParams = new URLSearchParams(window.location.search);
    const urlFormId = urlParams.get('formId');

    if (!urlFormId || isNaN(parseInt(urlFormId))) {
        showLoading(false);
        formContentSection.classList.add("hidden");
        formError.classList.remove("hidden");
        errorMessage.textContent = "Invalid custom form link. Please verify the URL.";
        return;
    }

    formId = parseInt(urlFormId);
    await loadFormStructure(formId);
}

// Loading state controller
function showLoading(show) {
    if (show) {
        formLoading.classList.remove("hidden");
        formContentSection.classList.add("hidden");
        formError.classList.add("hidden");
    } else {
        formLoading.classList.add("hidden");
    }
}

// Fetch form details and questionnaire structure
async function loadFormStructure(id) {
    showLoading(true);
    try {
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/form/${id}`);
        const body = await res.json();

        if (res.ok && body.success && body.data) {
            customFormStructure = body.data;
            populateFormDetails(customFormStructure);
            renderFormFields(customFormStructure.fields);
            formContentSection.classList.remove("hidden");
            showLoading(false);
        } else {
            throw new Error(body.message || "Failed to load custom form specifications.");
        }
    } catch (err) {
        console.error("loadFormStructure error:", err);
        showLoading(false);
        formContentSection.classList.add("hidden");
        formError.classList.remove("hidden");
        errorMessage.textContent = err.message || "Custom form not found, deleted, or you don't have access permissions.";
    }
}

// Render form header information
function populateFormDetails(form) {
    formTitle.textContent = form.title;
    formDescription.textContent = form.description || "Please answer the questions below to submit your registration.";
    formOrganizer.textContent = form.username || "Organizer";
    formBanner.src = form.bannerUrl || "/images/banner-placeholder.png";

    if (form.isPublic) {
        scopeBadge.textContent = "Public Form";
        scopeBadge.className = "absolute top-sm left-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 text-label-md px-sm py-xs rounded-full z-10";
        scopeDescription.innerHTML = `<span class="material-symbols-outlined text-[16px] text-primary">public</span> <span>Public Access</span>`;
    } else {
        scopeBadge.textContent = "Campus Only";
        scopeBadge.className = "absolute top-sm left-sm bg-blue-500/20 text-blue-300 border border-blue-500/30 text-label-md px-sm py-xs rounded-full z-10";
        scopeDescription.innerHTML = `<span class="material-symbols-outlined text-[16px] text-purple-400">shield_person</span> <span>Campus Only</span>`;
    }
}

// Dynamically generate form questions in HTML
function renderFormFields(fields) {
    formFieldsContainer.innerHTML = "";
    if (!fields || fields.length === 0) {
        formFieldsContainer.innerHTML = `<p class="text-body-sm text-outline p-md text-center bg-surface-container-low border border-outline-variant/20 rounded-lg">This questionnaire has no custom questions.</p>`;
        return;
    }

    fields.forEach(field => {
        const fieldCard = document.createElement("div");
        fieldCard.className = "glass-card rounded-xl p-md md:p-lg space-y-sm shadow-sm";

        const labelHtml = `<label class="text-body-sm font-semibold text-on-surface flex items-center gap-xs">
            <span>${field.label}</span>
            ${field.required ? '<span class="text-error font-bold">*</span>' : ''}
        </label>`;

        let inputHtml = "";

        if (field.fieldType === "SHORT_ANSWER") {
            inputHtml = `<input type="text" data-field-id="${field.id}" data-type="SHORT_ANSWER" ${field.required ? 'required' : ''} placeholder="Your answer"
                               class="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none rounded-lg px-md py-sm text-body-sm text-on-surface transition-colors" />`;
        } else if (field.fieldType === "PARAGRAPH") {
            inputHtml = `<textarea data-field-id="${field.id}" data-type="PARAGRAPH" ${field.required ? 'required' : ''} rows="3" placeholder="Your long answer"
                                  class="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none rounded-lg px-md py-sm text-body-sm text-on-surface transition-colors"></textarea>`;
        } else if (field.fieldType === "NUMBER") {
            inputHtml = `<input type="number" data-field-id="${field.id}" data-type="NUMBER" ${field.required ? 'required' : ''} placeholder="Your answer"
                               class="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none rounded-lg px-md py-sm text-body-sm text-on-surface transition-colors" />`;
        } else if (field.fieldType === "EMAIL") {
            inputHtml = `<input type="email" data-field-id="${field.id}" data-type="EMAIL" ${field.required ? 'required' : ''} placeholder="email@example.com"
                               class="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none rounded-lg px-md py-sm text-body-sm text-on-surface transition-colors" />`;
        } else if (field.fieldType === "PHONE") {
            inputHtml = `<input type="tel" data-field-id="${field.id}" data-type="PHONE" ${field.required ? 'required' : ''} placeholder="e.g. +123456789"
                               class="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none rounded-lg px-md py-sm text-body-sm text-on-surface transition-colors" />`;
        } else if (field.fieldType === "DATE") {
            inputHtml = `<input type="date" data-field-id="${field.id}" data-type="DATE" ${field.required ? 'required' : ''}
                               class="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none rounded-lg px-md py-sm text-body-sm text-on-surface transition-colors" />`;
        } else if (field.fieldType === "FILE_UPLOAD") {
            inputHtml = `
                <div class="flex items-center gap-md">
                    <input type="file" data-field-id="${field.id}" data-type="FILE_UPLOAD" accept=".pdf,image/*" ${field.required ? 'required' : ''}
                           class="hidden file-upload-input" id="custom_file_${field.id}" />
                    <label for="custom_file_${field.id}" class="cursor-pointer border border-outline-variant bg-surface-container-low hover:bg-surface-container-high text-on-surface font-semibold py-xs px-sm rounded text-body-sm transition-all flex items-center gap-xs">
                        <span class="material-symbols-outlined text-[18px]">upload</span>
                        <span class="file-label-text">Choose File</span>
                    </label>
                    <span class="text-label-md text-on-surface-variant file-name-display">No file chosen</span>
                </div>
            `;
        } else if (field.fieldType === "DROPDOWN") {
            inputHtml = `
                <select data-field-id="${field.id}" data-type="DROPDOWN" ${field.required ? 'required' : ''}
                        class="w-full bg-surface-container-low border border-outline-variant focus:border-primary focus:outline-none rounded-lg px-md py-sm text-body-sm text-on-surface transition-colors">
                    <option value="">Select option</option>
                    ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join("")}
                </select>
            `;
        } else if (field.fieldType === "MULTIPLE_CHOICE") {
            inputHtml = `
                <div class="space-y-xs pt-xs" data-field-id="${field.id}" data-type="MULTIPLE_CHOICE">
                    ${field.options.map((opt, oIdx) => `
                        <label class="flex items-center gap-sm text-body-sm text-on-surface-variant hover:text-on-surface cursor-pointer">
                            <input type="radio" name="mcq_${field.id}" value="${opt}"
                                   class="bg-surface-container-low border-outline-variant text-primary focus:ring-primary focus:ring-offset-background" />
                            <span>${opt}</span>
                        </label>
                    `).join("")}
                </div>
            `;
        } else if (field.fieldType === "CHECKBOXES") {
            inputHtml = `
                <div class="space-y-xs pt-xs" data-field-id="${field.id}" data-type="CHECKBOXES">
                    ${field.options.map(opt => `
                        <label class="flex items-center gap-sm text-body-sm text-on-surface-variant hover:text-on-surface cursor-pointer">
                            <input type="checkbox" name="chk_${field.id}" value="${opt}"
                                   class="rounded bg-surface-container-low border-outline-variant text-primary focus:ring-primary focus:ring-offset-background" />
                            <span>${opt}</span>
                        </label>
                    `).join("")}
                </div>
            `;
        }

        fieldCard.innerHTML = `
            ${labelHtml}
            <div class="mt-xs">
                ${inputHtml}
            </div>
            <p class="error-msg text-label-md text-error hidden mt-xs"></p>
        `;
        formFieldsContainer.appendChild(fieldCard);
    });

    // Handle file labels displays
    document.querySelectorAll(".file-upload-input").forEach(input => {
        input.addEventListener("change", (e) => {
            const fileNameDisplay = e.target.parentElement.querySelector(".file-name-display");
            const labelText = e.target.parentElement.querySelector(".file-label-text");
            if (e.target.files && e.target.files.length > 0) {
                fileNameDisplay.textContent = e.target.files[0].name;
                labelText.textContent = "Change File";
            } else {
                fileNameDisplay.textContent = "No file chosen";
                labelText.textContent = "Choose File";
            }
        });
    });
}

// Field validation feedback helper
function showFieldCustomError(el, msg) {
    if (!el) return;
    el.classList.add("border-error");
    const container = el.closest(".glass-card");
    if (container) {
        const errEl = container.querySelector(".error-msg");
        if (errEl) {
            errEl.textContent = msg;
            errEl.classList.remove("hidden");
        }
    }
}

// Global alert feedback helper
function showFormAlert(msg, type = "error") {
    formAlert.classList.remove("hidden");
    if (type === "success") {
        formAlert.className = "p-sm rounded text-label-md font-medium flex items-start gap-xs bg-primary/10 border border-primary/20 text-primary mb-md";
        formAlert.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span> <span>${msg}</span>`;
    } else {
        formAlert.className = "p-sm rounded text-label-md font-medium flex items-start gap-xs bg-error/10 border border-error/20 text-error mb-md";
        formAlert.innerHTML = `<span class="material-symbols-outlined text-[16px]">error</span> <span>${msg}</span>`;
    }
    formAlert.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Submit handler
customAnswersForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    formAlert.classList.add("hidden");

    // Clear previous errors
    document.querySelectorAll("#custom-answers-form .error-msg").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll("#custom-answers-form input, #custom-answers-form select, #custom-answers-form textarea").forEach(el => el.classList.remove("border-error"));

    const token = localStorage.getItem("accessToken");
    if (!token) {
        showFormAlert("You must be logged in to submit responses. Please log in first.");
        return;
    }

    let hasError = false;
    const answersList = [];
    const formData = new FormData();

    // Loop through questions structures to validate
    customFormStructure.fields.forEach(field => {
        const fieldId = field.id;
        const type = field.fieldType;
        let value = "";
        let fileKey = "";

        if (type === "SHORT_ANSWER" || type === "PARAGRAPH" || type === "NUMBER" || type === "EMAIL" || type === "PHONE" || type === "DATE") {
            const input = formFieldsContainer.querySelector(`[data-field-id="${fieldId}"]`);
            value = input ? input.value.trim() : "";
            if (field.required && !value) {
                showFieldCustomError(input, "This field is required.");
                hasError = true;
            }
        } else if (type === "DROPDOWN") {
            const select = formFieldsContainer.querySelector(`[data-field-id="${fieldId}"]`);
            value = select ? select.value : "";
            if (field.required && !value) {
                showFieldCustomError(select, "Please select an option.");
                hasError = true;
            }
        } else if (type === "MULTIPLE_CHOICE") {
            const checkedRadio = formFieldsContainer.querySelector(`input[name="mcq_${fieldId}"]:checked`);
            value = checkedRadio ? checkedRadio.value : "";
            if (field.required && !value) {
                const container = formFieldsContainer.querySelector(`[data-field-id="${fieldId}"][data-type="MULTIPLE_CHOICE"]`);
                showFieldCustomError(container, "Please select an option.");
                hasError = true;
            }
        } else if (type === "CHECKBOXES") {
            const checkedBoxes = Array.from(formFieldsContainer.querySelectorAll(`input[name="chk_${fieldId}"]:checked`));
            const vals = checkedBoxes.map(cb => cb.value);
            value = vals.join(", ");
            if (field.required && vals.length === 0) {
                const container = formFieldsContainer.querySelector(`[data-field-id="${fieldId}"][data-type="CHECKBOXES"]`);
                showFieldCustomError(container, "Please check at least one box.");
                hasError = true;
            }
        } else if (type === "FILE_UPLOAD") {
            const fileInput = document.getElementById(`custom_file_${fieldId}`);
            const file = fileInput && fileInput.files ? fileInput.files[0] : null;

            if (file) {
                const filename = file.name;
                const ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
                if (ext !== "png" && ext !== "jpg" && ext !== "jpeg" && ext !== "pdf") {
                    showFieldCustomError(fileInput.nextElementSibling, "Only PNG, JPG, JPEG, and PDF formats are accepted.");
                    hasError = true;
                } else {
                    fileKey = `file_${fieldId}`;
                    formData.append(fileKey, file);
                }
            } else if (field.required) {
                showFieldCustomError(fileInput.nextElementSibling, "Please upload a file attachment.");
                hasError = true;
            }
        }

        answersList.push({
            fieldId: fieldId,
            value: value,
            fileKey: fileKey
        });
    });

    if (hasError) {
        showFormAlert("Please fix the errors in the highlighted questions.");
        return;
    }

    // Disable button to prevent double submits
    formSubmitBtn.disabled = true;
    formSubmitText.textContent = "Submitting answers...";

    // Append JSON metadata answers
    formData.append("answers", JSON.stringify(answersList));

    try {
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/submit/${formId}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const body = await res.json();
        if (res.ok && body.success) {
            showFormAlert("Form response submitted successfully! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "/myEvents";
            }, 1500);
        } else {
            showFormAlert(body.message || "Failed to submit response. Please try again.");
            formSubmitBtn.disabled = false;
            formSubmitText.textContent = "Submit Response";
        }
    } catch (err) {
        console.error("Custom form submit error:", err);
        showFormAlert("A network error occurred. Please verify your connectivity and try again.");
        formSubmitBtn.disabled = false;
        formSubmitText.textContent = "Submit Response";
    }
});

// Run page initialization
document.addEventListener("DOMContentLoaded", initPage);
