// update-custom-form.js — Handles loading and saving custom form updates matching CampusHive light theme
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
            label.classList.remove("text-muted");
            label.classList.add("text-action");

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
            label.classList.add("text-muted");
            label.classList.remove("text-action");
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
        // Pointing to GET /api/v1/custom-forms/{id}
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/${id}`);
        const body = await res.json();

        if (res.ok && body.success && body.data) {
            const form = body.data;

            // Check if user is the owner
            const user = await getCurrentUser();
            if (form.userId !== user.id && form.createdBy !== user.name) {
                // Allow creator or owner ID
                console.warn("Owner check warning: user ownership check.");
            }

            // Fill header values
            document.getElementById("form-title").value = form.title;
            document.getElementById("form-description").value = form.description || "";
            document.getElementById("form-is-public").value = form.participationType === "PUBLIC" ? "true" : "false";

            // Preview banner
            if (form.bannerUrl) {
                const img = document.getElementById("banner-preview");
                const container = document.getElementById("banner-preview-container");
                img.src = form.bannerUrl;
                container.classList.remove("hidden");
                document.getElementById("banner-file-name").textContent = "Using existing banner image";
            }

            // Fill questions list from response questions field
            if (form.questions && form.questions.length > 0) {
                // Sort questions by displayOrder
                const sortedQuestions = [...form.questions].sort((a, b) => a.displayOrder - b.displayOrder);
                questions = sortedQuestions.map(f => ({
                    id: nextQuestionId++,
                    databaseId: f.id,
                    label: f.title || "",
                    fieldType: f.questionType || "SHORT_ANSWER",
                    required: f.required || false,
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
        databaseId: null,
        label: "",
        fieldType: "SHORT_ANSWER",
        required: false,
        options: ["Option 1"]
    });
    renderQuestions();
}

// Global functions attached to window for inline onclick attributes
window.deleteQuestion = function(id) {
    if (questions.length <= 1) {
        showGlobalAlert("error", "Your custom form must contain at least one question.");
        return;
    }
    questions = questions.filter(q => q.id !== id);
    renderQuestions();
};

window.duplicateQuestion = function(id) {
    const index = questions.findIndex(q => q.id === id);
    if (index === -1) return;
    const origin = questions[index];
    const clone = {
        id: nextQuestionId++,
        databaseId: null,
        label: origin.label ? origin.label + " (Copy)" : "",
        fieldType: origin.fieldType,
        required: origin.required,
        options: [...origin.options]
    };
    questions.splice(index + 1, 0, clone);
    renderQuestions();
};

window.updateQuestionField = function(id, key, val) {
    const q = questions.find(q => q.id === id);
    if (q) {
        q[key] = val;
        if (key === "fieldType" && (val === "MULTIPLE_CHOICE" || val === "CHECKBOXES" || val === "DROPDOWN")) {
            if (!q.options || q.options.length === 0) {
                q.options = ["Option 1"];
            }
            renderQuestions();
        } else if (key === "fieldType") {
            renderQuestions();
        }
    }
};

window.addOption = function(questionId) {
    const q = questions.find(q => q.id === questionId);
    if (q) {
        q.options.push(`Option ${q.options.length + 1}`);
        renderQuestions();
    }
};

window.removeOption = function(questionId, optionIndex) {
    const q = questions.find(q => q.id === questionId);
    if (q) {
        if (q.options.length <= 1) {
            showGlobalAlert("error", "A multiple choice question must contain at least one option.");
            return;
        }
        q.options.splice(optionIndex, 1);
        renderQuestions();
    }
};

window.updateOptionValue = function(questionId, optionIndex, value) {
    const q = questions.find(q => q.id === questionId);
    if (q) {
        q.options[optionIndex] = value;
    }
};

// Dynamic rendering of builder questions
const questionsContainer = document.getElementById("questions-container");

function renderQuestions() {
    questionsContainer.innerHTML = "";
    questions.forEach((q, index) => {
        const card = document.createElement("div");
        card.className = "border border-line bg-canvas rounded-xl p-4 md:p-6 shadow-sm relative transition-all duration-150 space-y-4";
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
                <div class="space-y-2 mt-2 pl-4 border-l-2 border-action/25">
                    <label class="text-xs font-bold text-action uppercase tracking-wider eyebrow">Options / Choices</label>
                    <div class="space-y-1.5">
                        ${q.options.map((opt, optIndex) => `
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[18px] text-muted-dim">radio_button_unchecked</span>
                                <input type="text" value="${opt}" oninput="updateOptionValue(${q.id}, ${optIndex}, this.value)"
                                       placeholder="Option ${optIndex + 1}"
                                       class="flex-1 bg-canvas-sunk border border-line rounded px-2.5 py-1.5 text-xs text-ink focus:border-action focus:ring-action transition-all" />
                                <button type="button" onclick="removeOption(${q.id}, ${optIndex})" class="text-danger hover:text-red-500 p-1 flex items-center">
                                    <span class="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                        `).join("")}
                    </div>
                    <button type="button" onclick="addOption(${q.id})" class="text-xs text-action hover:underline font-semibold flex items-center gap-1 mt-1">
                        <span class="material-symbols-outlined text-[16px]">add</span> Add Option
                    </button>
                </div>
            `;
        }

        card.innerHTML = `
            <!-- Drag Handle at Top -->
            <div class="flex items-center justify-center cursor-move text-muted-dim opacity-50 hover:opacity-100 mb-2 drag-handle">
                <span class="material-symbols-outlined text-[22px]">drag_indicator</span>
            </div>

            <div class="flex flex-col md:flex-row gap-4 items-start justify-between">
                <!-- Question Label -->
                <div class="flex-1 w-full space-y-1">
                    <label class="text-xs font-bold text-action uppercase tracking-wider eyebrow">Question Title <span class="text-danger">*</span></label>
                    <input type="text" value="${q.label}" oninput="updateQuestionField(${q.id}, 'label', this.value)"
                           placeholder="e.g. Please enter your shirt size" required
                           class="w-full bg-canvas-sunk border border-line rounded-lg px-4 py-2 text-xs text-ink focus:border-action focus:ring-action transition-all" />
                </div>

                <!-- Field Type -->
                <div class="w-full md:w-56 space-y-1">
                    <label class="text-xs font-bold text-action uppercase tracking-wider eyebrow">Answer Type</label>
                    <select onchange="updateQuestionField(${q.id}, 'fieldType', this.value)"
                            class="w-full bg-canvas-sunk border border-line rounded-lg px-4 py-2 text-xs text-ink focus:border-action focus:ring-action transition-all">
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
            <div class="flex items-center justify-end gap-3 mt-4 pt-2 border-t border-line text-muted">
                <label class="flex items-center gap-1.5 text-xs font-semibold mr-auto cursor-pointer hover:text-ink transition-colors">
                    <input type="checkbox" ${q.required ? "checked" : ""} onchange="updateQuestionField(${q.id}, 'required', this.checked)"
                           class="rounded bg-canvas-sunk border-line text-action focus:ring-action focus:ring-offset-background" />
                    Required field
                </label>

                <!-- Duplicate -->
                <button type="button" onclick="duplicateQuestion(${q.id})" class="hover:text-action transition-colors flex items-center p-1" title="Duplicate question">
                    <span class="material-symbols-outlined text-[20px]">content_copy</span>
                </button>

                <!-- Delete -->
                <button type="button" onclick="deleteQuestion(${q.id})" class="hover:text-danger transition-colors flex items-center p-1" title="Delete question">
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

window.handleDragStart = handleDragStart;

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
    document.querySelectorAll("#questions-container > div").forEach(c => c.classList.remove("drag-over"));
}

// Floating control adding question
document.getElementById("add-question-btn").addEventListener("click", addQuestion);

// Client-side helper alerts
const alertBox = document.getElementById("alert-box");
function showGlobalAlert(type, message) {
    alertBox.classList.remove("hidden");
    if (type === "success") {
        alertBox.className = "p-4 rounded-lg mb-6 text-xs font-semibold flex items-start gap-2 bg-green-50 border border-green-200 text-signal shadow-sm";
        alertBox.innerHTML = `<span class="material-symbols-outlined text-[20px]">check_circle</span> <span>${message}</span>`;
    } else {
        alertBox.className = "p-4 rounded-lg mb-6 text-xs font-semibold flex items-start gap-2 bg-red-50 border border-red-200 text-danger shadow-sm";
        alertBox.innerHTML = `<span class="material-symbols-outlined text-[20px]">error</span> <span>${message}</span>`;
    }
    alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearAlerts() {
    alertBox.className = "hidden p-4 rounded-lg mb-6 text-xs font-semibold flex items-start gap-2";
    alertBox.innerHTML = "";
    document.querySelectorAll("input, select, textarea").forEach(el => el.classList.remove("border-danger"));
}

function highlightError(inputEl) {
    if (inputEl) {
        inputEl.classList.add("border-danger");
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

    // Helper to format date to LocalDateTime string
    const toLocalDateTimeString = (date) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const isPublic = document.getElementById("form-is-public").value === "true";

    // Construct request payload matching UpdateCustomFormRequest DTO
    const requestPayload = {
        title: title,
        description: description || "No form description provided.",
        participationType: isPublic ? "PUBLIC" : "UNIVERSITY_ONLY",
        registrationStart: toLocalDateTimeString(new Date()),
        registrationDeadline: toLocalDateTimeString(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)), // 1 year from now
        maxSubmissions: 1000,
        acceptingResponses: true,
        allowMultipleSubmissions: true,
        paymentRequired: false,
        registrationFee: 0.0,
        questions: questions.map((q, idx) => ({
            id: q.databaseId || null,
            title: q.label.trim(),
            description: "",
            placeholder: "",
            questionType: q.fieldType,
            required: q.required,
            displayOrder: idx,
            options: (q.fieldType === "MULTIPLE_CHOICE" || q.fieldType === "CHECKBOXES" || q.fieldType === "DROPDOWN")
                ? q.options.map(opt => opt.trim()).filter(opt => opt !== "")
                : []
        }))
    };

    const formData = new FormData();
    const requestBlob = new Blob([JSON.stringify(requestPayload)], {
        type: "application/json"
    });
    formData.append("request", requestBlob);
    if (bannerFile) {
        formData.append("banner", bannerFile);
    }

    try {
        // Pointing to PUT /api/v1/custom-forms/{formId} using RequestPart JSON Blob
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/${formId}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const body = await res.json();

        if (res.ok && body.success) {
            showGlobalAlert("success", "Campus Form Event updated successfully! Redirecting...");
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
