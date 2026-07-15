// update-custom-form.js — Handles loading and saving custom form updates
const API_CUSTOM_FORM_BASE = "/api/v1/custom-forms";

// Form state
let formId = null;
let questions = [];
let nextQuestionId = 1;

// File input handler with preview for header banner
function setupFilePreview(inputId, previewContainerId, previewImgId, labelId, defaultLabel) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(previewContainerId);
    const img = document.getElementById(previewImgId);
    const label = document.getElementById(labelId);

    if (!input) return;

    input.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            label.textContent = `Selected: ${file.name}`;
            label.classList.remove("text-on-surface-variant");
            label.classList.add("text-primary");

            if (file.type.startsWith("image/") && img) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    img.src = event.target.result;
                    container.classList.remove("hidden");
                };
                reader.readAsDataURL(file);
            }
        } else {
            label.textContent = defaultLabel;
            label.classList.add("text-on-surface-variant");
            label.classList.remove("text-primary");
        }
    });
}

setupFilePreview("banner", "banner-preview-container", "banner-preview", "banner-file-name", "Click to replace header banner");

// Initial Page Setup
async function initPage() {
    const user = await getCurrentUser();
    if (!user || (user.systemRole !== "HOD" && user.hostStatus !== "APPROVED")) {
        console.warn("[update-custom-form] Unauthorized access. Redirecting...");
        window.location.href = "/home";
        return;
    }

    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(user);
    }

    // Extract formId from query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlFormId = urlParams.get('formId');

    if (!urlFormId || isNaN(parseInt(urlFormId))) {
        showGlobalAlert("error", "Invalid custom form ID. Please go back and try again.");
        return;
    }

    formId = parseInt(urlFormId);
    await loadExistingForm(formId);
}

// Fetch existing custom form and load it in builder state
async function loadExistingForm(id) {
    try {
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/form/${id}`);
        const body = await res.json();

        if (res.ok && body.success && body.data) {
            const form = body.data;

            // Check if user is the owner
            const user = await getCurrentUser();
            if (form.userId !== user.id) {
                showGlobalAlert("error", "You do not have permission to edit this custom form.");
                document.getElementById("submit-btn").disabled = true;
                return;
            }

            // Fill header values
            document.getElementById("form-title").value = form.title;
            document.getElementById("form-description").value = form.description || "";
            document.getElementById("form-is-public").value = form.isPublic ? "true" : "false";

            // Preview banner
            if (form.bannerUrl) {
                const img = document.getElementById("banner-preview");
                const container = document.getElementById("banner-preview-container");
                img.src = form.bannerUrl;
                container.classList.remove("hidden");
                document.getElementById("banner-file-name").textContent = "Using existing banner image";
            }

            // Fill questions list
            if (form.fields && form.fields.length > 0) {
                // Sort fields by sortOrder
                const sortedFields = [...form.fields].sort((a, b) => a.sortOrder - b.sortOrder);
                questions = sortedFields.map(f => ({
                    id: nextQuestionId++,
                    label: f.label,
                    fieldType: f.fieldType,
                    required: f.required,
                    options: f.options && f.options.length > 0 ? [...f.options] : ["Option 1"]
                }));
            } else {
                addQuestion();
            }

            renderQuestions();
        } else {
            throw new Error(body.message || "Failed to fetch form structure.");
        }
    } catch (e) {
        console.error("loadExistingForm error:", e);
        showGlobalAlert("error", "Could not load form details: " + e.message);
    }
}

// State management operations
function addQuestion() {
    questions.push({
        id: nextQuestionId++,
        label: "",
        fieldType: "SHORT_ANSWER",
        required: false,
        options: ["Option 1"]
    });
    renderQuestions();
}

function deleteQuestion(id) {
    if (questions.length <= 1) {
        showGlobalAlert("error", "Your custom form must contain at least one question.");
        return;
    }
    questions = questions.filter(q => q.id !== id);
    renderQuestions();
}

function duplicateQuestion(id) {
    const index = questions.findIndex(q => q.id === id);
    if (index === -1) return;
    const origin = questions[index];
    const clone = {
        id: nextQuestionId++,
        label: origin.label ? origin.label + " (Copy)" : "",
        fieldType: origin.fieldType,
        required: origin.required,
        options: [...origin.options]
    };
    questions.splice(index + 1, 0, clone);
    renderQuestions();
}

function updateQuestionField(id, key, val) {
    const q = questions.find(q => q.id === id);
    if (q) {
        q[key] = val;
        // If type changed to MC/Checkbox/Dropdown and options are empty, set default
        if (key === "fieldType" && (val === "MULTIPLE_CHOICE" || val === "CHECKBOXES" || val === "DROPDOWN")) {
            if (!q.options || q.options.length === 0) {
                q.options = ["Option 1"];
            }
            renderQuestions(); // Re-render to show options input list
        } else if (key === "fieldType") {
            renderQuestions(); // Re-render to hide options lists for other types
        }
    }
}

// Option actions for choice types
function addOption(questionId) {
    const q = questions.find(q => q.id === questionId);
    if (q) {
        q.options.push(`Option ${q.options.length + 1}`);
        renderQuestions();
    }
}

function removeOption(questionId, optionIndex) {
    const q = questions.find(q => q.id === questionId);
    if (q) {
        if (q.options.length <= 1) {
            showGlobalAlert("error", "A multiple choice question must contain at least one option.");
            return;
        }
        q.options.splice(optionIndex, 1);
        renderQuestions();
    }
}

function updateOptionValue(questionId, optionIndex, value) {
    const q = questions.find(q => q.id === questionId);
    if (q) {
        q.options[optionIndex] = value;
    }
}

// Dynamic rendering of builder questions
const questionsContainer = document.getElementById("questions-container");

function renderQuestions() {
    questionsContainer.innerHTML = "";
    questions.forEach((q, index) => {
        const card = document.createElement("div");
        card.className = "glass-card rounded-xl p-md md:p-lg shadow-md border border-outline-variant/30 relative transition-all duration-150";
        card.setAttribute("draggable", "true");
        card.setAttribute("data-id", q.id);
        card.setAttribute("data-index", index);

        // Drag handlers & reordering listeners
        card.addEventListener("dragstart", handleDragStart);
        card.addEventListener("dragover", handleDragOver);
        card.addEventListener("dragleave", handleDragLeave);
        card.addEventListener("drop", handleDrop);
        card.addEventListener("dragend", handleDragEnd);

        const isChoiceType = q.fieldType === "MULTIPLE_CHOICE" || q.fieldType === "CHECKBOXES" || q.fieldType === "DROPDOWN";

        let optionsHtml = "";
        if (isChoiceType) {
            optionsHtml = `
                <div class="space-y-sm mt-sm pl-md border-l-2 border-primary/20">
                    <label class="text-label-md text-primary font-semibold">Options / Choices</label>
                    <div class="space-y-xs">
                        ${q.options.map((opt, optIndex) => `
                            <div class="flex items-center gap-xs">
                                <span class="material-symbols-outlined text-[18px] text-on-surface-variant">radio_button_unchecked</span>
                                <input type="text" value="${opt}" oninput="updateOptionValue(${q.id}, ${optIndex}, this.value)"
                                       placeholder="Option ${optIndex + 1}"
                                       class="flex-1 bg-surface-container-low border border-outline-variant rounded px-sm py-xs text-body-sm text-on-surface focus:border-primary focus:outline-none" />
                                <button type="button" onclick="removeOption(${q.id}, ${optIndex})" class="text-error hover:text-red-400 p-xs flex items-center">
                                    <span class="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                        `).join("")}
                    </div>
                    <button type="button" onclick="addOption(${q.id})" class="text-body-sm text-primary hover:underline font-semibold flex items-center gap-xs mt-xs">
                        <span class="material-symbols-outlined text-[16px]">add</span> Add Option
                    </button>
                </div>
            `;
        }

        card.innerHTML = `
            <!-- Drag Handle at Top -->
            <div class="flex items-center justify-center cursor-move text-on-surface-variant opacity-40 hover:opacity-100 mb-sm drag-handle">
                <span class="material-symbols-outlined text-[24px]">drag_indicator</span>
            </div>

            <div class="flex flex-col md:flex-row gap-md items-start justify-between">
                <!-- Question Title -->
                <div class="flex-1 w-full space-y-xs">
                    <label class="text-label-md text-primary font-semibold">Question Title <span class="text-error">*</span></label>
                    <input type="text" value="${q.label}" oninput="updateQuestionField(${q.id}, 'label', this.value)"
                           placeholder="e.g. Please enter your shirt size" required
                           class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors" />
                </div>

                <!-- Answer Type -->
                <div class="w-full md:w-56 space-y-xs">
                    <label class="text-label-md text-primary font-semibold">Answer Type</label>
                    <select onchange="updateQuestionField(${q.id}, 'fieldType', this.value)"
                            class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors">
                        <option value="SHORT_ANSWER" ${q.fieldType === "SHORT_ANSWER" ? "selected" : ""}>Short Answer</option>
                        <option value="PARAGRAPH" ${q.fieldType === "PARAGRAPH" ? "selected" : ""}>Paragraph</option>
                        <option value="MULTIPLE_CHOICE" ${q.fieldType === "MULTIPLE_CHOICE" ? "selected" : ""}>Multiple Choice</option>
                        <option value="CHECKBOXES" ${q.fieldType === "CHECKBOXES" ? "selected" : ""}>Checkboxes</option>
                        <option value="DROPDOWN" ${q.fieldType === "DROPDOWN" ? "selected" : ""}>Dropdown</option>
                        <option value="NUMBER" ${q.fieldType === "NUMBER" ? "selected" : ""}>Number</option>
                        <option value="EMAIL" ${q.fieldType === "EMAIL" ? "selected" : ""}>Email</option>
                        <option value="PHONE" ${q.fieldType === "PHONE" ? "selected" : ""}>Phone</option>
                        <option value="DATE" ${q.fieldType === "DATE" ? "selected" : ""}>Date</option>
                        <option value="FILE_UPLOAD" ${q.fieldType === "FILE_UPLOAD" ? "selected" : ""}>File Upload (Images/PDF)</option>
                    </select>
                </div>
            </div>

            <!-- Dynamic choices options block -->
            ${optionsHtml}

            <!-- Bottom action panel -->
            <div class="flex items-center justify-end gap-sm mt-md pt-sm border-t border-outline-variant/10 text-on-surface-variant">
                <label class="flex items-center gap-xs text-body-sm font-medium mr-auto cursor-pointer hover:text-on-surface transition-colors">
                    <input type="checkbox" ${q.required ? "checked" : ""} onchange="updateQuestionField(${q.id}, 'required', this.checked)"
                           class="rounded bg-surface-container-low border-outline-variant text-primary focus:ring-primary focus:ring-offset-background" />
                    Required field
                </label>

                <!-- Duplicate -->
                <button type="button" onclick="duplicateQuestion(${q.id})" class="hover:text-primary transition-colors flex items-center p-xs" title="Duplicate question">
                    <span class="material-symbols-outlined text-[20px]">content_copy</span>
                </button>

                <!-- Delete -->
                <button type="button" onclick="deleteQuestion(${q.id})" class="hover:text-error transition-colors flex items-center p-xs" title="Delete question">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>
            </div>
        `;
        questionsContainer.appendChild(card);
    });
}

// Drag & Drop event handlers
let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(this.getAttribute("data-index"));
    this.style.opacity = "0.4";
    e.dataTransfer.effectAllowed = "move";
}

function handleDragOver(e) {
    e.preventDefault();
    this.classList.add("drag-over");
}

function handleDragLeave() {
    this.classList.remove("drag-over");
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove("drag-over");
    const targetIndex = parseInt(this.getAttribute("data-index"));

    if (draggedIndex !== null && draggedIndex !== targetIndex) {
        const draggedItem = questions[draggedIndex];
        questions.splice(draggedIndex, 1);
        questions.splice(targetIndex, 0, draggedItem);
        renderQuestions();
    }
}

function handleDragEnd() {
    this.style.opacity = "1";
    draggedIndex = null;
    document.querySelectorAll(".glass-card").forEach(c => c.classList.remove("drag-over"));
}

// Floating control adding question
document.getElementById("add-question-btn").addEventListener("click", addQuestion);

// Client-side helper alerts
const alertBox = document.getElementById("alert-box");
function showGlobalAlert(type, message) {
    alertBox.classList.remove("hidden");
    if (type === "success") {
        alertBox.className = "p-md rounded-lg mb-lg text-body-sm font-medium flex items-start gap-sm bg-primary/10 border border-primary/30 text-primary";
        alertBox.innerHTML = `<span class="material-symbols-outlined text-[20px]">check_circle</span> <span>${message}</span>`;
    } else {
        alertBox.className = "p-md rounded-lg mb-lg text-body-sm font-medium flex items-start gap-sm bg-error/10 border border-error/30 text-error";
        alertBox.innerHTML = `<span class="material-symbols-outlined text-[20px]">error</span> <span>${message}</span>`;
    }
    alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearAlerts() {
    alertBox.className = "hidden p-md rounded-lg mb-lg text-body-sm font-medium flex items-start gap-sm";
    alertBox.innerHTML = "";
    document.querySelectorAll("input, select, textarea").forEach(el => el.classList.remove("border-error"));
}

function highlightError(inputEl) {
    if (inputEl) {
        inputEl.classList.add("border-error");
    }
}

// Form Validation and Submission
const builderForm = document.getElementById("custom-form-builder");

builderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlerts();

    const token = localStorage.getItem("accessToken");
    if (!token) {
        showGlobalAlert("error", "Your session has expired. Please log in again.");
        return;
    }

    // Capture fields
    const title = document.getElementById("form-title").value.trim();
    const description = document.getElementById("form-description").value.trim();
    const bannerFile = document.getElementById("banner").files[0];

    // Client-side validations
    let hasError = false;

    if (!title) {
        highlightError(document.getElementById("form-title"));
        hasError = true;
    }

    // Question validation: Title is mandatory
    let emptyQuestion = false;
    questions.forEach(q => {
        if (!q.label || q.label.trim() === "") {
            emptyQuestion = true;
        }
    });

    if (emptyQuestion) {
        showGlobalAlert("error", "All question titles must be filled out.");
        return;
    }

    if (hasError) {
        showGlobalAlert("error", "Please fill out all mandatory fields highlighted in red.");
        return;
    }

    // Disable button
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-60", "cursor-not-allowed");

    // Construct FormData with standalone custom form properties
    const isPublic = document.getElementById("form-is-public").value === "true";
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description || "No form description provided.");
    formData.append("isPublic", isPublic);
    if (bannerFile) {
        formData.append("banner", bannerFile);
    }

    // Prepare questions metadata with proper sortOrder
    const finalQuestions = questions.map((q, idx) => ({
        label: q.label.trim(),
        fieldType: q.fieldType,
        required: q.required,
        sortOrder: idx,
        options: q.options.map(opt => opt.trim()).filter(opt => opt !== "")
    }));

    formData.append("questions", JSON.stringify(finalQuestions));

    try {
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/update/${formId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const body = await res.json();

        if (res.ok && body.success) {
            showGlobalAlert("success", "Custom Form Event updated successfully! Redirecting for review...");
            setTimeout(() => {
                window.location.href = "/event-management";
            }, 1500);
        } else {
            showGlobalAlert("error", body.message || "An error occurred during custom form update.");
            submitBtn.disabled = false;
            submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
        }
    } catch (err) {
        console.error("Update error:", err);
        showGlobalAlert("error", "A network error occurred. Please try again.");
        submitBtn.disabled = false;
        submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
    }
});

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);
