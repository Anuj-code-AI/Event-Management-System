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

    // Bind attendee search
    const attendeeSearch = document.getElementById("attendeeSearch");
    if (attendeeSearch) {
        attendeeSearch.addEventListener("input", (e) => {
            attendeeSearchQuery = e.target.value;
            attendeesPage = 0;
            filterAndRenderAttendees();
        });
    }

    // Bind attendee pagination buttons
    const attendeesPrevBtn = document.getElementById("attendees-prev-btn");
    const attendeesNextBtn = document.getElementById("attendees-next-btn");
    if (attendeesPrevBtn) {
        attendeesPrevBtn.addEventListener("click", () => {
            if (attendeesPage > 0) {
                attendeesPage--;
                filterAndRenderAttendees();
            }
        });
    }
    if (attendeesNextBtn) {
        attendeesNextBtn.addEventListener("click", () => {
            const totalPages = Math.ceil(filteredAttendees.length / attendeesPageSize) || 1;
            if (attendeesPage < totalPages - 1) {
                attendeesPage++;
                filterAndRenderAttendees();
            }
        });
    }
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

                <div class="flex flex-col gap-xs border-t border-outline-variant/20 pt-sm">
                    <div class="flex gap-sm w-full">
                        ${actionButtons}
                    </div>
                    ${(event.eventStatus === "APPROVED" || event.eventStatus === "FINISHED") ? `
                        <button onclick="showAttendeesView(${event.eventId}, '${event.title.replace(/'/g, "\\'")}')" 
                            class="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs mt-xs"
                        >
                            <span class="material-symbols-outlined text-[18px]">group</span>
                            <span>Manage Attendance</span>
                        </button>
                    ` : ""}
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

// ===================== ATTENDEE & QR SCANNER MANAGEMENT =====================
let activeEventForAttendees = null;
let allAttendeesList = [];
let filteredAttendees = [];
let attendeesPage = 0;
const attendeesPageSize = 8;
let attendeeSearchQuery = "";
let html5QrCode = null;

// Show Attendees sub-view
function showAttendeesView(eventId, eventTitle) {
    activeEventForAttendees = { eventId, title: eventTitle };
    attendeesPage = 0;
    attendeeSearchQuery = "";
    
    const searchInput = document.getElementById("attendeeSearch");
    if (searchInput) searchInput.value = "";

    // Set header details
    document.getElementById("attendees-event-title").textContent = eventTitle;

    // Toggle views
    document.getElementById("events-dashboard-view").classList.add("hidden");
    document.getElementById("attendees-view").classList.remove("hidden");

    // Fetch and populate data
    fetchAttendeesData();
}

// Hide Attendees sub-view
function hideAttendeesView() {
    activeEventForAttendees = null;
    closeScanner();
    document.getElementById("attendees-view").classList.add("hidden");
    document.getElementById("events-dashboard-view").classList.remove("hidden");
}

// Fetch attendees list from API
async function fetchAttendeesData() {
    if (!activeEventForAttendees) return;
    const token = localStorage.getItem("accessToken");
    const tableBody = document.getElementById("attendees-table-body");
    const emptyMsg = document.getElementById("attendees-empty-msg");
    const paginationSection = document.getElementById("attendees-pagination");

    try {
        // Fetch up to 200 attendees to handle client-side search/pagination easily
        const res = await fetch(`/api/v1/tickets/audienceList/${activeEventForAttendees.eventId}?page=0&size=200`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();
        if (res.ok && body.success) {
            allAttendeesList = body.data.content || [];
            filterAndRenderAttendees();
        } else {
            throw new Error(body.message || "Failed to load attendees list");
        }
    } catch (err) {
        console.error("fetchAttendeesData error:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="p-lg text-center text-body-sm text-error">
                    Failed to fetch attendees: ${err.message || "Network issue"}
                </td>
            </tr>
        `;
    }
}

function filterAndRenderAttendees() {
    const tableBody = document.getElementById("attendees-table-body");
    const emptyMsg = document.getElementById("attendees-empty-msg");
    const paginationSection = document.getElementById("attendees-pagination");
    const paginationInfo = document.getElementById("attendees-pagination-info");

    const query = attendeeSearchQuery.toLowerCase().trim();
    if (query) {
        filteredAttendees = allAttendeesList.filter(a => 
            (a.name && a.name.toLowerCase().includes(query)) ||
            (a.email && a.email.toLowerCase().includes(query)) ||
            (a.ticketId && String(a.ticketId).includes(query))
        );
    } else {
        filteredAttendees = [...allAttendeesList];
    }

    const totalElements = filteredAttendees.length;
    const totalPages = Math.ceil(totalElements / attendeesPageSize) || 1;

    // Boundary check
    if (attendeesPage >= totalPages) attendeesPage = totalPages - 1;
    if (attendeesPage < 0) attendeesPage = 0;

    const startIdx = attendeesPage * attendeesPageSize;
    const endIdx = Math.min(startIdx + attendeesPageSize, totalElements);
    const paginatedList = filteredAttendees.slice(startIdx, endIdx);

    if (totalElements === 0) {
        tableBody.innerHTML = "";
        emptyMsg.classList.remove("hidden");
        paginationSection.classList.add("hidden");
        return;
    }

    emptyMsg.classList.add("hidden");
    paginationSection.classList.remove("hidden");

    paginationInfo.textContent = `Showing ${startIdx + 1}-${endIdx} of ${totalElements}`;
    document.getElementById("attendees-prev-btn").disabled = attendeesPage === 0;
    document.getElementById("attendees-next-btn").disabled = attendeesPage === totalPages - 1;

    tableBody.innerHTML = paginatedList.map(a => {
        let statusBadge = "";
        if (a.checkedIn) {
            statusBadge = `<span class="bg-primary/10 text-primary border border-primary/20 text-label-md px-sm py-xs rounded-full font-semibold uppercase">PRESENT</span>`;
        } else {
            statusBadge = `<span class="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-label-md px-sm py-xs rounded-full font-semibold uppercase">ABSENT</span>`;
        }

        const actionBtn = a.checkedIn ? `
            <button onclick="toggleAttendance(${a.ticketId}, 'absent')" class="border border-error/50 hover:bg-error/10 text-error font-bold py-xs px-sm rounded text-body-sm transition-all flex items-center gap-xs ml-auto">
                <span class="material-symbols-outlined text-[16px]">close</span>
                <span>Mark Absent</span>
            </button>
        ` : `
            <button onclick="toggleAttendance(${a.ticketId}, 'present')" class="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-bold py-xs px-sm rounded text-body-sm transition-all flex items-center gap-xs ml-auto">
                <span class="material-symbols-outlined text-[16px]">check</span>
                <span>Mark Present</span>
            </button>
        `;

        return `
            <tr class="hover:bg-surface-container/30 transition-colors border-b border-outline-variant/10">
                <td class="p-md text-body-sm font-semibold text-on-background">${a.name || "—"}</td>
                <td class="p-md text-body-sm text-on-surface-variant">${a.email || "—"}</td>
                <td class="p-md text-body-sm text-on-surface-variant font-mono">${a.ticketId || "—"}</td>
                <td class="p-md">${statusBadge}</td>
                <td class="p-md text-right">${actionBtn}</td>
            </tr>
        `;
    }).join("");
}

async function toggleAttendance(ticketId, action) {
    const token = localStorage.getItem("accessToken");
    const url = `/api/v1/tickets/${ticketId}/${action === 'present' ? 'markPresent' : 'markAbsent'}`;
    
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            await fetchAttendeesData();
        } else {
            const body = await res.json().catch(() => ({}));
            alert(body.message || `Failed to mark attendee ${action}.`);
        }
    } catch (err) {
        console.error("toggleAttendance error:", err);
        alert("Network error toggling attendance.");
    }
}

// Scanner Management
function openScanner() {
    openModal("scanner-modal");
    document.getElementById("scanner-status").className = "text-body-sm font-semibold text-yellow-500 text-center animate-pulse";
    document.getElementById("scanner-status").textContent = "Requesting camera permissions...";

    html5QrCode = new Html5Qrcode("scanner-preview");
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 200, height: 200 }
        },
        onScanSuccess,
        onScanError
    ).then(() => {
        document.getElementById("scanner-status").className = "text-body-sm font-semibold text-primary text-center";
        document.getElementById("scanner-status").textContent = "Camera active. Scan QR code...";
    }).catch(err => {
        console.error("Scanner start error:", err);
        document.getElementById("scanner-status").className = "text-body-sm font-semibold text-error text-center";
        document.getElementById("scanner-status").textContent = "Error opening camera. Please check permissions.";
    });
}

async function closeScanner() {
    closeModal("scanner-modal");
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            html5QrCode = null;
        } catch (err) {
            console.error("Scanner stop error:", err);
        }
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    await closeScanner();

    const urlParts = decodedText.split("/");
    const ticketCode = urlParts[urlParts.length - 1];

    if (!ticketCode || isNaN(ticketCode)) {
        alert("Invalid QR Code content scanned.");
        openScanner();
        return;
    }

    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`/api/v1/tickets/checkin/${ticketCode}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();
        
        if (res.ok && body.success) {
            alert(`SUCCESS: Guest checked in successfully!`);
            await fetchAttendeesData();
        } else {
            alert(`ERROR: ${body.message || "Failed to check in ticket."}`);
        }
    } catch (err) {
        console.error("Checkin API error:", err);
        alert("Network error checking in ticket.");
    }

    openScanner();
}

function onScanError(errorMessage) {
    // Quietly ignore frame read failures
}

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);
