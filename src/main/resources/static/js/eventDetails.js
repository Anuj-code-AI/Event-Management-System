// eventDetails.js — handles loading event details and buying tickets
const API_EVENT = "/api/v1/event";
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
    return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

// Helper: Format Time
function formatTime(timeStr) {
    if (!timeStr) return "N/A";
    const [hours, minutes] = timeStr.split(":");
    const hr = parseInt(hours);
    const ampm = hr >= 12 ? "PM" : "AM";
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${minutes} ${ampm}`;
}

// Helper: Alert Display
function showAlert(type, message) {
    detailsAlert.classList.remove("hidden");
    if (type === "success") {
        detailsAlert.className = "p-sm rounded text-label-md font-medium flex items-start gap-xs bg-primary/10 border border-primary/20 text-primary";
        detailsAlert.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span> <span>${message}</span>`;
    } else {
        detailsAlert.className = "p-sm rounded text-label-md font-medium flex items-start gap-xs bg-error/10 border border-error/20 text-error";
        detailsAlert.innerHTML = `<span class="material-symbols-outlined text-[16px]">error</span> <span>${message}</span>`;
    }
}

// ---------------------------------------------------------------------
// Banner lightbox: click the banner (or press Enter/Space on it, since
// it's a real <button>) to see the full, uncropped image. object-cover
// on the inline banner already crops it to fill the box, so without this
// there was no way to see the full frame at all.
// ---------------------------------------------------------------------
function openBannerLightbox() {
    if (!eventBanner.src) return; // nothing loaded yet, nothing to show
    bannerLightboxImg.src = eventBanner.src;
    bannerLightbox.dataset.open = "true";
    document.body.style.overflow = "hidden"; // stop background scroll while open
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
    // Click on the dark backdrop (not the image itself) also closes it
    bannerLightbox.addEventListener("click", (e) => {
        if (e.target === bannerLightbox) closeBannerLightbox();
    });
}
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && bannerLightbox.dataset.open === "true") {
        closeBannerLightbox();
    }
});

// Check session, parse ID and initialize
async function initPage() {
    const user = await getCurrentUser();

    // Sidebar render
    if (user && typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(user);
    }

    // Extract eventId from URL path (e.g. /eventDetails/123 -> 123)
    const segments = window.location.pathname.split("/");
    eventId = segments.pop();

    if (!eventId || isNaN(parseInt(eventId))) {
        showLoading(false);
        contentSection.classList.add("hidden");
        errorBlock.classList.remove("hidden");
        return;
    }

    // Load specifications
    await loadEventDetails(eventId);

    // Bind file upload input name change
    if (screenshotInput) {
        screenshotInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                screenshotLabel.textContent = `Attached: ${e.target.files[0].name}`;
                screenshotLabel.classList.remove("text-on-surface-variant");
                screenshotLabel.classList.add("text-primary");
            } else {
                screenshotLabel.textContent = "Click to attach receipt";
                screenshotLabel.classList.add("text-on-surface-variant");
                screenshotLabel.classList.remove("text-primary");
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

// Fetch custom form structure if exists
async function loadCustomFormStructure(id) {
    customFormStructure = null;
}

// Fetch event detail specs
async function loadEventDetails(id) {
    showLoading(true);
    const token = localStorage.getItem("accessToken");

    try {
        const res = await fetch(`${API_EVENT}/getEvent/${id}`, {
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

    let statusClass = "bg-surface-container text-on-surface-variant border border-outline-variant";
    if (event.eventStatus === "PENDING") statusClass = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30";
    else if (event.eventStatus === "APPROVED") statusClass = "bg-primary/10 text-primary border border-primary/30";
    else if (event.eventStatus === "REJECTED") statusClass = "bg-error/10 text-error border border-error/30";
    else if (event.eventStatus === "CANCELLED") statusClass = "bg-surface-container-high text-outline border border-outline-variant";
    else if (event.eventStatus === "FINISHED") statusClass = "bg-blue-500/10 text-blue-500 border border-blue-500/30";
    statusBadge.className = `${statusClass} text-label-md px-sm py-xs rounded-full font-semibold uppercase`;

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
        closedReason = "Moderation Required (Pending)";
    } else if (available <= 0) {
        isClosed = true;
        closedReason = "Sold Out";
    } else if (deadlineDate < today) {
        isClosed = true;
        closedReason = "Registration Closed";
    }

    if (isClosed) {
        bookingBtn.disabled = true;
        bookingBtn.classList.remove("bg-primary", "hover:bg-primary-fixed", "shadow-primary/20");
        bookingBtn.classList.add("bg-surface-container-high", "text-outline", "cursor-not-allowed", "opacity-60");
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

// Handle Ticket booking submission
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
            screenshotInput.parentElement.classList.add("border-error");
            return;
        }
        screenshotInput.parentElement.classList.remove("border-error");
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
        const res = await fetch(`${API_TICKETS}/buy/${eventId}`, {
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
// CUSTOM FORM REGISTRATION RENDERING & SUBMISSION
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
        fieldCard.className = "space-y-xs p-xs border-b border-outline-variant/10 pb-sm";

        const labelHtml = `<label class="text-body-sm font-semibold text-on-surface flex items-center gap-xs">
            <span>${field.label}</span>
            ${field.required ? '<span class="text-error">*</span>' : ''}
        </label>`;

        let inputHtml = "";

        if (field.fieldType === "SHORT_ANSWER") {
            inputHtml = `<input type="text" data-field-id="${field.id}" data-type="SHORT_ANSWER" ${field.required ? 'required' : ''} placeholder="Your answer"
                               class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors" />`;
        } else if (field.fieldType === "PARAGRAPH") {
            inputHtml = `<textarea data-field-id="${field.id}" data-type="PARAGRAPH" ${field.required ? 'required' : ''} rows="3" placeholder="Your long answer"
                                  class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors"></textarea>`;
        } else if (field.fieldType === "NUMBER") {
            inputHtml = `<input type="number" data-field-id="${field.id}" data-type="NUMBER" ${field.required ? 'required' : ''} placeholder="Your number answer"
                               class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors" />`;
        } else if (field.fieldType === "EMAIL") {
            inputHtml = `<input type="email" data-field-id="${field.id}" data-type="EMAIL" ${field.required ? 'required' : ''} placeholder="Your email address"
                               class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors" />`;
        } else if (field.fieldType === "PHONE") {
            inputHtml = `<input type="tel" data-field-id="${field.id}" data-type="PHONE" ${field.required ? 'required' : ''} placeholder="e.g. +1234567890"
                               class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors" />`;
        } else if (field.fieldType === "DATE") {
            inputHtml = `<input type="date" data-field-id="${field.id}" data-type="DATE" ${field.required ? 'required' : ''}
                               class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors" />`;
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
                        class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none transition-colors">
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
            <p class="error-msg text-label-md text-error hidden"></p>
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
    document.querySelectorAll("#custom-form-modal input, #custom-form-modal select, #custom-form-modal textarea").forEach(el => el.classList.remove("border-error"));

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
            customPaymentScreenshotInput.classList.add("border-error");
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
        const submitId = isStandaloneForm ? standaloneFormId : eventId;
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
    el.classList.add("border-error");
    const container = el.closest(".space-y-xs");
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
        customFormAlert.className = "p-sm rounded text-label-md font-medium flex items-start gap-xs bg-primary/10 border border-primary/20 text-primary mb-md";
        customFormAlert.innerHTML = `<span class="material-symbols-outlined text-[16px]">check_circle</span> <span>${msg}</span>`;
    } else {
        customFormAlert.className = "p-sm rounded text-label-md font-medium flex items-start gap-xs bg-error/10 border border-error/20 text-error mb-md";
        customFormAlert.innerHTML = `<span class="material-symbols-outlined text-[16px]">error</span> <span>${msg}</span>`;
    }
}

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);