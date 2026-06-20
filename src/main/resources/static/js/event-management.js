// event-management.js — Personal Event Management dashboard for Hosts and HODs
const API_EVENT = "/api/v1/event";

// State variables
let currentUser = null;
let currentTab = "all-hosted"; // default tab
let currentPage = 0;
const pageSize = 9;

// Data caches
let myEventsPage = { content: [], totalPages: 1, totalElements: 0 }; // Server-paginated page cache
let fullHostedList = []; // All events cached for local status filtering

// Modal action state
let activeEventId = null;

// Element selections
const tabsContainer = document.getElementById("tabs-container");
const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const eventsContentSection = document.getElementById("events-content-section");
const eventsGrid = document.getElementById("events-grid");
const eventsEmptyMsg = document.getElementById("events-empty-msg");
const emptyMessageText = document.getElementById("empty-message-text");
const searchInput = document.getElementById("eventSearch");

// Pagination elements
const paginationSection = document.getElementById("events-pagination");
const paginationInfo = document.getElementById("pagination-info");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");

// Check authorization and initialize page
async function initPage() {
    currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.systemRole !== "HOD" && currentUser.hostStatus !== "APPROVED")) {
        console.warn("[hostedEvents] Unauthorized user. Redirecting to home...");
        window.location.href = "/home";
        return;
    }

    // Set layout headings
    document.title = "Event Management | CampusHive";
    document.getElementById("page-title").textContent = "Event Management";

    // Build personal dashboard tabs
    renderTabs();

    // Fetch initial data
    await fetchEventsData();

    // Bind event search
    searchInput.addEventListener("input", () => {
        currentPage = 0;
        filterAndRenderEvents();
    });

    // Bind pagination buttons
    prevPageBtn.addEventListener("click", () => {
        if (currentPage > 0) {
            currentPage--;
            if (currentTab === "all-hosted") {
                fetchEventsData();
            } else {
                filterAndRenderEvents();
            }
        }
    });

    nextPageBtn.addEventListener("click", () => {
        if (currentTab === "all-hosted") {
            if (currentPage < myEventsPage.totalPages - 1) {
                currentPage++;
                fetchEventsData();
            }
        } else {
            const list = getActiveList();
            const totalPages = Math.ceil(list.length / pageSize);
            if (currentPage < totalPages - 1) {
                currentPage++;
                filterAndRenderEvents();
            }
        }
    });

    // Wire up modal confirm buttons
    document.getElementById("confirm-cancel-btn").addEventListener("click", confirmCancel);
    document.getElementById("confirm-delete-btn").addEventListener("click", confirmDelete);
}

// Render personal event tabs
function renderTabs() {
    const tabs = [
        { id: "all-hosted", label: "All My Events", icon: "event_note" },
        { id: "pending-approval", label: "Under Request", icon: "hourglass_empty" },
        { id: "approved-events", label: "Accepted", icon: "thumb_up" },
        { id: "rejected-events", label: "Rejected", icon: "thumb_down" }
    ];

    tabsContainer.innerHTML = tabs.map(tab => {
        const isActive = tab.id === currentTab;
        return `
            <button onclick="switchTab('${tab.id}')" id="tab-btn-${tab.id}"
                class="flex items-center gap-xs px-md py-sm border-b-2 font-medium text-body-sm transition-all whitespace-nowrap
                ${isActive 
                    ? "border-primary text-primary" 
                    : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50"}"
            >
                <span class="material-symbols-outlined text-[20px]">${tab.icon}</span>
                <span>${tab.label}</span>
            </button>
        `;
    }).join("");
}

// Switch Tab logic
function switchTab(tabId) {
    if (currentTab === tabId) return;
    currentTab = tabId;
    currentPage = 0;

    // Update active tab visual classes
    document.querySelectorAll("#tabs-container button").forEach(btn => {
        btn.className = btn.className
            .replace("border-primary text-primary", "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50");
    });

    const activeBtn = document.getElementById(`tab-btn-${tabId}`);
    if (activeBtn) {
        activeBtn.className = "flex items-center gap-xs px-md py-sm border-b-2 font-medium text-body-sm transition-all whitespace-nowrap border-primary text-primary";
    }

    // Refresh display
    if (tabId === "all-hosted") {
        fetchEventsData();
    } else {
        filterAndRenderEvents();
    }
}

// Retrieve active list of events based on tab and search keyword
function getActiveList() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    let list = fullHostedList;

    if (currentTab === "pending-approval") {
        list = list.filter(e => e.eventStatus === "PENDING");
    } else if (currentTab === "approved-events") {
        list = list.filter(e => e.eventStatus === "APPROVED");
    } else if (currentTab === "rejected-events") {
        list = list.filter(e => e.eventStatus === "REJECTED");
    }

    if (searchQuery) {
        return list.filter(e => e.title.toLowerCase().includes(searchQuery) || e.location.toLowerCase().includes(searchQuery));
    }
    return list;
}

// Fetch events from backend
async function fetchEventsData() {
    showLoading(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {
        // Load the page size matching the current page
        let hostedUrl = `${API_EVENT}/getHostedEvents?page=${currentPage}&size=${pageSize}`;
        const hostedRes = await fetch(hostedUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const hostedBody = await hostedRes.json();
        
        if (hostedRes.ok && hostedBody.success) {
            myEventsPage = hostedBody.data;
        } else {
            throw new Error(hostedBody.message || "Failed to load hosted events");
        }

        // To populate stats and support filtering on other tabs, fetch a large list/all events for local stats
        let allHostedUrl = `${API_EVENT}/getHostedEvents?page=0&size=1000`;
        const allRes = await fetch(allHostedUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const allBody = await allRes.json();
        if (allRes.ok && allBody.success) {
            fullHostedList = allBody.data.content || [];
        }

        // Compute dashboard numbers
        calculateStats();

        // Render Active Events
        filterAndRenderEvents();
        showLoading(false);
    } catch (err) {
        console.error("fetchEventsData error:", err);
        showLoading(false);
        eventsContentSection.classList.add("hidden");
        errorState.classList.remove("hidden");
        document.getElementById("error-message").textContent = err.message || "Network error loading events. Please try again.";
    }
}

// Compute dashboard stats from local array
function calculateStats() {
    const pending = fullHostedList.filter(e => e.eventStatus === "PENDING").length;
    const approved = fullHostedList.filter(e => e.eventStatus === "APPROVED").length;
    const rejected = fullHostedList.filter(e => e.eventStatus === "REJECTED").length;

    document.getElementById("stat-total").textContent = fullHostedList.length;
    document.getElementById("stat-pending").textContent = pending;
    document.getElementById("stat-approved").textContent = approved;
    document.getElementById("stat-rejected").textContent = rejected;
}

// Toggle loading spinner
function showLoading(show) {
    if (show) {
        loadingState.classList.remove("hidden");
        eventsContentSection.classList.add("hidden");
        errorState.classList.add("hidden");
    } else {
        loadingState.classList.add("hidden");
        eventsContentSection.classList.remove("hidden");
    }
}

// Filter and render list of events
function filterAndRenderEvents() {
    const isServerPaginated = currentTab === "all-hosted";
    eventsGrid.innerHTML = "";

    if (isServerPaginated) {
        const events = myEventsPage.content || [];
        let filtered = events;
        const searchQuery = searchInput.value.toLowerCase().trim();
        if (searchQuery) {
            filtered = events.filter(e => e.title.toLowerCase().includes(searchQuery) || e.location.toLowerCase().includes(searchQuery));
        }

        if (filtered.length === 0) {
            showEmptyState(true, "You haven't requested any events yet.");
            paginationSection.classList.add("hidden");
        } else {
            showEmptyState(false);
            eventsGrid.innerHTML = filtered.map(e => renderEventCard(e)).join("");
            renderPagination(myEventsPage.totalPages, myEventsPage.first, myEventsPage.last);
        }
    } else {
        const fullList = getActiveList();
        const totalItems = fullList.length;
        const totalPages = Math.ceil(totalItems / pageSize) || 1;

        if (totalItems === 0) {
            showEmptyState(true, "No events match this filter.");
            paginationSection.classList.add("hidden");
        } else {
            showEmptyState(false);
            const startIndex = currentPage * pageSize;
            const slice = fullList.slice(startIndex, startIndex + pageSize);
            eventsGrid.innerHTML = slice.map(e => renderEventCard(e)).join("");
            renderPagination(totalPages, currentPage === 0, currentPage === totalPages - 1);
        }
    }
}

// Show/Hide empty message block
function showEmptyState(show, msg) {
    if (show) {
        eventsGrid.classList.add("hidden");
        eventsEmptyMsg.classList.remove("hidden");
        emptyMessageText.textContent = msg;
    } else {
        eventsGrid.classList.remove("hidden");
        eventsEmptyMsg.classList.add("hidden");
    }
}

// Date formatter
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// HTML Generator: Single personal event card
function renderEventCard(event) {
    let badgeClass = "bg-surface-container text-on-surface-variant border border-outline-variant";
    if (event.eventStatus === "PENDING") badgeClass = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30";
    else if (event.eventStatus === "APPROVED") badgeClass = "bg-primary/10 text-primary border border-primary/30";
    else if (event.eventStatus === "REJECTED") badgeClass = "bg-error/10 text-error border border-error/30";
    else if (event.eventStatus === "CANCELLED") badgeClass = "bg-surface-container-high text-outline border border-outline-variant";
    else if (event.eventStatus === "FINISHED") badgeClass = "bg-blue-500/10 text-blue-500 border border-blue-500/30";

    const banner = event.bannerUrl || "/images/banner-placeholder.png";
    const priceDisplay = event.ticketPrice > 0 ? `$${event.ticketPrice.toFixed(2)}` : "Free";

    const showCancel = event.eventStatus === "APPROVED";
    const showEdit = event.eventStatus === "PENDING" || event.eventStatus === "APPROVED";
    
    const actionButtons = `
        ${showEdit ? `
            <a href="/request-event?id=${event.eventId}" 
                class="flex-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-bold py-xs px-sm rounded text-body-sm text-center transition-all flex items-center justify-center gap-xs"
            >
                <span class="material-symbols-outlined text-[18px]">edit</span>
                <span>Edit</span>
            </a>
        ` : ""}
        ${showCancel ? `
            <button onclick="openCancelModal(${event.eventId}, '${event.title.replace(/'/g, "\\'")}')" 
                class="flex-1 border border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-500 font-bold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs"
            >
                <span class="material-symbols-outlined text-[18px]">block</span>
                <span>Cancel</span>
            </button>
        ` : ""}
        <button onclick="openDeleteModal(${event.eventId}, '${event.title.replace(/'/g, "\\'")}')" 
            class="flex-1 border border-error/50 hover:bg-error/10 text-error font-bold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs"
        >
            <span class="material-symbols-outlined text-[18px]">delete</span>
            <span>Delete</span>
        </button>
    `;

    return `
        <div class="glass-card rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300">
            <!-- Banner area -->
            <div class="relative h-44 w-full bg-surface-container-low overflow-hidden">
                <img class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" src="${banner}" alt="${event.title}" onerror="this.src='/images/banner-placeholder.png'">
                ${event.category ? `
                    <span class="absolute top-sm left-sm bg-background/80 backdrop-blur-md text-primary border border-primary/20 text-label-md px-sm py-xs rounded-full">
                        ${event.category}
                    </span>
                ` : ""}
                <span class="absolute top-sm right-sm ${badgeClass} text-label-md px-sm py-xs rounded-full font-semibold uppercase">
                    ${event.eventStatus}
                </span>
            </div>

            <!-- Card Body -->
            <div class="p-md flex-1 flex flex-col justify-between space-y-md">
                <div class="space-y-sm">
                    <h3 class="text-title-lg font-bold text-on-background line-clamp-1">${event.title}</h3>
                    
                    <div class="space-y-xs text-body-sm text-on-surface-variant">
                        <div class="flex items-center gap-xs">
                            <span class="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
                            <span>Reg Deadline: ${formatDate(event.lastRegistrationDate)}</span>
                        </div>
                        <div class="flex items-center gap-xs">
                            <span class="material-symbols-outlined text-[18px] text-primary">pin_drop</span>
                            <span class="line-clamp-1">${event.location}</span>
                        </div>
                        <div class="flex items-center gap-xs">
                            <span class="material-symbols-outlined text-[18px] text-primary">payments</span>
                            <span>Ticket Price: <span class="text-on-surface font-semibold">${priceDisplay}</span></span>
                        </div>
                    </div>
                </div>

                <div class="flex gap-sm border-t border-outline-variant/20 pt-sm">
                    ${actionButtons}
                </div>
            </div>
        </div>
    `;
}

// Render pagination info
function renderPagination(totalPages, isFirst, isLast) {
    paginationSection.classList.remove("hidden");
    paginationInfo.textContent = `Showing page ${currentPage + 1} of ${totalPages || 1}`;

    prevPageBtn.disabled = isFirst;
    nextPageBtn.disabled = isLast;
}

// Modals toggling
function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
    activeEventId = null;
}

function openCancelModal(id, title) {
    activeEventId = id;
    document.getElementById("cancel-event-title").textContent = title;
    openModal("cancel-modal");
}

function openDeleteModal(id, title) {
    activeEventId = id;
    document.getElementById("delete-event-title").textContent = title;
    openModal("delete-modal");
}

// Confirm actions
async function confirmCancel() {
    if (!activeEventId) return;
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_EVENT}/cancelEvent/${activeEventId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("cancel-modal");
            await fetchEventsData();
        } else {
            alert("Failed to cancel event.");
        }
    } catch (err) {
        console.error("Cancel error:", err);
        alert("Network error cancelling event.");
    }
}

async function confirmDelete() {
    if (!activeEventId) return;
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_EVENT}/deleteEvent/${activeEventId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("delete-modal");
            await fetchEventsData();
        } else {
            alert("Failed to delete event.");
        }
    } catch (err) {
        console.error("Delete error:", err);
        alert("Network error deleting event.");
    }
}

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);
