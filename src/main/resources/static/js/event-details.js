// event-details.js — handles loading event details and buying tickets
const API_EVENT = "/api/v1/events";
const API_TICKETS = "/api/v1/tickets";
const API_CUSTOM_FORM_BASE = "/api/v1/custom-forms";

// State
let eventId = null;
let eventDetails = null;
let customFormStructure = null;

// Custom Form selectors
const customFormModal = document.getElementById("custom-form-modal");
const customFormModalClose = document.getElementById("custom-form-modal-close");
const customFormCancelBtn = document.getElementById("custom-form-cancel-btn");
const customAnswersForm = document.getElementById("custom-answers-form");
const customFormFieldsContainer = document.getElementById("custom-form-fields-container");
const customFormAlert = document.getElementById("custom-form-alert");
const customFormSubmitBtn = document.getElementById("custom-form-submit-btn");
const customFormSubmitText = document.getElementById("custom-form-submit-text");
const customFormPaymentSection = document.getElementById("custom-form-payment-section");
const customPaymentQrImage = document.getElementById("custom-payment-qr-image");
const customPaymentScreenshotInput = document.getElementById("custom-paymentScreenShot");

// Element selections
const loadingSpinner = document.getElementById("details-loading");
const errorBlock = document.getElementById("details-error");
const contentSection = document.getElementById("details-content-section");
const detailsAlert = document.getElementById("details-alert");

// Header elements
const eventBanner = document.getElementById("event-banner");
const categoryBadge = document.getElementById("event-category-badge");
const statusBadge = document.getElementById("event-status-badge");
const eventTitle = document.getElementById("event-title");

// Banner lightbox elements
const bannerBtn = document.getElementById("event-banner-btn");
const bannerLightbox = document.getElementById("banner-lightbox");
const bannerLightboxImg = document.getElementById("banner-lightbox-img");
const bannerLightboxClose = document.getElementById("banner-lightbox-close");

// Details card elements
const eventDescription = document.getElementById("event-description");
const eventMode = document.getElementById("event-mode");
const eventVenue = document.getElementById("event-venue");
const eventClub = document.getElementById("event-club");
const eventDate = document.getElementById("event-date");
const eventTime = document.getElementById("event-time");
const eventDeadline = document.getElementById("event-deadline");

// Booking panel elements
const priceDisplay = document.getElementById("ticket-price-display");
const capacityText = document.getElementById("capacity-text");
const capacityProgress = document.getElementById("capacity-progress");
const bookingForm = document.getElementById("booking-form");
const bookingBtn = document.getElementById("book-ticket-btn");
const bookingBtnText = document.getElementById("booking-btn-text");

// Conditional elements
const paymentQrSection = document.getElementById("payment-qr-section");
const paymentQrImage = document.getElementById("payment-qr-image");
const screenshotUploadSection = document.getElementById("screenshot-upload-section");
const screenshotInput = document.getElementById("paymentScreenShot");
const screenshotLabel = document.getElementById("screenshot-label");

// Helper: Format Date
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

// Helper: Format Time
function formatTime(timeStr) {
    if (!timeStr) return "N/A";
    const [hours, minutes] = timeStr.split(":");
    const hr = parseInt(hours, 10);
    const ampm = hr >= 12 ? "PM" : "AM";
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${minutes} ${ampm}`;
}

// Helper: Alert Display
function showAlert(type, message) {
    detailsAlert.classList.remove("hidden");
    if (type === "success") {
        detailsAlert.className = "p-3 rounded text-xs font-semibold flex items-start gap-1.5 bg-green-50 border-green-200 text-signal";
        detailsAlert.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span> <span>${message}</span>`;
    } else {
        detailsAlert.className = "p-3 rounded text-xs font-semibold flex items-start gap-1.5 bg-red-50 border-red-200 text-danger";
        detailsAlert.innerHTML = `<span class="material-symbols-outlined text-[16px]">error</span> <span>${message}</span>`;
    }
}

// Banner lightbox details
function openBannerLightbox() {
    if (!eventBanner.src) return;
    bannerLightboxImg.src = eventBanner.src;
    bannerLightbox.dataset.open = "true";
    document.body.style.overflow = "hidden";
    bannerLightboxClose.focus();
}

function closeBannerLightbox() {
    bannerLightbox.dataset.open = "false";
    document.body.style.overflow = "";
    bannerBtn.focus();
}

if (bannerBtn) {
    bannerBtn.addEventListener("click", openBannerLightbox);
}
if (bannerLightboxClose) {
    bannerLightboxClose.addEventListener("click", closeBannerLightbox);
}
if (bannerLightbox) {
    bannerLightbox.addEventListener("click", (e) => {
        if (e.target === bannerLightbox) closeBannerLightbox();
    });
}
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bannerLightbox.dataset.open === "true") {
        closeBannerLightbox();
    }
});

// Initialize page
async function initPage() {
    const user = await getCurrentUser();

    // Sidebar render
    if (user && typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(user);
    }

    // Extract eventId from URL path (e.g. /eventDetails/123 -> 123)
    const segments = window.location.pathname.split("/");
    eventId = segments.pop();

    if (!eventId || isNaN(parseInt(eventId, 10))) {
        showLoading(false);
        contentSection.classList.add("hidden");
        errorBlock.classList.remove("hidden");
        return;
    }

    // Load event details
    await loadEventDetails(eventId);

    // Bind file upload input name change
    if (screenshotInput) {
        screenshotInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                screenshotLabel.textContent = `Attached: ${e.target.files[0].name}`;
                screenshotLabel.classList.remove("text-muted");
                screenshotLabel.classList.add("text-action");
            } else {
                screenshotLabel.textContent = "Click to attach receipt";
                screenshotLabel.classList.add("text-muted");
                screenshotLabel.classList.remove("text-action");
            }
        });
    }

    // Form submit listener
    if (bookingForm) {
        bookingForm.addEventListener("submit", handleBookingSubmit);
    }
}

// Loading toggler
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove("hidden");
        contentSection.classList.add("hidden");
        errorBlock.classList.add("hidden");
    } else {
        loadingSpinner.classList.add("hidden");
        contentSection.classList.remove("hidden");
    }
}

// Fetch event details specs (Using correct endpoint: GET /api/v1/events/{id})
async function loadEventDetails(id) {
    showLoading(true);
    const token = localStorage.getItem("accessToken");

    try {
        const res = await fetch(`${API_EVENT}/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const body = await res.json();

        if (res.ok && body.success) {
            eventDetails = body.data;
            populateEventDetails(eventDetails);
            showLoading(false);
        } else {
            throw new Error(body.message || "Failed to load event details");
        }
    } catch (err) {
        console.error("loadEventDetails error:", err);
        showLoading(false);
        contentSection.classList.add("hidden");
        errorBlock.classList.remove("hidden");
        document.getElementById("details-error-text").textContent = err.message || "Network issue loading event specifications.";
    }
}

// Populate details to template
function populateEventDetails(event) {
    eventTitle.textContent = event.title || "Untitled Event";
    eventBanner.src = event.bannerUrl || "/images/banner-placeholder.png";
    eventDescription.textContent = event.description || "No description provided.";

    // Category & Status Badge
    categoryBadge.textContent = event.category || "General";
    statusBadge.textContent = event.eventStatus || "PENDING";

    let statusClass = "bg-canvas-sunk text-muted border border-line";
    if (event.eventStatus === "PENDING") statusClass = "bg-amber-50 text-amber-700 border border-amber-200";
    else if (event.eventStatus === "APPROVED") statusClass = "bg-green-50 text-signal border border-green-200";
    else if (event.eventStatus === "REJECTED") statusClass = "bg-red-50 text-danger border border-red-200";
    else if (event.eventStatus === "CANCELLED") statusClass = "bg-red-50 text-danger border border-red-200";
    else if (event.eventStatus === "FINISHED") statusClass = "bg-action-tint text-action border border-action/25";
    statusBadge.className = `${statusClass} text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase`;

    // Metadata details
    eventMode.textContent = event.eventMode || "OFFLINE";
    eventVenue.textContent = `${event.location || "Venue TBA"}, ${event.city || ""}`;
    eventClub.textContent = event.club || (event.organizer ? event.organizer.name : "Student Association");
    eventDate.textContent = formatDate(event.eventDate);
    eventTime.textContent = formatTime(event.eventTime);
    eventDeadline.textContent = formatDate(event.lastRegisterDate);

    // Pricing & Capacity display
    const price = event.ticketPrice || 0;
    priceDisplay.textContent = price > 0 ? `$${price.toFixed(2)}` : "Free";

    const available = event.ticketsAvailable !== null ? event.ticketsAvailable : 0;
    const total = event.totalTickets || 0;
    capacityText.textContent = `${available} / ${total}`;

    const percent = total > 0 ? (available / total) * 100 : 0;
    capacityProgress.style.width = `${percent}%`;

    // Toggle Payment requirements
    if (price > 0 && !customFormStructure) {
        paymentQrSection.classList.remove("hidden");
        screenshotUploadSection.classList.remove("hidden");
        paymentQrImage.src = event.paymentQrUrl || "/images/qr-placeholder.png";
    } else {
        paymentQrSection.classList.add("hidden");
        screenshotUploadSection.classList.add("hidden");
    }

    // Capacity checks & registration toggling
    validateRegistrationState(event);
}

// Checks capacity, date, status and disables button if needed
function validateRegistrationState(event) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deadlineDate = new Date(event.lastRegisterDate);
    const available = event.ticketsAvailable || 0;

    let isClosed = false;
    let closedReason = "";

    if (event.eventStatus !== "APPROVED") {
        isClosed = true;
        closedReason = "Pending Approval";
    } else if (event.cancelled) {
        isClosed = true;
        closedReason = "Event Cancelled";
    } else if (available <= 0) {
        isClosed = true;
        closedReason = "Sold Out";
    } else if (deadlineDate < today) {
        isClosed = true;
        closedReason = "Closed";
    }

    if (isClosed) {
        bookingBtn.disabled = true;
        bookingBtn.className = "w-full bg-canvas-sunk text-muted-dim border border-line font-bold py-3 px-4 rounded-lg cursor-not-allowed opacity-60 flex items-center justify-center gap-1.5";
        bookingBtnText.textContent = closedReason;
        showAlert("error", `Ticket booking is currently unavailable: ${closedReason}`);
    } else {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            bookingBtnText.textContent = "Login to Book Ticket";
        } else if (customFormStructure) {
            bookingBtnText.textContent = "Register & Fill Form";
        } else {
            bookingBtnText.textContent = "Book Ticket";
        }
    }
}

// Handle Ticket booking submission (Using correct endpoint: POST /api/v1/tickets/{id}/buy)
async function handleBookingSubmit(e) {
    e.preventDefault();
    detailsAlert.classList.add("hidden");

    const token = localStorage.getItem("accessToken");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    if (customFormStructure) {
        openCustomFormModal();
        return;
    }

    const price = eventDetails.ticketPrice || 0;

    // Screenshot validation for paid event
    if (price > 0) {
        if (!screenshotInput.files || screenshotInput.files.length === 0) {
            showAlert("error", "Please upload your payment transaction screenshot before booking.");
            screenshotInput.parentElement.classList.add("border-danger");
            return;
        }
        screenshotInput.parentElement.classList.remove("border-danger");
    }

    // Disable button to prevent double clicks
    bookingBtn.disabled = true;
    bookingBtnText.textContent = "Booking ticket...";
    bookingBtn.classList.add("opacity-60", "cursor-not-allowed");

    // Construct FormData
    const formData = new FormData();
    if (price > 0 && screenshotInput.files && screenshotInput.files[0]) {
        formData.append("paymentScreenShot", screenshotInput.files[0]);
    }

    try {
        const res = await fetch(`${API_TICKETS}/${eventId}/buy`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const body = await res.json();

        if (res.ok && body.success) {
            showAlert("success", "Ticket booked successfully! Redirecting...");
            setTimeout(() => {
                window.location.href = "/tickets";
            }, 1500);
        } else {
            showAlert("error", body.message || "Failed to book ticket. Please try again.");
            bookingBtn.disabled = false;
            bookingBtnText.textContent = "Book Ticket";
            bookingBtn.classList.remove("opacity-60", "cursor-not-allowed");
        }
    } catch (err) {
        console.error("Booking submit error:", err);
        showAlert("error", "Network error purchasing ticket. Check server connectivity.");
        bookingBtn.disabled = false;
        bookingBtnText.textContent = "Book Ticket";
        bookingBtn.classList.remove("opacity-60", "cursor-not-allowed");
    }
}

// ----------------------------------------------------
// CAMPUS FORM REGISTRATION MODAL RENDERING & SUBMISSION
// ----------------------------------------------------
function openCustomFormModal() {
    if (!customFormStructure) return;

    // Set Title & Desc
    document.getElementById("custom-form-title").textContent = eventDetails.title + " Registration";
    document.getElementById("custom-form-desc").textContent = eventDetails.description || "Fill out the registration details below.";

    // Render Fields
    customFormFieldsContainer.innerHTML = "";
    customFormStructure.fields.forEach(field => {
        const fieldCard = document.createElement("div");
        fieldCard.className = "space-y-1 pb-3 border-b border-line/40";

        const labelHtml = `<label class="text-xs font-bold text-ink uppercase tracking-wide eyebrow flex items-center gap-1">
            <span>${field.label}</span>
            ${field.required ? '<span class="text-danger">*</span>' : ''}
        </label>`;

        let inputHtml = "";

        if (field.fieldType === "SHORT_ANSWER") {
            inputHtml = `<input type="text" data-field-id="${field.id}" data-type="SHORT_ANSWER" ${field.required ? 'required' : ''} placeholder="Your answer"
                               class="w-full bg-canvas-sunk border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-action focus:ring-action transition-all" />`;
        } else if (field.fieldType === "PARAGRAPH") {
            inputHtml = `<textarea data-field-id="${field.id}" data-type="PARAGRAPH" ${field.required ? 'required' : ''} rows="3" placeholder="Your long answer"
                                  class="w-full bg-canvas-sunk border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-action focus:ring-action transition-all"></textarea>`;
        } else if (field.fieldType === "NUMBER") {
            inputHtml = `<input type="number" data-field-id="${field.id}" data-type="NUMBER" ${field.required ? 'required' : ''} placeholder="Your number answer"
                               class="w-full bg-canvas-sunk border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-action focus:ring-action transition-all" />`;
        } else if (field.fieldType === "EMAIL") {
            inputHtml = `<input type="email" data-field-id="${field.id}" data-type="EMAIL" ${field.required ? 'required' : ''} placeholder="Your email address"
                               class="w-full bg-canvas-sunk border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-action focus:ring-action transition-all" />`;
        } else if (field.fieldType === "PHONE") {
            inputHtml = `<input type="tel" data-field-id="${field.id}" data-type="PHONE" ${field.required ? 'required' : ''} placeholder="e.g. +1234567890"
                               class="w-full bg-canvas-sunk border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-action focus:ring-action transition-all" />`;
        } else if (field.fieldType === "DATE") {
            inputHtml = `<input type="date" data-field-id="${field.id}" data-type="DATE" ${field.required ? 'required' : ''}
                               class="w-full bg-canvas-sunk border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-action focus:ring-action transition-all" />`;
        } else if (field.fieldType === "FILE_UPLOAD") {
            inputHtml = `
                <div class="flex items-center gap-3">
                    <input type="file" data-field-id="${field.id}" data-type="FILE_UPLOAD" accept=".pdf,image/*" ${field.required ? 'required' : ''}
                           class="hidden file-upload-input" id="custom_file_${field.id}" />
                    <label for="custom_file_${field.id}" class="cursor-pointer border border-line bg-canvas-sunk hover:bg-canvas-mid text-ink font-semibold py-1.5 px-3 rounded text-xs transition-all flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">upload</span>
                        <span class="file-label-text">Choose File</span>
                    </label>
                    <span class="text-xs text-muted file-name-display">No file chosen</span>
                </div>
            `;
        } else if (field.fieldType === "DROPDOWN") {
            inputHtml = `
                <select data-field-id="${field.id}" data-type="DROPDOWN" ${field.required ? 'required' : ''}
                        class="w-full bg-canvas-sunk border border-line rounded-lg px-3 py-2 text-xs text-ink focus:border-action focus:ring-action transition-all">
                    <option value="">Select option</option>
                    ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join("")}
                </select>
            `;
        } else if (field.fieldType === "MULTIPLE_CHOICE") {
            inputHtml = `
                <div class="space-y-1.5 pt-1" data-field-id="${field.id}" data-type="MULTIPLE_CHOICE">
                    ${field.options.map((opt, oIdx) => `
                        <label class="flex items-center gap-2 text-xs text-muted hover:text-ink cursor-pointer">
                            <input type="radio" name="mcq_${field.id}" value="${opt}"
                                   class="bg-canvas-sunk border-line text-action focus:ring-action focus:ring-offset-background" />
                            <span>${opt}</span>
                        </label>
                    `).join("")}
                </div>
            `;
        } else if (field.fieldType === "CHECKBOXES") {
            inputHtml = `
                <div class="space-y-1.5 pt-1" data-field-id="${field.id}" data-type="CHECKBOXES">
                    ${field.options.map(opt => `
                        <label class="flex items-center gap-2 text-xs text-muted hover:text-ink cursor-pointer">
                            <input type="checkbox" name="chk_${field.id}" value="${opt}"
                                   class="rounded bg-canvas-sunk border-line text-action focus:ring-action focus:ring-offset-background" />
                            <span>${opt}</span>
                        </label>
                    `).join("")}
                </div>
            `;
        }

        fieldCard.innerHTML = `
            ${labelHtml}
            <div class="mt-1">
                ${inputHtml}
            </div>
            <p class="error-msg text-xs text-danger hidden mt-1"></p>
        `;
        customFormFieldsContainer.appendChild(fieldCard);
    });

    // Handle file labels inside custom form modal
    document.querySelectorAll(".file-upload-input").forEach(input => {
        input.addEventListener("change", (e) => {
            const fileNameDisplay = e.target.parentElement.querySelector(".file-name-display");
            const labelText = e.target.parentElement.querySelector(".file-label-text");
            if (e.target.files && e.target.files.length > 0) {
                const name = e.target.files[0].name;
                fileNameDisplay.textContent = name;
                labelText.textContent = "Change File";
            } else {
                fileNameDisplay.textContent = "No file chosen";
                labelText.textContent = "Choose File";
            }
        });
    });

    // Toggle Payment Section inside custom form modal
    const price = eventDetails.ticketPrice || 0;
    if (price > 0) {
        customFormPaymentSection.classList.remove("hidden");
        customPaymentQrImage.src = eventDetails.paymentQrUrl || "/images/qr-placeholder.png";
    } else {
        customFormPaymentSection.classList.add("hidden");
    }

    // Show modal
    customFormModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
}

function closeCustomFormModal() {
    customFormModal.classList.add("hidden");
    document.body.style.overflow = "";
    customFormAlert.classList.add("hidden");
    customAnswersForm.reset();
}

if (customFormModalClose) customFormModalClose.addEventListener("click", closeCustomFormModal);
if (customFormCancelBtn) customFormCancelBtn.addEventListener("click", closeCustomFormModal);

// Submit Custom Answers
customAnswersForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    customFormAlert.classList.add("hidden");

    // Clear previous errors
    document.querySelectorAll("#custom-form-modal .error-msg").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll("#custom-form-modal input, #custom-form-modal select, #custom-form-modal textarea").forEach(el => el.classList.remove("border-danger"));

    const token = localStorage.getItem("accessToken");
    if (!token) {
        showAlert("error", "Session expired. Please login.");
        closeCustomFormModal();
        return;
    }

    let hasError = false;
    const answersList = [];
    const formData = new FormData();

    // Iterate through fields in structure
    customFormStructure.fields.forEach(field => {
        const fieldId = field.id;
        const type = field.fieldType;
        let value = "";
        let fileKey = "";

        if (type === "SHORT_ANSWER" || type === "PARAGRAPH" || type === "NUMBER" || type === "EMAIL" || type === "PHONE" || type === "DATE") {
            const input = customFormFieldsContainer.querySelector(`[data-field-id="${fieldId}"]`);
            value = input ? input.value.trim() : "";
            if (field.required && !value) {
                showFieldCustomError(input, "This field is required");
                hasError = true;
            }
        } else if (type === "DROPDOWN") {
            const select = customFormFieldsContainer.querySelector(`[data-field-id="${fieldId}"]`);
            value = select ? select.value : "";
            if (field.required && !value) {
                showFieldCustomError(select, "Please select an option");
                hasError = true;
            }
        } else if (type === "MULTIPLE_CHOICE") {
            const checkedRadio = customFormFieldsContainer.querySelector(`input[name="mcq_${fieldId}"]:checked`);
            value = checkedRadio ? checkedRadio.value : "";
            if (field.required && !value) {
                const container = customFormFieldsContainer.querySelector(`[data-field-id="${fieldId}"][data-type="MULTIPLE_CHOICE"]`);
                showFieldCustomError(container, "Please select one option");
                hasError = true;
            }
        } else if (type === "CHECKBOXES") {
            const checkedBoxes = Array.from(customFormFieldsContainer.querySelectorAll(`input[name="chk_${fieldId}"]:checked`));
            const vals = checkedBoxes.map(cb => cb.value);
            value = vals.join(", ");
            if (field.required && vals.length === 0) {
                const container = customFormFieldsContainer.querySelector(`[data-field-id="${fieldId}"][data-type="CHECKBOXES"]`);
                showFieldCustomError(container, "Please check at least one box");
                hasError = true;
            }
        } else if (type === "FILE_UPLOAD") {
            const fileInput = document.getElementById(`custom_file_${fieldId}`);
            const file = fileInput && fileInput.files ? fileInput.files[0] : null;

            if (file) {
                const filename = file.name;
                const ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
                if (ext !== "png" && ext !== "jpg" && ext !== "jpeg" && ext !== "pdf") {
                    showFieldCustomError(fileInput.nextElementSibling, "Only PNG, JPG, JPEG, and PDF files are allowed");
                    hasError = true;
                } else {
                    fileKey = `file_${fieldId}`;
                    formData.append(fileKey, file);
                }
            } else if (field.required) {
                showFieldCustomError(fileInput.nextElementSibling, "Please upload a file");
                hasError = true;
            }
        }

        answersList.push({
            fieldId: fieldId,
            value: value,
            fileKey: fileKey
        });
    });

    // Payment validation if paid
    const price = eventDetails.ticketPrice || 0;
    if (price > 0) {
        const paymentFile = customPaymentScreenshotInput.files[0];
        if (!paymentFile) {
            customPaymentScreenshotInput.classList.add("border-danger");
            showCustomFormAlert("Please upload your payment verification receipt screenshot.");
            return;
        }
        formData.append("paymentScreenShot", paymentFile);
    }

    if (hasError) {
        showCustomFormAlert("Please fix the highlighted field errors.");
        return;
    }

    // Disable submit
    customFormSubmitBtn.disabled = true;
    customFormSubmitText.textContent = "Submitting...";

    // Append JSON metadata answers
    formData.append("answers", JSON.stringify(answersList));

    try {
        const submitId = eventId;
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/submit/${submitId}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const body = await res.json();
        if (res.ok && body.success) {
            showCustomFormAlert("Registration submitted successfully! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "/tickets";
            }, 1500);
        } else {
            showCustomFormAlert(body.message || "Failed to submit registration form. Please try again.");
            customFormSubmitBtn.disabled = false;
            customFormSubmitText.textContent = "Submit Registration";
        }
    } catch (err) {
        console.error("Custom form submit error:", err);
        showCustomFormAlert("A network error occurred. Please check your connectivity and try again.");
        customFormSubmitBtn.disabled = false;
        customFormSubmitText.textContent = "Submit Registration";
    }
});

function showFieldCustomError(el, msg) {
    if (!el) return;
    el.classList.add("border-danger");
    const container = el.closest(".space-y-1");
    if (container) {
        const errEl = container.querySelector(".error-msg");
        if (errEl) {
            errEl.textContent = msg;
            errEl.classList.remove("hidden");
        }
    }
}

function showCustomFormAlert(msg, type = "error") {
    customFormAlert.classList.remove("hidden");
    if (type === "success") {
        customFormAlert.className = "p-3 rounded text-xs font-semibold flex items-start gap-1.5 bg-green-50 border-green-200 text-signal mb-3";
        customFormAlert.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span> <span>${msg}</span>`;
    } else {
        customFormAlert.className = "p-3 rounded text-xs font-semibold flex items-start gap-1.5 bg-red-50 border-red-200 text-danger mb-3";
        customFormAlert.innerHTML = `<span class="material-symbols-outlined text-[16px]">error</span> <span>${msg}</span>`;
    }
}

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);