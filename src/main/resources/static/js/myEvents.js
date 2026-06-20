// myEvents.js — manages the display of events a user has registered to attend

const API_EVENT = "/api/v1/event";
const PAGE_SIZE = 9;

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
        const res = await fetch(`${API_EVENT}/getJoinedEvents?page=0&size=1000`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();

        if (res.ok && body.success) {
            allJoinedEvents = body.data.content || [];
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
    const bannerUrl = event.bannerUrl || "/images/banner-placeholder.png";
    const dateText = event.lastRegistrationDate
        ? new Date(event.lastRegistrationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : "TBA";
    const priceText = event.ticketPrice > 0 ? `$${event.ticketPrice.toFixed(2)}` : "Free";
    
    // Status color classes
    let statusClass = "bg-surface-container text-on-surface-variant border border-outline-variant";
    if (event.eventStatus === "PENDING") statusClass = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30";
    else if (event.eventStatus === "APPROVED") statusClass = "bg-primary/10 text-primary border border-primary/30";
    else if (event.eventStatus === "REJECTED") statusClass = "bg-error/10 text-error border border-error/30";
    else if (event.eventStatus === "CANCELLED") statusClass = "bg-surface-container-high text-outline border border-outline-variant";
    else if (event.eventStatus === "FINISHED") statusClass = "bg-blue-500/10 text-blue-500 border border-blue-500/30";

    return `
        <div class="bg-surface-container border border-outline-variant rounded-xl overflow-hidden hover:border-primary/30 transition-all group flex flex-col h-full animate-fade-in">
            <a href="/eventDetails/${event.eventId}" class="block relative pt-[56.25%] overflow-hidden bg-surface-container-low shrink-0">
                <img src="${bannerUrl}" alt="${event.title} Banner" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='/images/banner-placeholder.png'" />
                ${event.logoUrl ? `<span class="absolute top-sm left-sm bg-background/80 backdrop-blur-sm p-0.5 rounded-full border border-outline-variant/30 flex items-center justify-center w-8 h-8 z-10"><img src="${event.logoUrl}" alt="University Logo" class="w-full h-full object-contain rounded-full" /></span>` : ""}
                <div class="absolute top-sm right-sm flex flex-col gap-xs items-end">
                    <span class="bg-surface-container-high/90 backdrop-blur-sm text-primary text-label-md font-semibold px-sm py-xs rounded-full border border-outline-variant/30 uppercase tracking-wide">
                        ${event.category || "General"}
                    </span>
                    <span class="${statusClass} text-[10px] font-semibold px-sm py-[2px] rounded-full uppercase tracking-wider mt-xs">
                        ${event.eventStatus || "APPROVED"}
                    </span>
                </div>
            </a>
            <div class="p-md flex flex-col flex-1 space-y-md">
                <div class="space-y-xs flex-1">
                    <h3 class="text-title-lg font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                        <a href="/eventDetails/${event.eventId}">${event.title}</a>
                    </h3>
                    <p class="text-body-sm text-on-surface-variant flex items-center gap-xs mt-xs">
                        <span class="material-symbols-outlined text-[16px] text-primary">location_on</span>
                        <span class="truncate">${event.location || "On Campus"}</span>
                    </p>
                </div>
                <div class="flex items-center justify-between pt-sm border-t border-outline-variant/30 text-body-sm text-on-surface-variant">
                    <span class="flex items-center gap-xs">
                        <span class="material-symbols-outlined text-[16px]">calendar_month</span>
                        Reg Date: ${dateText}
                    </span>
                    <span class="font-bold text-primary">${priceText}</span>
                </div>
            </div>
        </div>
    `;
}

// Make globally accessible for the inline onclick handler
window.fetchJoinedEvents = fetchJoinedEvents;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", initPage);
