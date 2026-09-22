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

    if (!eventId ) {
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

        if (res.status === 401) {
            showLoading(false);
            showLoginRequiredPage("Please login to register for this event.");
            return;
        }

        const body = await res.json();

        if (res.ok && body.success) {
            eventDetails = body.data;

            // Access control check for unapproved events
            if (eventDetails.eventStatus !== "APPROVED") {
                const currentUser = await getCurrentUser();
                const isAdmin = currentUser && (currentUser.systemRole === "SUPER_ADMIN");
                const isHOD = currentUser && (currentUser.systemRole === "HOD");
                const isHost = currentUser && eventDetails.organizer && (currentUser.id === eventDetails.organizer.userId);

                if (!isAdmin && !isHOD && !isHost) {
                    showLoading(false);
                    show404Page("The event you are looking for has not been approved, or you do not have permission to view it.");
                    return;
                }
            }

            populateEventDetails(eventDetails);
            showLoading(false);
        } else {
            throw new Error(body.message || "Failed to load event details");
        }
    } catch (err) {
        console.error("loadEventDetails error:", err);
        showLoading(false);

        // Double check if it's a JSON parse error caused by HTML/text response from unauthenticated / expired token
        if (err.message && (err.message.includes("Unexpected token") || err.message.includes("JSON") || err.message.includes("Unexpected end"))) {
            showLoginRequiredPage("Please login to register for this event.");
            return;
        }

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
            triggerPartyBombCelebration(() => {
                window.location.href = "/tickets";
            });
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
            closeCustomFormModal();
            triggerPartyBombCelebration(() => {
                window.location.href = "/tickets";
            });
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

// ----------------------------------------------------
// PARTY BOMB CELEBRATION & SCREEN SMASH ANIMATION
// ----------------------------------------------------
function triggerPartyBombCelebration(onComplete) {
    if (document.getElementById("party-bomb-overlay")) {
        if (typeof onComplete === "function") onComplete();
        return;
    }

    // 1. Inject animation styles
    const styleEl = document.createElement("style");
    styleEl.id = "party-bomb-styles";
    styleEl.textContent = `
        @keyframes partyScreenShake {
            0% { transform: translate(0, 0) rotate(0deg); }
            10% { transform: translate(-14px, -10px) rotate(-1.5deg); }
            20% { transform: translate(14px, 10px) rotate(1.5deg); }
            30% { transform: translate(-12px, 8px) rotate(-1deg); }
            40% { transform: translate(12px, -8px) rotate(1deg); }
            50% { transform: translate(-8px, -4px) rotate(-0.5deg); }
            60% { transform: translate(8px, 4px) rotate(0.5deg); }
            70% { transform: translate(-4px, 2px) rotate(0deg); }
            85% { transform: translate(2px, -1px) rotate(0deg); }
            100% { transform: translate(0, 0) rotate(0deg); }
        }
        .party-screen-shaking {
            animation: partyScreenShake 0.75s cubic-bezier(0.36, 0.07, 0.19, 0.97) both !important;
        }
        .party-smash-wipe {
            transition: transform 0.75s cubic-bezier(0.16, 1, 0.3, 1), filter 0.75s ease, opacity 0.75s ease !important;
            transform: scale(1.08) translateY(24px) !important;
            filter: blur(14px) brightness(1.8) contrast(1.2) !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        @keyframes partyCardPop {
            0% { transform: translate(-50%, -50%) scale(0.25) rotate(-10deg); opacity: 0; filter: drop-shadow(0 0 0 rgba(255,215,0,0)); }
            50% { transform: translate(-50%, -50%) scale(1.06) rotate(1.5deg); opacity: 1; filter: drop-shadow(0 0 50px rgba(255,215,0,0.6)); }
            70% { transform: translate(-50%, -50%) scale(0.97) rotate(-1deg); }
            100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 20px 50px rgba(0,0,0,0.55)); }
        }
        @keyframes partyBadgePulse {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(36, 80, 232, 0.5)); }
            50% { transform: scale(1.1); filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.85)); }
        }
        @keyframes partyProgressFill {
            0% { width: 0%; }
            100% { width: 100%; }
        }
        @keyframes partySpin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(styleEl);

    // 2. Create fullscreen overlay
    const overlay = document.createElement("div");
    overlay.id = "party-bomb-overlay";
    overlay.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:999999;pointer-events:auto;overflow:hidden;background:rgba(11,21,38,0);transition:background 0.45s ease;";
    document.body.appendChild(overlay);

    // 3. Create canvas for bombs, shockwaves, and confetti
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
    overlay.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // 4. Synthesized Audio (Web Audio API)
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const actx = new AudioContext();
            // Launch whistle
            const oscL = actx.createOscillator();
            const gainL = actx.createGain();
            oscL.type = "sine";
            oscL.frequency.setValueAtTime(220, actx.currentTime);
            oscL.frequency.exponentialRampToValueAtTime(880, actx.currentTime + 0.42);
            gainL.gain.setValueAtTime(0.06, actx.currentTime);
            gainL.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.44);
            oscL.connect(gainL);
            gainL.connect(actx.destination);
            oscL.start();
            oscL.stop(actx.currentTime + 0.45);

            // Blast boom at 440ms
            setTimeout(() => {
                try {
                    const oscB = actx.createOscillator();
                    const gainB = actx.createGain();
                    oscB.type = "triangle";
                    oscB.frequency.setValueAtTime(150, actx.currentTime);
                    oscB.frequency.exponentialRampToValueAtTime(35, actx.currentTime + 0.55);
                    gainB.gain.setValueAtTime(0.3, actx.currentTime);
                    gainB.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.58);
                    oscB.connect(gainB);
                    gainB.connect(actx.destination);
                    oscB.start();
                    oscB.stop(actx.currentTime + 0.6);

                    // Happy fanfare chime
                    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                        const o = actx.createOscillator();
                        const g = actx.createGain();
                        o.type = "sine";
                        o.frequency.setValueAtTime(freq, actx.currentTime + idx * 0.08);
                        g.gain.setValueAtTime(0.1, actx.currentTime + idx * 0.08);
                        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + idx * 0.08 + 0.5);
                        o.connect(g);
                        g.connect(actx.destination);
                        o.start(actx.currentTime + idx * 0.08);
                        o.stop(actx.currentTime + idx * 0.08 + 0.55);
                    });
                } catch(e) {}
            }, 440);
        }
    } catch (e) {}

    // Target center for the smash
    const targetX = W * 0.5;
    const targetY = H * 0.45;

    // 3 Bomb trajectories (Left, Right, Bottom-Center)
    const bombs = [
        {
            startX: -40, startY: H * 0.9,
            ctrlX: W * 0.2, ctrlY: H * 0.15,
            endX: targetX, endY: targetY,
            color: "#FF1361",
            emoji: "💣"
        },
        {
            startX: W + 40, startY: H * 0.9,
            ctrlX: W * 0.8, ctrlY: H * 0.15,
            endX: targetX, endY: targetY,
            color: "#00F0FF",
            emoji: "💣"
        },
        {
            startX: targetX, startY: H + 50,
            ctrlX: targetX, ctrlY: H * 0.7,
            endX: targetX, endY: targetY,
            color: "#FFD700",
            emoji: "🎉"
        }
    ];

    const trailSparks = [];
    const confettiParticles = [];
    const shockwaves = [];
    const shatterLines = [];

    const startTime = performance.now();
    const launchDuration = 440; // ms
    let exploded = false;

    // Confetti palette
    const colors = ["#FF1493", "#00FFFF", "#FFD700", "#FF4500", "#7B2CBF", "#00FF88", "#FF0055", "#FFFFFF", "#38B2AC"];

    function explode() {
        exploded = true;
        overlay.style.background = "rgba(11, 21, 38, 0.78)";

        // Screen shake
        document.body.classList.add("party-screen-shaking");
        setTimeout(() => document.body.classList.remove("party-screen-shaking"), 800);

        // Smash and remove everything in the background with the bomb effect
        const contentTargets = [
            document.getElementById("details-content-section"),
            document.querySelector("main"),
            document.querySelector("header"),
            document.querySelector("footer"),
            document.getElementById("sidebar")
        ];
        contentTargets.forEach(el => {
            if (el) el.classList.add("party-smash-wipe");
        });

        // Create expanding shockwave rings
        shockwaves.push(
            { x: targetX, y: targetY, r: 10, maxR: Math.max(W, H) * 0.95, lw: 24, color: "rgba(255, 230, 0, 0.95)", speed: 38 },
            { x: targetX, y: targetY, r: 5, maxR: Math.max(W, H) * 0.8, lw: 16, color: "rgba(0, 240, 255, 0.88)", speed: 28 },
            { x: targetX, y: targetY, r: 0, maxR: Math.max(W, H) * 0.65, lw: 12, color: "rgba(255, 20, 147, 0.82)", speed: 22 }
        );

        // Screen shatter crack rays
        for (let i = 0; i < 22; i++) {
            const angle = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
            const length = Math.random() * (Math.max(W, H) * 0.65) + 140;
            shatterLines.push({
                x1: targetX,
                y1: targetY,
                x2: targetX + Math.cos(angle) * length,
                y2: targetY + Math.sin(angle) * length,
                alpha: 1,
                color: i % 2 === 0 ? "#FFD700" : "#00FFFF"
            });
        }

        // 380+ Confetti and party blast particles
        for (let i = 0; i < 380; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 24 + 6;
            const size = Math.random() * 12 + 6;
            const shapes = ["rect", "circle", "star", "ribbon"];
            confettiParticles.push({
                x: targetX + (Math.random() - 0.5) * 30,
                y: targetY + (Math.random() - 0.5) * 30,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - Math.random() * 7,
                size: size,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 16,
                tilt: Math.random() * 10,
                tiltAngle: Math.random() * Math.PI,
                tiltSpeed: Math.random() * 0.12 + 0.05,
                drag: Math.random() * 0.02 + 0.965,
                gravity: 0.28,
                alpha: 1
            });
        }

        // Render Celebration Card in the blast center
        const card = document.createElement("div");
        card.id = "party-celebration-card";
        card.style.cssText = `
            position: absolute;
            left: 50%;
            top: 45%;
            transform: translate(-50%, -50%);
            background: rgba(15, 23, 42, 0.9);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 2px solid rgba(255, 215, 0, 0.6);
            box-shadow: 0 25px 70px rgba(0, 0, 0, 0.7), 0 0 50px rgba(255, 215, 0, 0.4);
            border-radius: 24px;
            padding: 34px 44px;
            text-align: center;
            max-width: 90vw;
            width: 440px;
            animation: partyCardPop 0.65s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            pointer-events: auto;
            color: #fff;
        `;

        const titleText = eventDetails && eventDetails.title ? eventDetails.title : "Event";

        card.innerHTML = `
            <div style="font-size: 54px; line-height: 1; margin-bottom: 12px; animation: partyBadgePulse 1.4s ease-in-out infinite;">🎉 💥 🎟️</div>
            <div style="font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #FFD700 0%, #FF3366 50%, #00F0FF 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.5px; text-transform: uppercase;">
                Ticket Confirmed!
            </div>
            <div style="margin-top: 6px; font-size: 13px; color: #94A3B8; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 360px; margin-left: auto; margin-right: auto;">
                ${titleText}
            </div>
            <p style="margin-top: 10px; font-size: 13px; color: rgba(255,255,255,0.9); line-height: 1.5;">
                Your pass has been generated! Get ready for an unforgettable campus experience.
            </p>
            <div style="margin-top: 22px; display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.22); border-radius: 999px; padding: 7px 20px; font-size: 12px; font-weight: 600; color: #E2E8F0;">
                <span class="material-symbols-outlined" style="font-size: 16px; animation: partySpin 1.2s linear infinite;">sync</span>
                <span>Opening your ticket pass...</span>
            </div>
            <div style="margin-top: 16px; width: 100%; height: 4px; background: rgba(255,255,255,0.12); border-radius: 99px; overflow: hidden;">
                <div style="height: 100%; background: linear-gradient(90deg, #FFD700, #FF1493, #00FFFF); border-radius: 99px; animation: partyProgressFill 1.8s ease-in-out forwards;"></div>
            </div>
        `;
        overlay.appendChild(card);
    }

    // Animation Loop
    function frame(now) {
        const elapsed = now - startTime;
        ctx.clearRect(0, 0, W, H);

        // Phase 1: Rockets flying in from sides and bottom
        if (elapsed < launchDuration) {
            const p = elapsed / launchDuration;
            const easeP = p * p * (3 - 2 * p); // smoothstep curve

            bombs.forEach(bomb => {
                // Quadratic Bezier interpolation
                const oneMinusT = 1 - easeP;
                const bx = oneMinusT * oneMinusT * bomb.startX + 2 * oneMinusT * easeP * bomb.ctrlX + easeP * easeP * bomb.endX;
                const by = oneMinusT * oneMinusT * bomb.startY + 2 * oneMinusT * easeP * bomb.ctrlY + easeP * easeP * bomb.endY;

                // Spawn sparkling trail
                for (let k = 0; k < 5; k++) {
                    trailSparks.push({
                        x: bx + (Math.random() - 0.5) * 12,
                        y: by + (Math.random() - 0.5) * 12,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3 + 2,
                        size: Math.random() * 4 + 2,
                        color: Math.random() > 0.4 ? bomb.color : "#FFD700",
                        alpha: 1
                    });
                }

                // Draw Bomb Head / Glowing Sphere
                ctx.save();
                ctx.shadowColor = bomb.color;
                ctx.shadowBlur = 24;

                // Bomb circle body
                ctx.beginPath();
                ctx.arc(bx, by, 18, 0, Math.PI * 2);
                ctx.fillStyle = "#1E293B";
                ctx.fill();
                ctx.lineWidth = 3;
                ctx.strokeStyle = bomb.color;
                ctx.stroke();

                // Fuse spark
                ctx.beginPath();
                ctx.arc(bx + 12, by - 12, 6, 0, Math.PI * 2);
                ctx.fillStyle = "#FFDD00";
                ctx.shadowColor = "#FFDD00";
                ctx.shadowBlur = 18;
                ctx.fill();

                // Emoji badge
                ctx.font = "18px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(bomb.emoji, bx, by);
                ctx.restore();
            });
        } else if (!exploded) {
            explode();
        }

        // Update & Render Trail Sparks
        for (let i = trailSparks.length - 1; i >= 0; i--) {
            const s = trailSparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.alpha -= 0.035;
            if (s.alpha <= 0) {
                trailSparks.splice(i, 1);
                continue;
            }
            ctx.save();
            ctx.globalAlpha = s.alpha;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Phase 2: Shockwaves
        if (exploded) {
            for (let i = shockwaves.length - 1; i >= 0; i--) {
                const sw = shockwaves[i];
                sw.r += sw.speed;
                sw.lw *= 0.94;
                if (sw.r >= sw.maxR || sw.lw < 0.5) {
                    shockwaves.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.beginPath();
                ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
                ctx.strokeStyle = sw.color;
                ctx.lineWidth = sw.lw;
                ctx.shadowColor = sw.color;
                ctx.shadowBlur = 20;
                ctx.stroke();
                ctx.restore();
            }

            // Shatter Crack Lines
            for (let i = shatterLines.length - 1; i >= 0; i--) {
                const line = shatterLines[i];
                line.alpha -= 0.03;
                if (line.alpha <= 0) {
                    shatterLines.splice(i, 1);
                    continue;
                }
                ctx.save();
                ctx.globalAlpha = line.alpha;
                ctx.strokeStyle = line.color;
                ctx.lineWidth = 3;
                ctx.shadowColor = line.color;
                ctx.shadowBlur = 14;
                ctx.beginPath();
                ctx.moveTo(line.x1, line.y1);
                ctx.lineTo(line.x2, line.y2);
                ctx.stroke();
                ctx.restore();
            }

            // Confetti Particles
            for (let i = confettiParticles.length - 1; i >= 0; i--) {
                const p = confettiParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= p.drag;
                p.vy = p.vy * p.drag + p.gravity;
                p.rotation += p.rotSpeed;
                p.tiltAngle += p.tiltSpeed;
                p.x += Math.sin(p.tiltAngle) * 1.4; // festive flutter sway

                if (elapsed > 1600) {
                    p.alpha -= 0.015;
                }

                if (p.y > H + 40 || p.alpha <= 0) {
                    confettiParticles.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                const tilt = Math.cos(p.tiltAngle);

                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 6;

                if (p.shape === "circle") {
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.size / 2, (p.size / 2) * Math.abs(tilt), 0, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.shape === "star") {
                    ctx.beginPath();
                    for (let s = 0; s < 5; s++) {
                        ctx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * p.size, -Math.sin(((18 + s * 72) * Math.PI) / 180) * p.size * Math.abs(tilt));
                        ctx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * (p.size / 2), -Math.sin(((54 + s * 72) * Math.PI) / 180) * (p.size / 2) * Math.abs(tilt));
                    }
                    ctx.closePath();
                    ctx.fill();
                } else {
                    // Ribbon / rectangle strip with 3D tilt
                    ctx.fillRect(-p.size / 2, (-p.size / 2) * tilt, p.size, (p.size * 0.5) * Math.abs(tilt));
                }
                ctx.restore();
            }
        }

        // Phase 3: Final redirect at ~2300ms
        if (elapsed < 2350) {
            requestAnimationFrame(frame);
        } else {
            // Flash wipe out into redirect
            overlay.style.transition = "opacity 0.35s ease";
            overlay.style.opacity = "0";
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (typeof onComplete === "function") {
                    onComplete();
                }
            }, 300);
        }
    }

    requestAnimationFrame(frame);
}

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);