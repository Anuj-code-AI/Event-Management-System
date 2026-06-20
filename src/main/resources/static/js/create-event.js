// create-event.js — handles creating and updating campus events
const API_EVENT_BASE = "/api/v1/event";

// Initialize variables
let isEditMode = false;
let editEventId = null;
let currentBannerUrl = null;
let currentTicketUrl = null;
let currentPaymentQrUrl = null;

// Select form and elements
const form = document.getElementById("event-form");
const alertBox = document.getElementById("alert-box");
const ticketPriceInput = document.getElementById("ticketPrice");
const totalTicketsInput = document.getElementById("totalTickets");
const ticketsAvailableInput = document.getElementById("ticketsAvailable");
const paymentQrContainer = document.getElementById("payment-qr-container");
const eventModeInput = document.getElementById("eventMode");
const cityInput = document.getElementById("city");

// File input elements
const bannerInput = document.getElementById("banner");
const ticketInput = document.getElementById("ticket");
const paymentQrInput = document.getElementById("paymentQr");

const bannerFileName = document.getElementById("banner-file-name");
const ticketFileName = document.getElementById("ticket-file-name");
const paymentQrFileName = document.getElementById("paymentQr-file-name");

const bannerPreviewContainer = document.getElementById("banner-preview-container");
const ticketPreviewContainer = document.getElementById("ticket-preview-container");
const paymentQrPreviewContainer = document.getElementById("paymentQr-preview-container");

const bannerPreview = document.getElementById("banner-preview");
const ticketPreview = document.getElementById("ticket-preview");
const paymentQrPreview = document.getElementById("paymentQr-preview");

// Helper: Show custom error under input
function showInputError(inputEl, message) {
    if (!inputEl) return;
    inputEl.classList.add("border-error");
    inputEl.classList.remove("focus:border-primary");
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
        el.classList.remove("border-error");
        el.classList.add("focus:border-primary");
    });
    alertBox.className = "hidden p-md rounded-lg mb-lg text-body-sm font-medium flex items-start gap-sm";
    alertBox.innerHTML = "";
}

// Helper: Show global alert
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

// File upload labels listener
function bindFileLabelChange(inputEl, labelEl) {
    inputEl.addEventListener("change", (e) => {
        if (e.target.files && e.target.files.length > 0) {
            labelEl.textContent = `Selected: ${e.target.files[0].name}`;
            labelEl.classList.remove("text-on-surface-variant");
            labelEl.classList.add("text-primary");
        } else {
            labelEl.textContent = labelEl.id.includes("banner") 
                ? "Click to upload banner" 
                : labelEl.id.includes("ticket") 
                    ? "Click to upload ticket card design" 
                    : "Click to upload UPI / Payment QR code";
            labelEl.classList.add("text-on-surface-variant");
            labelEl.classList.remove("text-primary");
        }
    });
}

// Check authorization and load page state
async function initPage() {
    const user = await getCurrentUser();
    if (!user || (user.systemRole !== "HOD" && user.hostStatus !== "APPROVED")) {
        console.warn("[create-event] Unauthorized access. Redirecting to home...");
        window.location.href = "/home";
        return;
    }

    // Set user sidebar and details
    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(user);
    }

    // Bind file label events
    bindFileLabelChange(bannerInput, bannerFileName);
    bindFileLabelChange(ticketInput, ticketFileName);
    bindFileLabelChange(paymentQrInput, paymentQrFileName);

    // Setup listener on price change
    ticketPriceInput.addEventListener("input", togglePaymentQr);

    // Setup capacity listeners (match ticketsAvailable to totalTickets when creating)
    totalTicketsInput.addEventListener("input", () => {
        if (!isEditMode) {
            ticketsAvailableInput.value = totalTicketsInput.value;
        }
    });

    // Check if we are in Edit / Update mode
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get("id");
    if (eventId) {
        isEditMode = true;
        editEventId = eventId;
        document.getElementById("page-action-title").textContent = "Update Event";
        document.getElementById("form-heading").textContent = "Update Event Request";
        document.getElementById("submit-btn-text").textContent = "Update Event";
        
        // Remove required asterisks on file uploads (optional in edit mode)
        document.getElementById("banner-required-star").classList.add("hidden");
        document.getElementById("ticket-required-star").classList.add("hidden");

        await loadEventDetails(eventId);
    } else {
        // Set default date values
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        document.getElementById("eventDate").min = tomorrowStr;
        document.getElementById("lastRegistrationDate").min = tomorrowStr;
    }
}

// Fetch event details for edit mode
async function loadEventDetails(eventId) {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_EVENT_BASE}/getEvent/${eventId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const body = await res.json();
        if (res.ok && body.success) {
            populateForm(body.data);
        } else {
            showGlobalAlert("error", body.message || "Failed to load event details.");
        }
    } catch (err) {
        console.error("Error loading event details:", err);
        showGlobalAlert("error", "Error loading event details. Please try again.");
    }
}

// Populate form in edit mode
function populateForm(event) {
    document.getElementById("title").value = event.title || "";
    document.getElementById("description").value = event.description || "";
    document.getElementById("category").value = event.category || "";
    document.getElementById("club").value = event.club || "";
    document.getElementById("eventDate").value = event.eventDate || "";
    document.getElementById("eventTime").value = event.eventTime ? event.eventTime.substring(0, 5) : "";
    document.getElementById("lastRegistrationDate").value = event.lastRegisterDate || "";
    document.getElementById("eventMode").value = event.eventMode || "OFFLINE";
    document.getElementById("city").value = event.city || "";
    document.getElementById("location").value = event.location || "";
    document.getElementById("participationType").value = event.participationType || "UNIVERSITY_ONLY";
    ticketPriceInput.value = event.ticketPrice !== null ? event.ticketPrice : 0;
    totalTicketsInput.value = event.totalTickets || "";
    ticketsAvailableInput.value = event.ticketsAvailable !== null ? event.ticketsAvailable : "";

    // Show image previews
    if (event.bannerUrl) {
        currentBannerUrl = event.bannerUrl;
        bannerPreview.src = event.bannerUrl;
        bannerPreviewContainer.classList.remove("hidden");
        bannerFileName.textContent = "Current Banner Loaded";
    }
    if (event.ticketUrl) {
        currentTicketUrl = event.ticketUrl;
        ticketPreview.src = event.ticketUrl;
        ticketPreviewContainer.classList.remove("hidden");
        ticketFileName.textContent = "Current Ticket Cover Loaded";
    }
    if (event.paymentQrUrl) {
        currentPaymentQrUrl = event.paymentQrUrl;
        paymentQrPreview.src = event.paymentQrUrl;
        paymentQrPreviewContainer.classList.remove("hidden");
        paymentQrFileName.textContent = "Current QR Code Loaded";
    }

    // Toggle Payment QR code upload block
    togglePaymentQr();
}

// Form Submission Handler
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearInputErrors();

    const token = localStorage.getItem("accessToken");
    if (!token) {
        showGlobalAlert("error", "Your session has expired. Please log in again.");
        return;
    }

    // Capture values
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const category = document.getElementById("category").value;
    const club = document.getElementById("club").value.trim();
    const eventDateVal = document.getElementById("eventDate").value;
    const eventTimeVal = document.getElementById("eventTime").value;
    const lastRegDateVal = document.getElementById("lastRegistrationDate").value;
    const eventMode = document.getElementById("eventMode").value;
    const city = document.getElementById("city").value.trim();
    const locationVal = document.getElementById("location").value.trim();
    const participationType = document.getElementById("participationType").value;
    const ticketPrice = parseFloat(ticketPriceInput.value || 0);
    const totalTickets = parseInt(totalTicketsInput.value || 0);
    const ticketsAvailable = parseInt(ticketsAvailableInput.value || 0);

    // Client-side validations
    let hasError = false;

    if (!title) {
        showInputError(document.getElementById("title"), "Event title required*");
        hasError = true;
    }
    if (!eventDateVal) {
        showInputError(document.getElementById("eventDate"), "Event date is required");
        hasError = true;
    }
    if (!eventTimeVal) {
        showInputError(document.getElementById("eventTime"), "Event time can't be null");
        hasError = true;
    }
    if (!lastRegDateVal) {
        showInputError(document.getElementById("lastRegistrationDate"), "Last registration date should not be blank");
        hasError = true;
    }
    if (!city) {
        showInputError(cityInput, "City of event or choose Online Mode");
        hasError = true;
    }
    if (!locationVal) {
        showInputError(document.getElementById("location"), "Location of event must be filled");
        hasError = true;
    }
    if (isNaN(ticketPrice) || ticketPrice < 0) {
        showInputError(ticketPriceInput, "Minimum ticket price must be 0");
        hasError = true;
    }
    if (isNaN(totalTickets) || totalTickets < 1) {
        showInputError(totalTicketsInput, "Minimum tickets must be 1");
        hasError = true;
    }
    if (isNaN(ticketsAvailable) || ticketsAvailable < 0) {
        showInputError(ticketsAvailableInput, "Minimum available tickets must be 0");
        hasError = true;
    }
    if (ticketsAvailable > totalTickets) {
        showInputError(ticketsAvailableInput, "Tickets available cannot exceed total capacity");
        hasError = true;
    }

    // Date logical checks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const evDate = new Date(eventDateVal);
    const regDate = new Date(lastRegDateVal);

    if (eventDateVal && evDate <= today) {
        showInputError(document.getElementById("eventDate"), "Event date must be in future");
        hasError = true;
    }
    if (lastRegDateVal && regDate <= today) {
        showInputError(document.getElementById("lastRegistrationDate"), "Last registration date should be in future");
        hasError = true;
    }
    if (eventDateVal && lastRegDateVal && regDate > evDate) {
        showInputError(document.getElementById("lastRegistrationDate"), "Last registration date should be before event date");
        hasError = true;
    }

    // File validation in Create Mode
    if (!isEditMode) {
        if (!bannerInput.files || bannerInput.files.length === 0) {
            showInputError(document.getElementById("banner-error"), "Banner image required");
            hasError = true;
        }
        if (!ticketInput.files || ticketInput.files.length === 0) {
            showInputError(document.getElementById("ticket-error"), "Ticket image required");
            hasError = true;
        }
        if (ticketPrice > 0 && (!paymentQrInput.files || paymentQrInput.files.length === 0)) {
            showInputError(document.getElementById("paymentQr-error"), "Payment QR required for paid events");
            hasError = true;
        }
    } else {
        // In edit mode, UPI QR is required if ticket price is > 0 and we don't have a current one
        if (ticketPrice > 0 && !currentPaymentQrUrl && (!paymentQrInput.files || paymentQrInput.files.length === 0)) {
            showInputError(document.getElementById("paymentQr-error"), "Payment QR required for paid events");
            hasError = true;
        }
    }

    if (hasError) {
        showGlobalAlert("error", "Please fix the highlighted errors before submitting.");
        return;
    }

    // Disable submit button
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-60", "cursor-not-allowed");

    // Construct FormData
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("location", locationVal);
    formData.append("city", city);
    formData.append("lastRegistrationDate", lastRegDateVal);
    formData.append("eventDate", eventDateVal);
    // Ensure seconds are included if not present
    const timeFormatted = eventTimeVal.length === 5 ? `${eventTimeVal}:00` : eventTimeVal;
    formData.append("eventTime", timeFormatted);
    formData.append("totalTickets", totalTickets);
    formData.append("ticketsAvailable", ticketsAvailable);
    formData.append("category", category);
    formData.append("club", club);
    formData.append("ticketPrice", ticketPrice);
    formData.append("participationType", participationType);
    formData.append("eventMode", eventMode);

    // Append files
    if (bannerInput.files && bannerInput.files[0]) {
        formData.append("banner", bannerInput.files[0]);
    }
    if (ticketInput.files && ticketInput.files[0]) {
        formData.append("ticket", ticketInput.files[0]);
    }
    if (paymentQrInput.files && paymentQrInput.files[0]) {
        formData.append("paymentQr", paymentQrInput.files[0]);
    }

    try {
        let url = `${API_EVENT_BASE}/addEvent`;
        let method = "POST";

        if (isEditMode) {
            url = `${API_EVENT_BASE}/updateEvent/${editEventId}`;
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
});

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);
