// create-event.js — handles creating and updating campus events
const API_EVENTS = "/api/v1/events";
const API_AI_GENERATE_DESCRIPTION = "/api/v1/ai/generate-description";

// Initialize variables
let isEditMode = false;
let editEventId = null;
let currentBannerUrl = null;
let currentPaymentQrUrl = null;

// Select form and elements
const form = document.getElementById("event-form");
const alertBox = document.getElementById("alert-box");
const ticketPriceInput = document.getElementById("ticketPrice");
const totalTicketsInput = document.getElementById("totalTickets");
const cancelableInput = document.getElementById("cancelable");
const paymentQrContainer = document.getElementById("payment-qr-container");
const eventModeInput = document.getElementById("eventMode");
const cityInput = document.getElementById("city");
const descriptionInput = document.getElementById("description");

// File input elements
const bannerInput = document.getElementById("banner");
const paymentQrInput = document.getElementById("paymentQr");

const bannerFileName = document.getElementById("banner-file-name");
const paymentQrFileName = document.getElementById("paymentQr-file-name");

const bannerPreviewContainer = document.getElementById("banner-preview-container");
const paymentQrPreviewContainer = document.getElementById("paymentQr-preview-container");

const bannerPreview = document.getElementById("banner-preview");
const paymentQrPreview = document.getElementById("paymentQr-preview");

// AI description generation elements
const generateDescriptionBtn = document.getElementById("generate-description-btn");
const generateDescriptionBtnText = document.getElementById("generate-description-btn-text");
const generateDescriptionHint = document.getElementById("generate-description-hint");

// Helper: Show custom error under input
function showInputError(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add("border-danger");
    inputEl.classList.remove("focus:border-action");
    const errorEl = inputEl.parentElement.querySelector(".error-msg");
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove("hidden");
    }
}

// Helper: Clear custom error
function clearInputErrors() {
    document.querySelectorAll(".error-msg").forEach(el => el.classList.add("hidden"));
    document.querySelectorAll("input, select, textarea").forEach(el => {
        el.classList.remove("border-danger");
        el.classList.add("focus:border-action");
    });
    alertBox.className = "hidden p-4 rounded-lg mb-6 text-xs font-semibold flex items-start gap-2 border";
    alertBox.innerHTML = "";
}

// Helper: Show global alert
function showGlobalAlert(type, message) {
    alertBox.classList.remove("hidden");
    if (type === "success") {
        alertBox.className = "p-4 rounded-lg mb-6 text-xs font-semibold flex items-start gap-2 bg-green-50 border-green-200 text-signal shadow-sm";
        alertBox.innerHTML = `<span class="material-symbols-outlined text-[20px]">check_circle</span> <span>${message}</span>`;
    } else {
        alertBox.className = "p-4 rounded-lg mb-6 text-xs font-semibold flex items-start gap-2 bg-red-50 border-red-200 text-danger shadow-sm";
        alertBox.innerHTML = `<span class="material-symbols-outlined text-[20px]">error</span> <span>${message}</span>`;
    }
    alertBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Grow the description textarea to fit its content instead of scrolling internally
function autoResizeDescription() {
    descriptionInput.style.height = "auto";
    descriptionInput.style.height = descriptionInput.scrollHeight + "px";
}

// Handle conditional Payment QR display
function togglePaymentQr() {
    const price = parseFloat(ticketPriceInput.value || 0);
    if (price > 0) {
        paymentQrContainer.classList.remove("hidden");
    } else {
        paymentQrContainer.classList.add("hidden");
        paymentQrInput.value = "";
        paymentQrFileName.textContent = "Click to upload UPI / Payment QR code";
    }
}

// Enable/disable the "Generate with AI" button based on whether a banner file is selected.
// The backend endpoint takes a MultipartFile, so this only works off a freshly-picked file —
// an existing banner URL from edit mode is not enough on its own.
function updateGenerateDescriptionAvailability() {
    const hasBannerFile = bannerInput.files && bannerInput.files.length > 0;
    generateDescriptionBtn.disabled = !hasBannerFile;
    generateDescriptionHint.textContent = hasBannerFile
        ? "Ready to generate a description from your banner image."
        : "Upload a banner image above to enable AI-generated descriptions.";
}

// Call the AI description generation endpoint using the currently selected banner image
async function handleGenerateDescription() {
    if (!bannerInput.files || bannerInput.files.length === 0) {
        showGlobalAlert("error", "Please upload a banner image before generating a description.");
        return;
    }

    const token = localStorage.getItem("accessToken");
    const originalBtnText = generateDescriptionBtnText.textContent;

    generateDescriptionBtn.disabled = true;
    generateDescriptionBtnText.textContent = "Generating...";

    const formData = new FormData();
    formData.append("bannerImage", bannerInput.files[0]);

    try {
        const res = await fetch(API_AI_GENERATE_DESCRIPTION, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const body = await res.json();

        if (res.ok && body && body.success && body.data && typeof body.data.description === "string") {
            descriptionInput.value = body.data.description;
            autoResizeDescription();
        } else {
            showGlobalAlert("error", body?.message || "Failed to generate a description from the banner image.");
        }
    } catch (err) {
        console.error("handleGenerateDescription error:", err);
        showGlobalAlert("error", "A network error occurred while generating the description.");
    } finally {
        generateDescriptionBtnText.textContent = originalBtnText;
        updateGenerateDescriptionAvailability();
    }
}

// File upload labels listener
function bindFileLabelChange(inputEl, labelEl) {
    inputEl.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            labelEl.textContent = `Selected: ${e.target.files[0].name}`;
            labelEl.classList.remove("text-muted");
            labelEl.classList.add("text-action");
        } else {
            labelEl.textContent = labelEl.id.includes("banner")
                ? "Click to upload banner"
                : "Click to upload UPI / Payment QR code";
            labelEl.classList.add("text-muted");
            labelEl.classList.remove("text-action");
        }
    });
}

// Check authorization and load page state
async function initPage() {
    const user = await getCurrentUser();
    if (!user || (user.systemRole !== "HOD" && user.hostStatus !== "APPROVED")) {
        console.warn("[create-event] Unauthorized access.");
        show404Page("You do not have permission to request events.");
        return;
    }

    // Set user sidebar and details
    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(user);
    }

    // Bind file label events
    bindFileLabelChange(bannerInput, bannerFileName);
    bindFileLabelChange(paymentQrInput, paymentQrFileName);

    // Setup listener on price change
    ticketPriceInput.addEventListener("input", togglePaymentQr);



    // Setup AI description generation
    bannerInput.addEventListener("change", updateGenerateDescriptionAvailability);
    generateDescriptionBtn.addEventListener("click", handleGenerateDescription);
    updateGenerateDescriptionAvailability();

    // Setup description auto-resize (grows with content instead of scrolling)
    descriptionInput.addEventListener("input", autoResizeDescription);
    autoResizeDescription();

    // Check if we are in Edit / Update mode
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get("id");
    if (eventId) {
        isEditMode = true;
        editEventId = eventId;
        document.getElementById("page-action-title").textContent = "Update Event";
        document.getElementById("form-heading").textContent = "Update Event Request";
        document.getElementById("submit-btn-text").textContent = "Update Event";

        // Remove required asterisk on banner upload (optional in edit mode)
        document.getElementById("banner-required-star").classList.add("hidden");

        await loadEventDetails(eventId);
    } else {
        // Set default date values (today for registration deadline, tomorrow for event date)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById("eventDate").value = tomorrow.toISOString().split("T")[0];
        document.getElementById("lastRegistrationDate").value = tomorrow.toISOString().split("T")[0];
        document.getElementById("eventTime").value = "09:00";
    }

    // Form submit listener
    if (form) {
        form.addEventListener("submit", handleFormSubmit);
    }
}

// Fetch event details for edit mode (Using correct endpoint: GET /api/v1/events/{id})
async function loadEventDetails(eventId) {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_EVENTS}/${eventId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const body = await res.json();
        if (res.ok && body.success) {
            populateForm(body.data);
        } else {
            showGlobalAlert("error", body.message || "Failed to load event specifications for editing.");
        }
    } catch (err) {
        console.error("loadEventDetails error:", err);
        showGlobalAlert("error", "Failed to retrieve event information due to a connectivity issue.");
    }
}

// Populate fields in edit mode
function populateForm(event) {
    document.getElementById("title").value = event.title || "";
    document.getElementById("description").value = event.description || "";
    autoResizeDescription();
    document.getElementById("category").value = event.category || "";
    document.getElementById("club").value = event.club || "";
    document.getElementById("eventDate").value = event.eventDate || "";

    if (event.eventTime) {
        // format hh:mm
        document.getElementById("eventTime").value = event.eventTime.substring(0, 5);
    }

    document.getElementById("lastRegistrationDate").value = event.lastRegisterDate || "";
    document.getElementById("eventMode").value = event.eventMode || "OFFLINE";
    document.getElementById("city").value = event.city || "";
    document.getElementById("location").value = event.location || "";
    document.getElementById("participationType").value = event.participationType || "UNIVERSITY_ONLY";

    ticketPriceInput.value = event.ticketPrice || 0;
    totalTicketsInput.value = event.totalTickets || 0;
    cancelableInput.checked = !!event.cancelable;

    // Show image previews
    if (event.bannerUrl) {
        currentBannerUrl = event.bannerUrl;
        bannerPreview.src = event.bannerUrl;
        bannerPreviewContainer.classList.remove("hidden");
        bannerFileName.textContent = "Change banner artwork";
    }
    if (event.ticketPrice > 0 && event.paymentQrUrl) {
        currentPaymentQrUrl = event.paymentQrUrl;
        paymentQrPreview.src = event.paymentQrUrl;
        paymentQrPreviewContainer.classList.remove("hidden");
        paymentQrFileName.textContent = "Change UPI payment QR code";
    }

    togglePaymentQr();
}

// Form validation
function validateForm() {
    let isValid = true;
    clearInputErrors();

    const title = document.getElementById("title").value.trim();
    const eventDateStr = document.getElementById("eventDate").value;
    const eventTimeStr = document.getElementById("eventTime").value;
    const lastRegDateStr = document.getElementById("lastRegistrationDate").value;
    const city = cityInput.value.trim();
    const location = document.getElementById("location").value.trim();
    const ticketPrice = parseFloat(ticketPriceInput.value || 0);
    const totalTickets = parseInt(totalTicketsInput.value || 0, 10);

    if (!title) {
        showInputError(document.getElementById("title"), "Event title is required.");
        isValid = false;
    }
    if (!eventDateStr) {
        showInputError(document.getElementById("eventDate"), "Event date is required.");
        isValid = false;
    }
    if (!eventTimeStr) {
        showInputError(document.getElementById("eventTime"), "Event start time is required.");
        isValid = false;
    }
    if (!lastRegDateStr) {
        showInputError(document.getElementById("lastRegistrationDate"), "Registration deadline is required.");
        isValid = false;
    }
    if (!city) {
        showInputError(cityInput, "City / Campus location is required.");
        isValid = false;
    }
    if (!location) {
        showInputError(document.getElementById("location"), "Venue location or join link is required.");
        isValid = false;
    }
    if (isNaN(ticketPrice) || ticketPrice < 0) {
        showInputError(ticketPriceInput, "Ticket price must be a valid number of 0 or greater.");
        isValid = false;
    }
    if (isNaN(totalTickets) || totalTickets < 1) {
        showInputError(totalTicketsInput, "Total tickets capacity must be at least 1.");
        isValid = false;
    }


    // Dates integrity checks
    if (eventDateStr && lastRegDateStr) {
        const eventDate = new Date(eventDateStr);
        const lastRegDate = new Date(lastRegDateStr);
        if (lastRegDate > eventDate) {
            showInputError(document.getElementById("lastRegistrationDate"), "Registration deadline must be on or before the event date.");
            isValid = false;
        }
    }

    // Files requirement checks in creation mode
    if (!isEditMode) {
        if (!bannerInput.files || bannerInput.files.length === 0) {
            showInputError(bannerInput.parentElement, "Event banner artwork is required.");
            isValid = false;
        }
        if (ticketPrice > 0 && (!paymentQrInput.files || paymentQrInput.files.length === 0)) {
            showInputError(paymentQrInput.parentElement, "UPI payment QR code is required for paid events.");
            isValid = false;
        }
    }

    return isValid;
}

// Handle Form Submission (Using correct endpoints: POST /api/v1/events or PATCH /api/v1/events/{id})
async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        showGlobalAlert("error", "Please fix all the validation errors highlighted above.");
        return;
    }

    const token = localStorage.getItem("accessToken");
    const submitBtn = document.getElementById("submit-btn");

    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-60", "cursor-not-allowed");

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const category = document.getElementById("category").value;
    const club = document.getElementById("club").value.trim();
    const eventDate = document.getElementById("eventDate").value;
    const eventTime = document.getElementById("eventTime").value;
    const lastRegistrationDate = document.getElementById("lastRegistrationDate").value;
    const eventMode = document.getElementById("eventMode").value;
    const city = cityInput.value.trim();
    const location = document.getElementById("location").value.trim();
    const participationType = document.getElementById("participationType").value;
    const ticketPrice = parseFloat(ticketPriceInput.value || 0);
    const totalTickets = parseInt(totalTicketsInput.value || 0, 10);


    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("club", club);
    formData.append("eventDate", eventDate);
    formData.append("eventTime", eventTime + ":00"); // Backend expects HH:mm:ss format
    formData.append("lastRegistrationDate", lastRegistrationDate);
    formData.append("location", location);
    formData.append("city", city);
    formData.append("participationType", participationType);
    formData.append("ticketPrice", ticketPrice);
    formData.append("totalTickets", totalTickets);
    formData.append("cancelable", cancelableInput.checked);
    formData.append("eventMode", eventMode);

    // Append files
    if (bannerInput.files && bannerInput.files[0]) {
        formData.append("banner", bannerInput.files[0]);
    }
    if (paymentQrInput.files && paymentQrInput.files[0]) {
        formData.append("paymentQr", paymentQrInput.files[0]);
    }

    try {
        let url = API_EVENTS;
        let method = "POST";

        if (isEditMode) {
            url = `${API_EVENTS}/${editEventId}`;
            method = "PATCH";
        }

        const res = await fetch(url, {
            method: method,
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const body = await res.json();

        if (res.ok && body.success) {
            showGlobalAlert("success", isEditMode
                ? "Event updated successfully! Redirecting..."
                : "Event request submitted successfully! Redirecting...");
            setTimeout(() => {
                window.location.href = "/event-management";
            }, 1500);
        } else {
            showGlobalAlert("error", body.message || "An error occurred during submission.");
            submitBtn.disabled = false;
            submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
        }
    } catch (err) {
        console.error("Submission error:", err);
        showGlobalAlert("error", "A network error occurred. Please try again.");
        submitBtn.disabled = false;
        submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
    }
}

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);