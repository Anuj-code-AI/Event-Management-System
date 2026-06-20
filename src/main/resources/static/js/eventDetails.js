// eventDetails.js — handles loading event details and buying tickets
const API_EVENT = "/api/v1/event";
const API_TICKETS = "/api/v1/tickets";

// State
let eventId = null;
let eventDetails = null;

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
    if (price > 0) {
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
    }
}

// Handle Ticket booking submission
async function handleBookingSubmit(e) {
    e.preventDefault();
    detailsAlert.classList.add("hidden");

    const token = localStorage.getItem("accessToken");
    if (!token) {
        // Redirect to login if user is not authenticated
        window.location.href = "/login";
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

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);
