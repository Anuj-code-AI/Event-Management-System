// myEvents.js — manages the display of events a user has registered to attend

const API_EVENT = "/api/v1/events";
const PAGE_SIZE = 9;

function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
}

function imageStyle(url) {
    return url ? `style="background-image:url('${escapeHtml(url).replace(/'/g, "%27")}')"` : "";
}

// State management
let currentUser = null;
let allJoinedEvents = [];
let currentPage = 0;

// Element selections
const eventSearch = document.getElementById("eventSearch");
const eventsLoading = document.getElementById("events-loading");
const eventsError = document.getElementById("events-error");
const eventsErrorText = document.getElementById("events-error-text");
const eventsContentSection = document.getElementById("events-content-section");
const eventsGrid = document.getElementById("events-grid");
const eventsEmptyMsg = document.getElementById("events-empty-msg");
const eventsPagination = document.getElementById("events-pagination");
const paginationInfo = document.getElementById("pagination-info");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");

// Initialize page
async function initPage() {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = "/login";
        return;
    }

    // Set sidebar navigation items
    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(currentUser);
    }

    // Fetch joined events
    await fetchJoinedEvents();

    // Bind search input to filter events
    if (eventSearch) {
        eventSearch.addEventListener("input", () => {
            currentPage = 0;
            filterAndRender();
        });
    }

    // Bind pagination buttons
    if (prevPageBtn) {
        prevPageBtn.addEventListener("click", () => {
            if (currentPage > 0) {
                currentPage--;
                filterAndRender();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener("click", () => {
            const filtered = getFilteredList();
            const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
            if (currentPage < totalPages - 1) {
                currentPage++;
                filterAndRender();
            }
        });
    }
}

// Fetch joined events from backend API
async function fetchJoinedEvents() {
    showLoading(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {
        // Fetch with a large size to load all joined events for client-side search & pagination
        const res = await fetch(`${API_EVENT}/joined-events?page=0&size=1000`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();

        if (res.ok && body.success) {
            allJoinedEvents = body.data.content || [];

            // Fetch custom form submissions
            try {
                const formsRes = await fetch(`/api/v1/custom-forms/my-submissions?page=0&size=1000`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const formsBody = await formsRes.json();
                if (formsRes.ok && formsBody.success && formsBody.data && formsBody.data.content) {
                    const submissions = formsBody.data.content;
                    submissions.forEach(sub => {
                        sub.isCustomFormSubmission = true;
                        sub.eventId = sub.formId; // Map key form ID
                        sub.title = sub.formTitle;
                    });
                    allJoinedEvents = [...allJoinedEvents, ...submissions];
                }
            } catch (e) {
                console.error("Error loading custom form submissions:", e);
            }

            filterAndRender();
            showLoading(false);
        } else {
            throw new Error(body.message || "Failed to load registered events");
        }
    } catch (err) {
        console.error("fetchJoinedEvents error:", err);
        showLoading(false);
        eventsContentSection.classList.add("hidden");
        eventsError.classList.remove("hidden");
        if (eventsErrorText) {
            eventsErrorText.textContent = err.message || "Network issue loading registered events list.";
        }
    }
}

// Helper: Toggle loading spinner
function showLoading(show) {
    if (show) {
        if (eventsLoading) eventsLoading.classList.remove("hidden");
        if (eventsContentSection) eventsContentSection.classList.add("hidden");
        if (eventsError) eventsError.classList.add("hidden");
    } else {
        if (eventsLoading) eventsLoading.classList.add("hidden");
        if (eventsContentSection) eventsContentSection.classList.remove("hidden");
    }
}

// Helper: Get filtered list based on query
function getFilteredList() {
    const query = eventSearch ? eventSearch.value.toLowerCase().trim() : "";
    if (!query) return allJoinedEvents;

    return allJoinedEvents.filter(event => 
        event.title && event.title.toLowerCase().includes(query)
    );
}

// Filter and render list cards to Grid
function filterAndRender() {
    const filtered = getFilteredList();
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

    // Adjust page index in case search limits list
    if (currentPage >= totalPages) {
        currentPage = Math.max(0, totalPages - 1);
    }

    if (eventsGrid) eventsGrid.innerHTML = "";
    if (eventsEmptyMsg) eventsEmptyMsg.classList.add("hidden");

    if (totalItems === 0) {
        if (eventsEmptyMsg) eventsEmptyMsg.classList.remove("hidden");
        if (eventsPagination) eventsPagination.classList.add("hidden");
        return;
    }

    const startIndex = currentPage * PAGE_SIZE;
    const slice = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    if (eventsGrid) {
        eventsGrid.innerHTML = slice.map(event => renderEventCard(event)).join("");
    }

    // Render pagination
    if (totalPages > 1) {
        if (eventsPagination) eventsPagination.classList.remove("hidden");
        if (paginationInfo) paginationInfo.textContent = `Showing page ${currentPage + 1} of ${totalPages}`;
        if (prevPageBtn) prevPageBtn.disabled = currentPage === 0;
        if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages - 1;
    } else {
        if (eventsPagination) eventsPagination.classList.add("hidden");
    }
}

// Generate Card HTML
function renderEventCard(event) {
    if (event.isCustomFormSubmission) {
        const subDateText = event.submittedAt
            ? new Date(event.submittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
            : "TBA";
        return `
            <article class="group overflow-hidden border border-line bg-canvas transition hover:border-signal/60 hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)] flex flex-col justify-between h-full">
                <div>
                    <a href="/formDetails?formId=${event.eventId}" class="event-image relative block h-36" ${imageStyle(event.bannerUrl)}>
                        <span class="absolute left-3 top-3 rounded bg-signal-tint px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-signal">Registration</span>
                        <span class="absolute right-3 top-3 rounded bg-canvas/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink border border-line-strong">Submitted</span>
                    </a>
                    <div class="p-4">
                        <a href="/formDetails?formId=${event.eventId}" class="font-display text-base font-semibold text-ink group-hover:text-signal line-clamp-2">${escapeHtml(event.title || "Untitled form")}</a>
                        <div class="mt-3 space-y-1.5 text-sm text-muted">
                            <p><i class="fa-regular fa-calendar mr-2 w-3 text-muted-dim"></i>Submitted: ${escapeHtml(subDateText)}</p>
                            <p><i class="fa-regular fa-file-lines mr-2 w-3 text-muted-dim"></i>Submission Code: ${escapeHtml(event.submissionCode)}</p>
                        </div>
                    </div>
                </div>
                <div class="p-4 border-t border-line mt-auto flex items-center justify-between">
                    <span class="font-mono text-xs font-semibold text-ink">Free</span>
                    <span class="text-[11px] font-medium text-signal">COMPLETED</span>
                </div>
            </article>
        `;
    }

    const dateText = event.lastRegistrationDate
        ? new Date(event.lastRegistrationDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
        : "TBA";
    const priceText = event.ticketPrice > 0 ? `$${event.ticketPrice.toFixed(2)}` : "Free";
    
    // Status color classes
    let statusClass = "text-muted";
    if (event.eventStatus === "PENDING") statusClass = "text-amber-600";
    else if (event.eventStatus === "APPROVED" || event.eventStatus === "OPEN") statusClass = "text-signal";
    else if (event.eventStatus === "REJECTED" || event.eventStatus === "CANCELLED") statusClass = "text-danger";
    else if (event.eventStatus === "FINISHED") statusClass = "text-muted-dim";

    return `
        <article class="group overflow-hidden border border-line bg-canvas transition hover:border-action/50 hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)] flex flex-col justify-between h-full">
            <div>
                <a href="/event-details/${event.eventId}" class="event-image relative block h-36" ${imageStyle(event.bannerUrl)}>
                    <span class="absolute left-3 top-3 rounded bg-canvas/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">${escapeHtml(event.category || "Event")}</span>
                    ${event.logoUrl ? `<span class="absolute top-3 right-3 bg-canvas/95 p-0.5 rounded-full border border-line flex items-center justify-center w-7 h-7 z-10"><img src="${escapeHtml(event.logoUrl)}" alt="Logo" class="w-full h-full object-contain rounded-full" /></span>` : ""}
                </a>
                <div class="p-4">
                    <a href="/event-details/${event.eventId}" class="font-display text-base font-semibold text-ink group-hover:text-action line-clamp-2">${escapeHtml(event.title || "Untitled event")}</a>
                    <div class="mt-3 space-y-1.5 text-sm text-muted">
                        <p><i class="fa-regular fa-calendar mr-2 w-3 text-muted-dim"></i>Register by: ${escapeHtml(dateText)}</p>
                        <p><i class="fa-solid fa-location-dot mr-2 w-3 text-muted-dim"></i>${escapeHtml(event.location || "Location TBA")}</p>
                    </div>
                </div>
            </div>
            <div class="p-4 border-t border-line mt-auto flex items-center justify-between">
                <span class="font-mono text-xs font-semibold text-ink">${escapeHtml(priceText)}</span>
                <span class="text-[11px] font-medium uppercase ${statusClass}">${escapeHtml(event.eventStatus || "APPROVED")}</span>
            </div>
        </article>
    `;
}

// Make globally accessible for the inline onclick handler
window.fetchJoinedEvents = fetchJoinedEvents;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initPage);
