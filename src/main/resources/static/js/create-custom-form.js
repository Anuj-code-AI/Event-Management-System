// create-custom-form.js — custom forms builder matching CampusHive light-theme aesthetics
const API_CUSTOM_FORM_BASE = "/api/v1/custom-forms";

// Form state
let questions = [];
let nextQuestionId = 1;

// Element selectors
const ticketPriceInput = document.getElementById("registrationFee");
const paymentQrContainer = document.getElementById("payment-qr-container");
const paymentQrInput = document.getElementById("paymentQr");
const paymentQrFileName = document.getElementById("paymentQr-file-name");

// File input handler with preview for header banner
function setupFilePreview(inputId, previewContainerId, previewImgId, labelId, defaultLabel) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(previewContainerId);
    const img = document.getElementById(previewImgId);
    const label = document.getElementById(labelId);

    if (!input) return;

    input.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            if (inputId === "banner") useDefaultBanner = false;
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
            if (container) container.classList.add("hidden");
        }
    });
}

setupFilePreview("banner", "banner-preview-container", "banner-preview", "banner-file-name", "Click to upload header banner");
setupFilePreview("paymentQr", "paymentQr-preview-container", "paymentQr-preview", "paymentQr-file-name", "Click to upload UPI / Payment QR code");

let useDefaultBanner = false;

document.getElementById("use-default-banner-btn").addEventListener("click", () => {
    useDefaultBanner = true;
    document.getElementById("banner").value = "";
    document.getElementById("banner-file-name").textContent = "Using default banner";
    document.getElementById("banner-file-name").classList.remove("text-muted");
    document.getElementById("banner-file-name").classList.add("text-action");

    document.getElementById("banner-preview").src = "/images/banner-placeholder.png";
    document.getElementById("banner-preview-container").classList.remove("hidden");
});

document.getElementById("clear-banner-btn").addEventListener("click", () => {
    useDefaultBanner = false;
    document.getElementById("banner").value = "";
    document.getElementById("banner-file-name").textContent = "Click to upload header banner";
    document.getElementById("banner-file-name").classList.add("text-muted");
    document.getElementById("banner-file-name").classList.remove("text-action");
    document.getElementById("banner-preview-container").classList.add("hidden");
});

// Handle conditional Payment QR display
function togglePaymentQr() {
    const price = parseFloat(ticketPriceInput.value || 0);
    if (price > 0) {
        paymentQrContainer.classList.remove("hidden");
    } else {
        paymentQrContainer.classList.add("hidden");
        paymentQrInput.value = "";
        paymentQrFileName.textContent = "Click to upload UPI / Payment QR code";
        const container = document.getElementById("paymentQr-preview-container");
        if (container) container.classList.add("hidden");
    }
}

if (ticketPriceInput) {
    ticketPriceInput.addEventListener("input", togglePaymentQr);
}

// Initial Page Setup
async function initPage() {
    const user = await getCurrentUser();
    if (!user || (user.systemRole !== "HOD" && user.hostStatus !== "APPROVED")) {
        console.warn("[create-custom-form] Unauthorized access.");
        show404Page("You do not have permission to build custom forms.");
        return;
    }

    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(user);
    }

    // Set default dates: start now, deadline in 1 week
    const now = new Date();
    const startStr = now.toISOString().slice(0, 16);
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const endStr = deadline.toISOString().slice(0, 16);

    document.getElementById("registrationStart").value = startStr;
    document.getElementById("registrationDeadline").value = endStr;

    // Bind add question button click
    document.getElementById("add-question-btn")?.addEventListener("click", addQuestion);

    // Load initial empty question
    addQuestion();
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
                <div class="w-full md:w-48 space-y-1">
                    <label class="text-xs font-bold text-ink uppercase tracking-wider eyebrow">Question Type</label>
                    <select onchange="updateQuestionField(${q.id}, 'fieldType', this.value)"
                            class="w-full bg-canvas-sunk border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-action focus:ring-action transition-all">
                        <option value="SHORT_ANSWER" ${q.fieldType === "SHORT_ANSWER" ? "selected" : ""}>Short Answer</option>
                        <option value="PARAGRAPH" ${q.fieldType === "PARAGRAPH" ? "selected" : ""}>Paragraph</option>
                        <option value="MULTIPLE_CHOICE" ${q.fieldType === "MULTIPLE_CHOICE" ? "selected" : ""}>Single Choice (Radio)</option>
                        <option value="CHECKBOXES" ${q.fieldType === "CHECKBOXES" ? "selected" : ""}>Multiple Choice (Checkbox)</option>
                        <option value="DROPDOWN" ${q.fieldType === "DROPDOWN" ? "selected" : ""}>Dropdown</option>
                        <option value="NUMBER" ${q.fieldType === "NUMBER" ? "selected" : ""}>Number</option>
                        <option value="EMAIL" ${q.fieldType === "EMAIL" ? "selected" : ""}>Email</option>
                        <option value="PHONE" ${q.fieldType === "PHONE" ? "selected" : ""}>Phone</option>
                        <option value="DATE" ${q.fieldType === "DATE" ? "selected" : ""}>Date</option>
                        <option value="FILE_UPLOAD" ${q.fieldType === "FILE_UPLOAD" ? "selected" : ""}>File Upload</option>
                    </select>
                </div>
            </div>

            <!-- Options (Choices) -->
            ${optionsHtml}

            <!-- Card Actions -->
            <div class="flex items-center justify-between border-t border-line pt-4 mt-2">
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="req_${q.id}" ${q.required ? "checked" : ""}
                           onchange="updateQuestionField(${q.id}, 'required', this.checked)"
                           class="rounded border-line text-action focus:ring-action bg-canvas transition-all" />
                    <label for="req_${q.id}" class="text-xs font-semibold text-ink cursor-pointer select-none">Required</label>
                </div>
                <div class="flex gap-1">
                    <button type="button" onclick="duplicateQuestion(${q.id})" class="text-muted hover:text-ink p-1.5 rounded hover:bg-canvas-sunk transition-colors" title="Duplicate">
                        <span class="material-symbols-outlined text-[20px]">content_copy</span>
                    </button>
                    <button type="button" onclick="deleteQuestion(${q.id})" class="text-danger hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors" title="Delete">
                        <span class="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                </div>
            </div>
        `;
        questionsContainer.appendChild(card);
    });
}

// Drag & Drop reordering logic
let dragSrcEl = null;

function handleDragStart(e) {
    this.classList.add("opacity-50");
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", this.getAttribute("data-index"));
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    this.classList.add("drag-over");
    return false;
}

function handleDragLeave(e) {
    this.classList.remove("drag-over");
}

function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove("drag-over");
    
    if (dragSrcEl !== this) {
        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
        const toIndex = parseInt(this.getAttribute("data-index"));

        // Reorder questions state
        const targetQuestion = questions.splice(fromIndex, 1)[0];
        questions.splice(toIndex, 0, targetQuestion);

        renderQuestions();
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove("opacity-50");
    document.querySelectorAll("#questions-container > div").forEach(el => {
        el.classList.remove("drag-over");
    });
}

// Global alert alerts
const alertBox = document.getElementById("alert-box");

function showGlobalAlert(type, msg) {
    alertBox.classList.remove("hidden");
    if (type === "success") {
        alertBox.className = "p-4 rounded-lg mb-6 text-xs font-semibold flex items-start gap-2 border bg-green-50 border-green-200 text-emerald-600";
        alertBox.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span><span>${msg}</span>`;
    } else {
        alertBox.className = "p-4 rounded-lg mb-6 text-xs font-semibold flex items-start gap-2 border bg-red-50 border-red-200 text-danger";
        alertBox.innerHTML = `<span class="material-symbols-outlined text-[16px]">error</span><span>${msg}</span>`;
    }
    alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function highlightError(element) {
    if (!element) return;
    element.classList.add("border-danger");
}

// Bind custom forms submissions builder submit event
const customFormBuilder = document.getElementById("custom-form-builder");

customFormBuilder.addEventListener("submit", async (e) => {
    e.preventDefault();
    alertBox.classList.add("hidden");

    // Clear previous highlights
    document.querySelectorAll("input, select, textarea").forEach(el => el.classList.remove("border-danger"));

    const token = localStorage.getItem("accessToken");
    if (!token) {
        showGlobalAlert("error", "You must be logged in to create a custom form event.");
        return;
    }

    const title = document.getElementById("form-title").value.trim();
    const description = document.getElementById("form-description").value.trim();
    const bannerFile = document.getElementById("banner").files[0];
    const isPublic = document.getElementById("form-is-public").value === "true";
    const maxSubmissions = parseInt(document.getElementById("maxSubmissions").value || 1000);
    const startVal = document.getElementById("registrationStart").value;
    const deadlineVal = document.getElementById("registrationDeadline").value;
    const allowMultipleSubmissions = document.getElementById("allowMultipleSubmissions").checked;
    const registrationFee = parseFloat(document.getElementById("registrationFee").value || 0.0);
    const paymentQrFile = document.getElementById("paymentQr").files[0];
    const paymentInstructions = document.getElementById("paymentInstructions").value.trim();

    let hasError = false;

    if (!title) {
        highlightError(document.getElementById("form-title"));
        hasError = true;
    }
    if (!bannerFile && !useDefaultBanner) {
        highlightError(document.getElementById("banner-file-name").parentElement);
        hasError = true;
    }
    if (!startVal) {
        highlightError(document.getElementById("registrationStart"));
        hasError = true;
    }
    if (!deadlineVal) {
        highlightError(document.getElementById("registrationDeadline"));
        hasError = true;
    }
    if (isNaN(maxSubmissions) || maxSubmissions <= 0) {
        highlightError(document.getElementById("maxSubmissions"));
        hasError = true;
    }
    if (isNaN(registrationFee) || registrationFee < 0) {
        highlightError(document.getElementById("registrationFee"));
        hasError = true;
    }

    // Payment QR mandatory if fee > 0
    if (registrationFee > 0 && !paymentQrFile) {
        highlightError(document.getElementById("paymentQr-file-name").parentElement);
        hasError = true;
    }

    // Date logical validations
    if (startVal && deadlineVal) {
        const start = new Date(startVal);
        const deadline = new Date(deadlineVal);
        if (start >= deadline) {
            highlightError(document.getElementById("registrationDeadline"));
            showGlobalAlert("error", "Registration Closes date must be after Registration Opens date.");
            return;
        }
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

    // Construct request payload matching CreateCustomFormRequest DTO
    const requestPayload = {
        title: title,
        description: description || "No form description provided.",
        participationType: isPublic ? "PUBLIC" : "UNIVERSITY_ONLY",
        registrationStart: toLocalDateTimeString(new Date(startVal)),
        registrationDeadline: toLocalDateTimeString(new Date(deadlineVal)),
        maxSubmissions: maxSubmissions,
        acceptingResponses: true,
        allowMultipleSubmissions: allowMultipleSubmissions,
        paymentRequired: registrationFee > 0,
        registrationFee: registrationFee,
        paymentInstructions: paymentInstructions || "",
        questions: questions.map((q, idx) => ({
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

    if (paymentQrFile) {
        formData.append("paymentQr", paymentQrFile);
    }

    try {
        const res = await fetch(API_CUSTOM_FORM_BASE, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const body = await res.json();

        if (res.ok && body.success) {
            showGlobalAlert("success", "Campus Form Event request submitted successfully! Redirecting...");
            setTimeout(() => {
                window.location.href = "/event-management";
            }, 1500);
        } else {
            showGlobalAlert("error", body.message || "An error occurred during event submission.");
            submitBtn.disabled = false;
            submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
        }
    } catch (err) {
        console.error("Submission error:", err);
        showGlobalAlert("error", "A network error occurred. Please try again.");
        submitBtn.disabled = false;
        submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
    }
});

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);
window.addQuestion = addQuestion;
