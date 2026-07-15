// admin.js — HOD Moderation dashboard script
const API_ADMIN = "/api/admin";
const API_CUSTOM_FORM_BASE = "/api/v1/custom-forms";

// State management
let currentUser = null;
let currentTab = "pending-events"; // default tab
let currentPage = 0;
const pageSizes = {
    events: 9,
    hosts: 10
};

// Data arrays cache
let eventsPending = [];
let eventsApproved = [];
let eventsRejected = [];
let hostsPending = [];
let hostsApproved = [];
let hostsRejected = [];

// Action context
let activeId = null;
let isActiveForm = false;

// Element selections
const tabsContainer = document.getElementById("admin-tabs");
const loadingSpinner = document.getElementById("admin-loading");
const errorBlock = document.getElementById("admin-error");
const contentSection = document.getElementById("admin-content-section");
const eventsGridView = document.getElementById("events-grid-view");
const hostsTableView = document.getElementById("hosts-table-view");
const hostsTbody = document.getElementById("hosts-tbody");
const emptyMsgBlock = document.getElementById("admin-empty-msg");
const emptyText = document.getElementById("admin-empty-text");
const searchInput = document.getElementById("adminSearch");

// Pagination elements
const paginationSection = document.getElementById("admin-pagination");
const paginationInfo = document.getElementById("pagination-info");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");

// Initialize page
async function initPage() {
    currentUser = await getCurrentUser();
    if (!currentUser || currentUser.systemRole !== "HOD") {
        console.warn("[adminPage] Access denied. Redirecting to home...");
        window.location.href = "/home";
        return;
    }

    // Set sidebar
    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(currentUser);
    }

    // Render admin tabs
    renderTabs();

    // Fetch initial datasets
    await fetchAdminData();

    // Bind search key events
    searchInput.addEventListener("input", () => {
        currentPage = 0;
        filterAndRender();
    });

    // Bind pagination clicks
    prevPageBtn.addEventListener("click", () => {
        if (currentPage > 0) {
            currentPage--;
            filterAndRender();
        }
    });

    nextPageBtn.addEventListener("click", () => {
        const fullList = getActiveList();
        const pageSize = currentTab.includes("events") ? pageSizes.events : pageSizes.hosts;
        const totalPages = Math.ceil(fullList.length / pageSize) || 1;
        if (currentPage < totalPages - 1) {
            currentPage++;
            filterAndRender();
        }
    });

    // Confirm buttons listener mappings
    document.getElementById("confirm-approve-event-btn").addEventListener("click", confirmApproveEvent);
    document.getElementById("confirm-reject-event-btn").addEventListener("click", confirmRejectEvent);
    document.getElementById("confirm-approve-host-btn").addEventListener("click", confirmApproveHost);
    document.getElementById("confirm-reject-host-btn").addEventListener("click", confirmRejectHost);

    // Cancel & Uncancel confirms
    document.getElementById("confirm-cancel-btn").addEventListener("click", confirmCancel);
    document.getElementById("confirm-uncancel-btn").addEventListener("click", confirmUncancel);

    // Attendee search & pagination
    const attendeeSearch = document.getElementById("attendeeSearch");
    if (attendeeSearch) {
        attendeeSearch.addEventListener("input", (e) => {
            attendeeSearchQuery = e.target.value;
            attendeesPage = 0;
            filterAndRenderAttendees();
        });
    }

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

// Render tabs list
function renderTabs() {
    const tabs = [
        { id: "pending-events", label: "Pending Events", icon: "pending_actions" },
        { id: "approved-events", label: "Approved Events", icon: "check_circle" },
        { id: "rejected-events", label: "Rejected Events", icon: "cancel" },
        { id: "pending-hosts", label: "Pending Hosts", icon: "contact_mail" },
        { id: "approved-hosts", label: "Approved Hosts", icon: "verified_user" },
        { id: "rejected-hosts", label: "Rejected Hosts", icon: "no_accounts" }
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

// Switch tabs handler
function switchTab(tabId) {
    if (currentTab === tabId) return;
    currentTab = tabId;
    currentPage = 0;

    // Visual styles toggle
    document.querySelectorAll("#admin-tabs button").forEach(btn => {
        btn.className = btn.className
            .replace("border-primary text-primary", "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50");
    });

    const activeBtn = document.getElementById(`tab-btn-${tabId}`);
    if (activeBtn) {
        activeBtn.className = "flex items-center gap-xs px-md py-sm border-b-2 font-medium text-body-sm transition-all whitespace-nowrap border-primary text-primary";
    }

    filterAndRender();
}

// Get matching array list for the active tab and apply search filter
function getActiveList() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    let list = [];

    // Map tab to caches
    if (currentTab === "pending-events") list = eventsPending;
    else if (currentTab === "approved-events") list = eventsApproved;
    else if (currentTab === "rejected-events") list = eventsRejected;
    else if (currentTab === "pending-hosts") list = hostsPending;
    else if (currentTab === "approved-hosts") list = hostsApproved;
    else if (currentTab === "rejected-hosts") list = hostsRejected;

    // Search filters
    if (searchQuery) {
        if (currentTab.includes("events")) {
            return list.filter(e => 
                e.title.toLowerCase().includes(searchQuery) || 
                e.location.toLowerCase().includes(searchQuery)
            );
        } else {
            return list.filter(h => 
                (h.user && h.user.name && h.user.name.toLowerCase().includes(searchQuery)) ||
                h.collegeEmail.toLowerCase().includes(searchQuery) ||
                (h.phone && h.phone.includes(searchQuery))
            );
        }
    }

    return list;
}

// Fetch all university moderation lists
async function fetchAdminData() {
    showLoading(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {
        const [
            pEventsRes, aEventsRes, rEventsRes,
            pHostsRes, aHostsRes, rHostsRes
        ] = await Promise.all([
            fetch(`${API_ADMIN}/event/pending`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_ADMIN}/event/approved`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_ADMIN}/event/rejected`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_ADMIN}/host/pending`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_ADMIN}/host/approved`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_ADMIN}/host/rejected`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const pEvents = await pEventsRes.json();
        const aEvents = await aEventsRes.json();
        const rEvents = await rEventsRes.json();
        
        const pHosts = await pHostsRes.json();
        const aHosts = await aHostsRes.json();
        const rHosts = await rHostsRes.json();

        // Fetch pending, approved, and rejected custom forms
        let formsPendingList = [];
        let formsApprovedList = [];
        let formsRejectedList = [];
        try {
            const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
                fetch(`/api/v1/custom-forms/pending`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`/api/v1/custom-forms/approved`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`/api/v1/custom-forms/rejected`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (pendingRes.ok) {
                const body = await pendingRes.json();
                formsPendingList = body.data || [];
                formsPendingList.forEach(f => {
                    f.isCustomForm = true;
                    f.eventStatus = f.status;
                    f.eventId = f.id;
                });
            }
            if (approvedRes.ok) {
                const body = await approvedRes.json();
                formsApprovedList = body.data || [];
                formsApprovedList.forEach(f => {
                    f.isCustomForm = true;
                    f.eventStatus = f.status;
                    f.eventId = f.id;
                });
            }
            if (rejectedRes.ok) {
                const body = await rejectedRes.json();
                formsRejectedList = body.data || [];
                formsRejectedList.forEach(f => {
                    f.isCustomForm = true;
                    f.eventStatus = f.status;
                    f.eventId = f.id;
                });
            }
        } catch (e) {
            console.error("Error loading moderated custom forms:", e);
        }

        if (
            pEventsRes.ok && aEventsRes.ok && rEventsRes.ok &&
            pHostsRes.ok && aHostsRes.ok && rHostsRes.ok
        ) {
            eventsPending = [...(pEvents.data || []), ...formsPendingList];
            eventsApproved = [...(aEvents.data || []), ...formsApprovedList];
            eventsRejected = [...(rEvents.data || []), ...formsRejectedList];

            hostsPending = pHosts.data || [];
            hostsApproved = aHosts.data || [];
            hostsRejected = rHosts.data || [];
        } else {
            throw new Error("Failed to load one or more moderation lists");
        }

        // Set summary figures
        calculateSummaryStats();

        // Render current view
        filterAndRender();
        showLoading(false);
    } catch (err) {
        console.error("fetchAdminData error:", err);
        showLoading(false);
        contentSection.classList.add("hidden");
        errorBlock.classList.remove("hidden");
        document.getElementById("admin-error-text").textContent = err.message || "Network issue loading moderation datasets.";
    }
}

// Stats displaying logic
function calculateSummaryStats() {
    document.getElementById("stat-pending-events").textContent = eventsPending.length;
    document.getElementById("stat-approved-events").textContent = eventsApproved.length;
    document.getElementById("stat-pending-hosts").textContent = hostsPending.length;
    document.getElementById("stat-approved-hosts").textContent = hostsApproved.length;
}

// Show/Hide loading spinner
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

// Toggles view grids/tables based on active tab type
function filterAndRender() {
    const list = getActiveList();
    const isEvents = currentTab.includes("events");
    const pageSize = isEvents ? pageSizes.events : pageSizes.hosts;
    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    eventsGridView.classList.add("hidden");
    hostsTableView.classList.add("hidden");
    emptyMsgBlock.classList.add("hidden");

    if (totalItems === 0) {
        emptyMsgBlock.classList.remove("hidden");
        paginationSection.classList.add("hidden");
        emptyText.textContent = isEvents 
            ? "No events found under this status." 
            : "No host profile requests found under this status.";
        return;
    }

    const startIndex = currentPage * pageSize;
    const slice = list.slice(startIndex, startIndex + pageSize);

    if (isEvents) {
        eventsGridView.classList.remove("hidden");
        eventsGridView.innerHTML = slice.map(event => renderEventCard(event)).join("");
    } else {
        hostsTableView.classList.remove("hidden");
        
        // Hide Actions column header if not in Pending Host tab
        const actionHeader = document.getElementById("action-header");
        if (currentTab === "pending-hosts") {
            actionHeader.classList.remove("hidden");
        } else {
            actionHeader.classList.add("hidden");
        }

        hostsTbody.innerHTML = slice.map(host => renderHostRow(host)).join("");
    }

    // Render local pagination controls
    paginationSection.classList.remove("hidden");
    paginationInfo.textContent = `Showing page ${currentPage + 1} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = currentPage === totalPages - 1;
}

// Date formatter helper
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// HTML Generator: Event Card for HOD Moderation
function renderEventCard(event) {
    if (event.isCustomForm) {
        let badgeClass = "bg-surface-container text-on-surface-variant border border-outline-variant";
        if (event.status === "PENDING") badgeClass = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30";
        else if (event.status === "APPROVED") badgeClass = "bg-primary/10 text-primary border border-primary/30";
        else if (event.status === "REJECTED") badgeClass = "bg-error/10 text-error border border-error/30";

        const banner = event.bannerUrl || "/images/banner-placeholder.png";
        const showModeration = currentTab === "pending-events";

        let actionButtons = "";
        if (showModeration) {
            actionButtons = `
                <button onclick="openApproveEventModal(${event.eventId}, '${event.title.replace(/'/g, "\\'")}', true)" 
                    class="flex-1 bg-primary hover:bg-primary-fixed text-on-primary font-bold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs"
                >
                    <span class="material-symbols-outlined text-[18px]">check</span>
                    <span>Approve Form</span>
                </button>
                <button onclick="openRejectEventModal(${event.eventId}, '${event.title.replace(/'/g, "\\'")}', true)" 
                    class="flex-1 border border-error hover:bg-error/10 text-error font-bold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs"
                >
                    <span class="material-symbols-outlined text-[18px]">close</span>
                    <span>Reject Form</span>
                </button>
            `;
        } else if (event.status === "APPROVED") {
            actionButtons = `
                <div class="flex flex-col gap-xs w-full">
                    <a href="/update-custom-form?formId=${event.eventId}" 
                        class="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant font-semibold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs mt-xs"
                    >
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                        <span>Edit Form</span>
                    </a>
                    <button onclick="showResponsesView(${event.eventId}, '${event.title.replace(/'/g, "\\'")}')" 
                        class="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs mt-xs"
                    >
                        <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                        <span>View Responses</span>
                    </button>
                </div>
            `;
        }

        return `
            <div class="glass-card rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300">
                <!-- Banner area -->
                <div class="relative h-44 w-full bg-surface-container-low overflow-hidden cursor-pointer" onclick="window.open('/formDetails?formId=${event.eventId}', '_blank')">
                    <img class="w-full h-full object-cover hover:scale-105 transition-transform duration-500" src="${banner}" alt="${event.title}" onerror="this.src='/images/banner-placeholder.png'">
                    <span class="absolute top-sm left-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 text-label-md px-sm py-xs rounded-full">
                        Custom Form
                    </span>
                    <span class="absolute top-sm right-sm ${badgeClass} text-label-md px-sm py-xs rounded-full font-semibold uppercase">
                        ${event.status}
                    </span>
                </div>

                <!-- Card Body -->
                <div class="p-md flex-1 flex flex-col justify-between space-y-md">
                    <div class="space-y-sm">
                        <h3 class="text-title-lg font-bold text-on-background line-clamp-1 hover:text-primary cursor-pointer transition-colors" onclick="window.open('/formDetails?formId=${event.eventId}', '_blank')">${event.title}</h3>
                        <p class="text-body-sm text-on-surface-variant line-clamp-2">${event.description || "No description provided."}</p>
                        <p class="text-label-md text-outline">Requested by: <span class="text-on-surface font-semibold">${event.username || "Organizer"}</span></p>
                    </div>
                    ${actionButtons ? `
                        <div class="flex gap-sm border-t border-outline-variant/20 pt-sm">
                            ${actionButtons}
                        </div>
                    ` : ""}
                </div>
            </div>
        `;
    }

    let badgeClass = "bg-surface-container text-on-surface-variant border border-outline-variant";
    if (event.eventStatus === "PENDING") badgeClass = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30";
    else if (event.eventStatus === "APPROVED") badgeClass = "bg-primary/10 text-primary border border-primary/30";
    else if (event.eventStatus === "REJECTED") badgeClass = "bg-error/10 text-error border border-error/30";
    else if (event.eventStatus === "CANCELLED") badgeClass = "bg-surface-container-high text-outline border border-outline-variant";

    const banner = event.bannerUrl || "/images/banner-placeholder.png";
    const priceDisplay = event.ticketPrice > 0 ? `$${event.ticketPrice.toFixed(2)}` : "Free";

    // Moderation controls for HOD
    const showModeration = currentTab === "pending-events";
    const isApprovedOrCancelled = currentTab === "approved-events";
    
    let actionButtons = "";
    if (showModeration) {
        actionButtons = `
            <button onclick="openApproveEventModal(${event.eventId}, '${event.title.replace(/'/g, "\\'")}')" 
                class="flex-1 bg-primary hover:bg-primary-fixed text-on-primary font-bold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs"
            >
                <span class="material-symbols-outlined text-[18px]">check</span>
                <span>Approve</span>
            </button>
            <button onclick="openRejectEventModal(${event.eventId}, '${event.title.replace(/'/g, "\\'")}')" 
                class="flex-1 border border-error hover:bg-error/10 text-error font-bold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs"
            >
                <span class="material-symbols-outlined text-[18px]">close</span>
                <span>Reject</span>
            </button>
        `;
    } else if (isApprovedOrCancelled) {
        actionButtons = `
            <div class="flex flex-col gap-xs w-full">
                <div class="flex gap-sm w-full">
                    ${event.eventStatus === "APPROVED" ? `
                        <button onclick="openCancelModal(${event.eventId}, '${event.title.replace(/'/g, "\\'")}')" 
                            class="flex-1 border border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-500 font-bold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs"
                        >
                            <span class="material-symbols-outlined text-[18px]">block</span>
                            <span>Cancel Event</span>
                        </button>
                    ` : `
                        <button onclick="openUncancelModal(${event.eventId}, '${event.title.replace(/'/g, "\\'")}')" 
                            class="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 border border-yellow-500/30 font-bold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs"
                        >
                            <span class="material-symbols-outlined text-[18px]">event_available</span>
                            <span>Uncancel Event</span>
                        </button>
                    `}
                </div>
                <button onclick="showAttendeesView(${event.eventId}, '${event.title.replace(/'/g, "\\'")}')" 
                    class="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs mt-xs"
                >
                    <span class="material-symbols-outlined text-[18px]">group</span>
                    <span>Manage Attendance</span>
                </button>
            </div>
        `;
    } else {
        actionButtons = `<span class="text-label-md text-outline italic w-full text-center py-xs">No moderation needed</span>`;
    }

    return `
        <div class="glass-card rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300">
            <div class="relative h-44 w-full bg-surface-container-low overflow-hidden">
                <img class="w-full h-full object-cover" src="${banner}" alt="${event.title}" onerror="this.src='/images/banner-placeholder.png'">
                ${event.category ? `
                    <span class="absolute top-sm left-sm bg-background/80 backdrop-blur-md text-primary border border-primary/20 text-label-md px-sm py-xs rounded-full">
                        ${event.category}
                    </span>
                ` : ""}
                <span class="absolute top-sm right-sm ${badgeClass} text-label-md px-sm py-xs rounded-full font-semibold uppercase">
                    ${event.eventStatus}
                </span>
            </div>

            <div class="p-md flex-1 flex flex-col justify-between space-y-md">
                <div class="space-y-sm">
                    <h3 class="text-title-lg font-bold text-on-background line-clamp-1">${event.title}</h3>
                    
                    <div class="space-y-xs text-body-sm text-on-surface-variant">
                        <div class="flex items-center gap-xs">
                            <span class="material-symbols-outlined text-[18px] text-primary">calendar_today</span>
                            <span>Date: ${formatDate(event.lastRegistrationDate)}</span>
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

// HTML Generator: Host Row for Table view
function renderHostRow(host) {
    const name = host.user ? host.user.name : "N/A";
    const dateStr = host.appliedAt ? formatDate(host.appliedAt.substring(0, 10)) : "N/A";
    
    // Status style classes
    let statusClass = "text-outline bg-surface-container border border-outline-variant/30";
    if (host.status === "PENDING") statusClass = "text-yellow-500 bg-yellow-500/10 border border-yellow-500/30";
    else if (host.status === "APPROVED") statusClass = "text-primary bg-primary/10 border border-primary/30";
    else if (host.status === "REJECTED") statusClass = "text-error bg-error/10 border border-error/30";

    const isPending = currentTab === "pending-hosts";
    const actionButtons = isPending ? `
        <div class="flex gap-sm justify-end">
            <button onclick="openApproveHostModal(${host.hostId}, '${name.replace(/'/g, "\\'")}')" 
                class="bg-primary hover:bg-primary-fixed text-on-primary font-bold py-xs px-sm rounded text-label-md transition-all flex items-center gap-xs"
            >
                <span class="material-symbols-outlined text-[16px]">done</span>
                <span>Approve</span>
            </button>
            <button onclick="openRejectHostModal(${host.hostId}, '${name.replace(/'/g, "\\'")}')" 
                class="border border-error hover:bg-error/10 text-error font-bold py-xs px-sm rounded text-label-md transition-all flex items-center gap-xs"
            >
                <span class="material-symbols-outlined text-[16px]">close</span>
                <span>Reject</span>
            </button>
        </div>
    ` : "";

    return `
        <tr class="hover:bg-surface-container-low/40 transition-colors">
            <td class="px-md py-sm">
                <div class="font-medium text-on-surface">${name}</div>
                <div class="text-label-md text-outline">Phone: ${host.phone || "N/A"}</div>
            </td>
            <td class="px-md py-sm text-on-surface-variant font-mono text-[13px]">${host.collegeEmail}</td>
            <td class="px-md py-sm text-on-surface-variant">${host.phone || "N/A"}</td>
            <td class="px-md py-sm text-on-surface-variant">${dateStr}</td>
            <td class="px-md py-sm">
                <span class="inline-block px-sm py-xs rounded text-label-md font-semibold uppercase tracking-wider ${statusClass}">
                    ${host.status}
                </span>
            </td>
            ${isPending ? `<td class="px-md py-sm text-right">${actionButtons}</td>` : ""}
        </tr>
    `;
}

// Modal management utilities
function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
    activeId = null;
    isActiveForm = false;
}

// Action modal openings
function openApproveEventModal(id, title, isForm = false) {
    activeId = id;
    isActiveForm = isForm;
    document.getElementById("approve-event-title").textContent = title;
    openModal("approve-event-modal");
}

function openRejectEventModal(id, title, isForm = false) {
    activeId = id;
    isActiveForm = isForm;
    document.getElementById("reject-event-title").textContent = title;
    openModal("reject-event-modal");
}

function openApproveHostModal(id, name) {
    activeId = id;
    document.getElementById("approve-host-name").textContent = name;
    openModal("approve-host-modal");
}

function openRejectHostModal(id, name) {
    activeId = id;
    document.getElementById("reject-host-name").textContent = name;
    openModal("reject-host-modal");
}

// Confirm event actions calling HOD API
async function confirmApproveEvent() {
    if (!activeId) return;
    const token = localStorage.getItem("accessToken");
    const url = isActiveForm 
        ? `/api/v1/custom-forms/approve/${activeId}`
        : `${API_ADMIN}/event/${activeId}/approve`;
    const method = isActiveForm ? "POST" : "PATCH";

    try {
        const res = await fetch(url, {
            method: method,
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("approve-event-modal");
            await fetchAdminData();
        } else {
            alert("Failed to approve request.");
        }
    } catch (err) {
        console.error("Approve request error:", err);
        alert("Network error approving request.");
    }
}

async function confirmRejectEvent() {
    if (!activeId) return;
    const token = localStorage.getItem("accessToken");
    const url = isActiveForm 
        ? `/api/v1/custom-forms/reject/${activeId}`
        : `${API_ADMIN}/event/${activeId}/reject`;
    const method = isActiveForm ? "POST" : "PATCH";

    try {
        const res = await fetch(url, {
            method: method,
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("reject-event-modal");
            await fetchAdminData();
        } else {
            alert("Failed to reject request.");
        }
    } catch (err) {
        console.error("Reject request error:", err);
        alert("Network error rejecting request.");
    }
}

// Confirm host actions calling HOD API
async function confirmApproveHost() {
    if (!activeId) return;
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_ADMIN}/host/${activeId}/approve`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("approve-host-modal");
            await fetchAdminData();
        } else {
            alert("Failed to approve host application.");
        }
    } catch (err) {
        console.error("Approve host error:", err);
        alert("Network error approving host.");
    }
}

async function confirmRejectHost() {
    if (!activeId) return;
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_ADMIN}/host/${activeId}/reject`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("reject-host-modal");
            await fetchAdminData();
        } else {
            alert("Failed to reject host application.");
        }
    } catch (err) {
        console.error("Reject host error:", err);
        alert("Network error rejecting host.");
    }
}

// HOD Cancel/Uncancel event functionality
function openCancelModal(id, title) {
    activeId = id;
    document.getElementById("cancel-event-title").textContent = title;
    openModal("cancel-modal");
}

function openUncancelModal(id, title) {
    activeId = id;
    document.getElementById("uncancel-event-title").textContent = title;
    openModal("uncancel-modal");
}

async function confirmCancel() {
    if (!activeId) return;
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`/api/v1/event/cancelEvent/${activeId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("cancel-modal");
            await fetchAdminData();
        } else {
            alert("Failed to cancel event.");
        }
    } catch (err) {
        console.error("Cancel error:", err);
        alert("Network error cancelling event.");
    }
}

async function confirmUncancel() {
    if (!activeId) return;
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`/api/v1/event/uncancelEvent/${activeId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("uncancel-modal");
            await fetchAdminData();
        } else {
            alert("Failed to reactivate event.");
        }
    } catch (err) {
        console.error("Uncancel error:", err);
        alert("Network error reactivating event.");
    }
}

// Attendee & QR Scanner management for HOD
let activeEventForAttendees = null;
let allAttendeesList = [];
let filteredAttendees = [];
let attendeesPage = 0;
const attendeesPageSize = 8;
let attendeeSearchQuery = "";
let html5QrCode = null;

function showAttendeesView(eventId, eventTitle) {
    activeEventForAttendees = { eventId, title: eventTitle };
    attendeesPage = 0;
    attendeeSearchQuery = "";

    const searchInput = document.getElementById("attendeeSearch");
    if (searchInput) searchInput.value = "";

    // Set header details
    document.getElementById("attendees-event-title").textContent = eventTitle;

    // Toggle views
    document.getElementById("admin-dashboard-view").classList.add("hidden");
    document.getElementById("attendees-view").classList.remove("hidden");

    // Fetch and populate data
    fetchAttendeesData();
}

function hideAttendeesView() {
    activeEventForAttendees = null;
    closeScanner();
    document.getElementById("attendees-view").classList.add("hidden");
    document.getElementById("admin-dashboard-view").classList.remove("hidden");
}

async function fetchAttendeesData() {
    if (!activeEventForAttendees) return;
    const token = localStorage.getItem("accessToken");
    const tableBody = document.getElementById("attendees-table-body");
    const emptyMsg = document.getElementById("attendees-empty-msg");
    const paginationSection = document.getElementById("attendees-pagination");

    try {
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

// CUSTOM REGISTRATION FORM RESPONSES VIEW & EXPORT FOR HOD
// ----------------------------------------------------
let activeEventForResponses = null;

function showResponsesView(eventId, eventTitle) {
    activeEventForResponses = { eventId, title: eventTitle };
    
    // Set header
    document.getElementById("responses-event-title").textContent = eventTitle;

    // Toggle views
    document.getElementById("admin-dashboard-view").classList.add("hidden");
    document.getElementById("responses-view").classList.remove("hidden");

    // Bind CSV export button click
    const exportBtn = document.getElementById("export-csv-btn");
    exportBtn.onclick = () => downloadResponsesCsv(eventId);

    // Fetch and populate responses
    fetchResponsesData(eventId);
}

function hideResponsesView() {
    activeEventForResponses = null;
    document.getElementById("responses-view").classList.add("hidden");
    document.getElementById("admin-dashboard-view").classList.remove("hidden");
}

async function fetchResponsesData(eventId) {
    const token = localStorage.getItem("accessToken");
    const headerRow = document.getElementById("responses-table-header");
    const tableBody = document.getElementById("responses-table-body");
    const emptyMsg = document.getElementById("responses-empty-msg");
    const table = document.getElementById("responses-table");

    headerRow.innerHTML = "";
    tableBody.innerHTML = "";
    emptyMsg.classList.add("hidden");
    table.classList.remove("hidden");

    try {
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/responses/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();
        
        if (res.ok && body.success) {
            const submissions = body.data || [];
            if (submissions.length === 0) {
                table.classList.add("hidden");
                emptyMsg.classList.remove("hidden");
                return;
            }

            // Build table headers dynamically based on the questions present in the first submission
            const sampleAnswers = submissions[0].answers || [];
            
            let headersHtml = `
                <th class="p-md text-label-md text-on-surface-variant uppercase tracking-wider">Submission Code</th>
                <th class="p-md text-label-md text-on-surface-variant uppercase tracking-wider">Attendee</th>
                <th class="p-md text-label-md text-on-surface-variant uppercase tracking-wider">Email</th>
                <th class="p-md text-label-md text-on-surface-variant uppercase tracking-wider">Submitted At</th>
            `;
            
            sampleAnswers.forEach(ans => {
                headersHtml += `<th class="p-md text-label-md text-on-surface-variant uppercase tracking-wider">${ans.fieldLabel}</th>`;
            });
            
            headerRow.innerHTML = headersHtml;

            // Populate rows
            submissions.forEach(sub => {
                const subDate = new Date(sub.submittedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                let rowHtml = `
                    <tr class="hover:bg-surface-container-high/30 transition-colors">
                        <td class="p-md text-body-sm font-semibold text-primary">${sub.submissionCode}</td>
                        <td class="p-md text-body-sm text-on-surface font-medium">${sub.username}</td>
                        <td class="p-md text-body-sm text-on-surface-variant">${sub.userEmail}</td>
                        <td class="p-md text-body-sm text-on-surface-variant">${subDate}</td>
                `;

                // Map field values
                sub.answers.forEach(ans => {
                    if (ans.fileUrl) {
                        rowHtml += `
                            <td class="p-md text-body-sm text-primary">
                                <a href="${ans.fileUrl}" target="_blank" class="inline-flex items-center gap-xs hover:underline font-semibold">
                                    <span class="material-symbols-outlined text-[16px]">attachment</span>
                                    <span>View File</span>
                                </a>
                            </td>
                        `;
                    } else {
                        rowHtml += `<td class="p-md text-body-sm text-on-surface-variant">${ans.value || "—"}</td>`;
                    }
                });

                rowHtml += "</tr>";
                tableBody.insertAdjacentHTML("beforeend", rowHtml);
            });

        } else {
            throw new Error(body.message || "Failed to load responses data.");
        }
    } catch (err) {
        console.error("fetchResponsesData error:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="p-lg text-center text-body-sm text-error font-medium">
                    Failed to fetch custom responses: ${err.message || "Network issue"}
                </td>
            </tr>
        `;
    }
}

async function downloadResponsesCsv(eventId) {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/export/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `responses_form_${eventId}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            alert("Failed to export CSV file.");
        }
    } catch (err) {
        console.error("CSV download error:", err);
        alert("A network error occurred downloading responses CSV.");
    }
}

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);
