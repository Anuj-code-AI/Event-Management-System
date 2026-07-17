// admin.js — HOD Moderation dashboard script
const API_ADMIN = "/api/v1/admin";
const API_CUSTOM_FORM_BASE = "/api/v1/custom-forms";

// State management
let currentUser = null;
let currentSection = "events"; // events, forms, hosts
let currentTab = "PENDING"; // PENDING, APPROVED, REJECTED, HOSTED, CANCELLED
let currentPage = 0;
const pageSize = 9; // For card grids
const hostPageSize = 10; // For table rows

// Data cache lists
let hostsList = [];
let eventsList = [];
let formsList = [];

// For pagination cache
let formsTotalPages = 1;
let formsTotalElements = 0;

// Action contexts
let activeId = null;
let activeTitle = "";
let actionType = ""; // approve-event, reject-event, approve-host, reject-host, approve-form, reject-form, cancel-event, restore-event, cancel-form, restore-form
let activeEventForAttendees = null;
let allAttendeesList = [];
let filteredAttendees = [];
let attendeesPage = 0;
const attendeesPageSize = 8;
let attendeeSearchQuery = "";
let html5QrCode = null;

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

    // Set initial section buttons style
    updateSectionButtons();

    // Render admin tabs
    renderTabs();

    // Fetch initial datasets
    await fetchSectionData();

    // Bind search key events
    searchInput.addEventListener("input", () => {
        currentPage = 0;
        filterAndRender();
    });

    // Bind pagination clicks
    prevPageBtn.addEventListener("click", () => {
        if (currentPage > 0) {
            currentPage--;
            if (currentSection === "forms" && currentTab !== "CANCELLED") {
                fetchSectionData();
            } else {
                filterAndRender();
            }
        }
    });

    nextPageBtn.addEventListener("click", () => {
        const totalPages = getActiveTotalPages();
        if (currentPage < totalPages - 1) {
            currentPage++;
            if (currentSection === "forms" && currentTab !== "CANCELLED") {
                fetchSectionData();
            } else {
                filterAndRender();
            }
        }
    });

    // Action modals confirm click listeners
    document.getElementById("confirm-approve-event-btn").addEventListener("click", confirmApproveEvent);
    document.getElementById("confirm-reject-event-btn").addEventListener("click", confirmRejectEvent);
    document.getElementById("confirm-approve-host-btn").addEventListener("click", confirmApproveHost);
    document.getElementById("confirm-reject-host-btn").addEventListener("click", confirmRejectHost);
    document.getElementById("confirm-approve-form-btn").addEventListener("click", confirmApproveForm);
    document.getElementById("confirm-reject-form-btn").addEventListener("click", confirmRejectForm);
    document.getElementById("confirm-cancel-btn").addEventListener("click", confirmCancel);
    document.getElementById("confirm-uncancel-btn").addEventListener("click", confirmUncancel);
    document.getElementById("confirm-cancel-form-btn").addEventListener("click", confirmCancelForm);
    document.getElementById("confirm-restore-form-btn").addEventListener("click", confirmRestoreForm);

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

// Visual navigation toggles for section selector tabs
function updateSectionButtons() {
    const sections = ["events", "forms", "hosts"];
    sections.forEach(sec => {
        const btn = document.getElementById(`section-btn-${sec}`);
        if (btn) {
            if (sec === currentSection) {
                btn.className = "flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap border-action text-action";
            } else {
                btn.className = "flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all whitespace-nowrap border-transparent text-muted hover:text-ink hover:border-line-strong";
            }
        }
    });
}

// Render dynamic tabs based on selected module
function renderTabs() {
    let tabs = [];
    if (currentSection === "hosts") {
        tabs = [
            { status: "PENDING", label: "Pending", icon: "pending_actions" },
            { status: "APPROVED", label: "Approved", icon: "check_circle" },
            { status: "REJECTED", label: "Rejected", icon: "cancel" }
        ];
    } else {
        tabs = [
            { status: "PENDING", label: "Pending Requests", icon: "pending_actions" },
            { status: "APPROVED", label: "Approved", icon: "check_circle" },
            { status: "REJECTED", label: "Rejected", icon: "cancel" },
            { status: "HOSTED", label: "Hosted (Mine)", icon: "account_circle" },
            { status: "CANCELLED", label: "Cancelled", icon: "warning" }
        ];
    }

    tabsContainer.innerHTML = tabs.map(tab => {
        const isActive = tab.status === currentTab;
        return `
            <button onclick="switchTab('${tab.status}')" id="tab-btn-${tab.status}"
                class="flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-semibold text-sm transition-all whitespace-nowrap
                ${isActive 
                    ? "border-action text-action" 
                    : "border-transparent text-muted hover:text-ink hover:border-line-strong"}"
            >
                <span class="material-symbols-outlined text-[18px]">${tab.icon}</span>
                <span>${tab.label}</span>
            </button>
        `;
    }).join("");
}

// Switch main management sections
function switchSection(sectionId) {
    if (currentSection === sectionId) return;
    currentSection = sectionId;
    currentTab = "PENDING"; // Reset sub-tab
    currentPage = 0;
    searchInput.value = "";

    updateSectionButtons();
    renderTabs();
    fetchSectionData();
}
window.switchSection = switchSection;

// Switch tab views
function switchTab(status) {
    if (currentTab === status) return;
    currentTab = status;
    currentPage = 0;
    searchInput.value = "";

    renderTabs();
    fetchSectionData();
}
window.switchTab = switchTab;

// Fetch active module list data
async function fetchSectionData() {
    showLoading(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {
        if (currentSection === "events") {
            if (currentTab === "HOSTED" || currentTab === "CANCELLED") {
                const res = await fetch("/api/v1/events/hosted-events", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const body = await res.json();
                if (res.ok && body.success) {
                    eventsList = (body.data && body.data.content) || body.data || [];
                } else {
                    throw new Error(body.message || "Failed to load hosted events");
                }
            } else {
                const statusStr = currentTab.toLowerCase();
                const res = await fetch(`${API_ADMIN}/events/${statusStr}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const body = await res.json();
                if (res.ok && body.success) {
                    eventsList = body.data || [];
                } else {
                    throw new Error(body.message || "Failed to load events list");
                }
            }
        } else if (currentSection === "forms") {
            if (currentTab === "HOSTED" || currentTab === "CANCELLED") {
                const res = await fetch("/api/v1/custom-forms/my-forms", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const body = await res.json();
                if (res.ok && body.success) {
                    formsList = (body.data && body.data.content) || body.data || [];
                } else {
                    throw new Error(body.message || "Failed to load hosted forms");
                }
            } else {
                // Paginated admin custom forms fetch
                const res = await fetch(`${API_ADMIN}/custom-forms?status=${currentTab}&page=${currentPage}&size=${pageSize}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const body = await res.json();
                if (res.ok && body.success && body.data) {
                    formsList = body.data.content || [];
                    formsTotalPages = body.data.totalPages || 1;
                    formsTotalElements = body.data.totalElements || 0;
                } else {
                    throw new Error(body.message || "Failed to load custom forms");
                }
            }
        } else if (currentSection === "hosts") {
            const statusStr = currentTab.toLowerCase();
            const res = await fetch(`${API_ADMIN}/host/${statusStr}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const body = await res.json();
            if (res.ok && body.success) {
                hostsList = body.data || [];
            } else {
                throw new Error(body.message || "Failed to load host requests");
            }
        }

        // Dynamically update dashboard statistics cards
        await updateStatsCards();

        filterAndRender();
        showLoading(false);
    } catch (err) {
        console.error("fetchSectionData error:", err);
        showLoading(false);
        contentSection.classList.add("hidden");
        errorBlock.classList.remove("hidden");
        document.getElementById("admin-error-text").textContent = err.message || "Network issue loading moderation panel.";
    }
}

// Calculate and render stats counts
async function updateStatsCards() {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
        const [pEvents, aEvents, pForms, aForms, pHosts] = await Promise.all([
            fetch(`${API_ADMIN}/events/pending`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => ({}))),
            fetch(`${API_ADMIN}/events/approved`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => ({}))),
            fetch(`${API_ADMIN}/admin/custom-forms?status=PENDING&page=0&size=1`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => ({}))),
            fetch(`${API_ADMIN}/admin/custom-forms?status=APPROVED&page=0&size=1`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => ({}))),
            fetch(`${API_ADMIN}/host/pending`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json().catch(() => ({})))
        ]);

        document.getElementById("stat-pending-events").textContent = (pEvents.data && pEvents.data.length) || 0;
        document.getElementById("stat-approved-events").textContent = (aEvents.data && aEvents.data.length) || 0;
        document.getElementById("stat-pending-forms").textContent = (pForms.data && pForms.data.totalElements) || 0;
        document.getElementById("stat-approved-forms").textContent = (aForms.data && aForms.data.totalElements) || 0;
        document.getElementById("stat-pending-hosts").textContent = (pHosts.data && pHosts.data.length) || 0;
    } catch (e) {
        console.error("Stats fetch error:", e);
    }
}

// Show/Hide spinner
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

// Calculate active page count
function getActiveTotalPages() {
    if (currentSection === "forms" && currentTab !== "CANCELLED" && currentTab !== "HOSTED") {
        return formsTotalPages;
    }
    const fullList = getFilteredActiveList();
    const size = currentSection === "hosts" ? hostPageSize : pageSize;
    return Math.ceil(fullList.length / size) || 1;
}

// Local filtering for hosts/events list
function getFilteredActiveList() {
    const query = searchInput.value.toLowerCase().trim();
    let list = [];

    if (currentSection === "events") {
        if (currentTab === "CANCELLED") {
            list = eventsList.filter(e => e.eventStatus === "CANCELLED" || e.cancelled === true);
        } else if (currentTab === "HOSTED") {
            list = eventsList.filter(e => e.eventStatus !== "CANCELLED" && e.cancelled !== true);
        } else if (currentTab === "APPROVED") {
            list = eventsList.filter(e => e.eventStatus === "APPROVED" && e.cancelled !== true);
        } else {
            list = eventsList;
        }

        if (query) {
            return list.filter(e => e.title && e.title.toLowerCase().includes(query));
        }
    } else if (currentSection === "forms") {
        if (currentTab === "CANCELLED") {
            list = formsList.filter(f => f.status === "CANCELLED");
        } else if (currentTab === "HOSTED") {
            list = formsList.filter(f => f.status !== "CANCELLED");
        } else if (currentTab === "APPROVED") {
            list = formsList.filter(f => f.status === "APPROVED");
        } else {
            list = formsList;
        }

        if (query) {
            return list.filter(f => f.title && f.title.toLowerCase().includes(query));
        }
    } else if (currentSection === "hosts") {
        list = hostsList;
        if (query) {
            return list.filter(h => 
                (h.user && h.user.name && h.user.name.toLowerCase().includes(query)) ||
                (h.collegeEmail && h.collegeEmail.toLowerCase().includes(query))
            );
        }
    }
    return list;
}

// Render filtered grid/table lists
function filterAndRender() {
    eventsGridView.classList.add("hidden");
    hostsTableView.classList.add("hidden");
    emptyMsgBlock.classList.add("hidden");
    paginationSection.classList.add("hidden");

    // Check if form paginated list
    if (currentSection === "forms" && currentTab !== "CANCELLED" && currentTab !== "HOSTED") {
        if (formsList.length === 0) {
            emptyMsgBlock.classList.remove("hidden");
            emptyText.textContent = "No campus forms found.";
            return;
        }

        eventsGridView.classList.remove("hidden");
        eventsGridView.innerHTML = formsList.map(form => renderFormCard(form)).join("");

        paginationSection.classList.remove("hidden");
        paginationInfo.textContent = `Showing page ${currentPage + 1} of ${formsTotalPages}`;
        prevPageBtn.disabled = currentPage === 0;
        nextPageBtn.disabled = currentPage === formsTotalPages - 1;
    } else {
        const filtered = getFilteredActiveList();
        const total = filtered.length;
        const size = currentSection === "hosts" ? hostPageSize : pageSize;
        const totalPages = Math.ceil(total / size) || 1;

        if (total === 0) {
            emptyMsgBlock.classList.remove("hidden");
            emptyText.textContent = "No matching items found.";
            return;
        }

        const startIndex = currentPage * size;
        const slice = filtered.slice(startIndex, startIndex + size);

        if (currentSection === "hosts") {
            hostsTableView.classList.remove("hidden");
            hostsTbody.innerHTML = slice.map(h => renderHostRow(h)).join("");
        } else if (currentSection === "events") {
            eventsGridView.classList.remove("hidden");
            eventsGridView.innerHTML = slice.map(e => renderEventCard(e)).join("");
        } else if (currentSection === "forms") {
            eventsGridView.classList.remove("hidden");
            eventsGridView.innerHTML = slice.map(f => renderFormCard(f)).join("");
        }

        paginationSection.classList.remove("hidden");
        paginationInfo.textContent = `Showing page ${currentPage + 1} of ${totalPages}`;
        prevPageBtn.disabled = currentPage === 0;
        nextPageBtn.disabled = currentPage === totalPages - 1;
    }
}

// Helpers: escape strings
function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
}

function escapeJs(value) {
    return (value || "").replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Render cards and rows
function renderEventCard(event) {
    const banner = event.bannerUrl || "/images/banner-placeholder.png";
    const dateStr = formatDate(event.eventDate);
    const deadlineStr = formatDate(event.lastRegistrationDate);
    const status = event.eventStatus;

    let badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    if (status === "APPROVED") badgeClass = "bg-green-50 text-signal border-green-200";
    if (status === "REJECTED" || status === "CANCELLED") badgeClass = "bg-red-50 text-danger border-red-200";

    let pendingActions = "";
    if (currentTab === "PENDING") {
        pendingActions = `
            <div class="flex gap-2 mb-2">
                <button onclick="openApproveEventModal(${event.eventId}, '${escapeJs(event.title)}')" class="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 shadow-sm">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span> Approve
                </button>
                <button onclick="openRejectEventModal(${event.eventId}, '${escapeJs(event.title)}')" class="flex-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 shadow-sm">
                    <span class="material-symbols-outlined text-[14px]">cancel</span> Reject
                </button>
            </div>
        `;
    }

    const actionButtons = `
        <div class="flex flex-col gap-1.5 border-t border-line pt-3 mt-3">
            ${pendingActions}
            <div class="flex gap-1.5">
                <button onclick="window.location.href='/update-event/${event.eventId}'" class="flex-1 border border-line text-ink text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-canvas-sunk">
                    <span class="material-symbols-outlined text-[14px]">edit</span> Edit
                </button>
                <button onclick="window.open('/event-details/${event.eventId}', '_blank')" class="flex-1 border border-line text-ink text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-canvas-sunk">
                    <span class="material-symbols-outlined text-[14px]">visibility</span> Details
                </button>
            </div>
            <div class="flex gap-1.5">
                ${(event.eventStatus === 'CANCELLED' || event.cancelled) ? `
                    <button onclick="openRestoreEventModal(${event.eventId}, '${escapeJs(event.title)}')" class="flex-1 border border-action/30 text-action text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-action-tint">
                        <span class="material-symbols-outlined text-[14px]">restore</span> Restore
                    </button>
                ` : `
                    <button onclick="openCancelEventModal(${event.eventId}, '${escapeJs(event.title)}')" class="flex-1 border border-danger/30 text-danger text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-red-50">
                        <span class="material-symbols-outlined text-[14px]">cancel</span> Cancel
                    </button>
                `}
                <button onclick="showAttendeesView(${event.eventId}, '${escapeJs(event.title)}')" class="flex-1 bg-action-tint text-action text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-action/20">
                    <span class="material-symbols-outlined text-[14px]">group</span> Attendance
                </button>
            </div>
            <button onclick="shareLink('/event-details/${event.eventId}')" class="w-full border border-line text-muted text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-canvas-sunk">
                <span class="material-symbols-outlined text-[14px]">share</span> Share Link
            </button>
        </div>
    `;

    return `
        <div class="border border-line bg-canvas rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-200">
            <div>
                <div class="h-40 relative event-image" style="background-image: url('${banner}')">
                    <span class="absolute top-3 right-3 bg-white/90 text-ink font-mono text-[10px] px-2 py-0.5 rounded shadow-sm">
                        ${event.ticketPrice > 0 ? `$${event.ticketPrice}` : "Free"}
                    </span>
                </div>
                <div class="p-4 space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="border px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badgeClass}">${status}</span>
                        <span class="text-muted-dim text-[10px]">${escapeHtml(event.category || "General")}</span>
                    </div>
                    <h3 class="font-display font-semibold text-ink text-sm line-clamp-1">${escapeHtml(event.title)}</h3>
                    <div class="space-y-1 text-xs text-muted">
                        <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] text-action">calendar_today</span> <span>Date: ${dateStr}</span></p>
                        <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] text-action">timer</span> <span>Deadline: ${deadlineStr}</span></p>
                        <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] text-action">person</span> <span>Host: ${escapeHtml(event.university || "University Only")}</span></p>
                    </div>
                </div>
            </div>
            <div class="p-4 pt-0">${actionButtons}</div>
        </div>
    `;
}
window.renderEventCard = renderEventCard;

function renderFormCard(form) {
    const banner = form.bannerUrl || "/images/banner-placeholder.png";
    const status = form.status;

    let badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    if (status === "APPROVED") badgeClass = "bg-green-50 text-signal border-green-200";
    if (status === "REJECTED" || status === "CANCELLED") badgeClass = "bg-red-50 text-danger border-red-200";

    let pendingActions = "";
    if (currentTab === "PENDING") {
        pendingActions = `
            <div class="flex gap-2 mb-2">
                <button onclick="openApproveFormModal(${form.id}, '${escapeJs(form.title)}')" class="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 shadow-sm">
                    <span class="material-symbols-outlined text-[14px]">check_circle</span> Approve
                </button>
                <button onclick="openRejectFormModal(${form.id}, '${escapeJs(form.title)}')" class="flex-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 shadow-sm">
                    <span class="material-symbols-outlined text-[14px]">cancel</span> Reject
                </button>
            </div>
        `;
    }

    let hostedActions = "";
    if (form.status === "APPROVED" || form.status === "HOSTED" || currentTab === "HOSTED" || currentTab === "APPROVED") {
        const toggleLabel = form.acceptingResponses ? "Disable Submissions" : "Enable Submissions";
        hostedActions = `
            <button onclick="toggleResponses(${form.id}, ${form.acceptingResponses})" class="w-full mb-2 bg-canvas-sunk border border-line hover:bg-canvas-mid text-ink text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5">
                <span class="material-symbols-outlined text-[14px]">${form.acceptingResponses ? 'do_not_disturb_on' : 'check_circle'}</span> ${toggleLabel}
            </button>
        `;
    }

    const actionButtons = `
        <div class="flex flex-col gap-1.5 border-t border-line pt-3 mt-3">
            ${pendingActions}
            ${hostedActions}
            <div class="flex gap-1.5">
                <button onclick="window.location.href='/update-custom-form/${form.id}'" class="flex-1 border border-line text-ink text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-canvas-sunk">
                    <span class="material-symbols-outlined text-[14px]">edit</span> Edit
                </button>
                <button onclick="window.open('/form-details/${form.id}', '_blank')" class="flex-1 border border-line text-ink text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-canvas-sunk">
                    <span class="material-symbols-outlined text-[14px]">visibility</span> Details
                </button>
            </div>
            <div class="flex gap-1.5">
                ${form.status === 'CANCELLED' ? `
                    <button onclick="openRestoreFormModal(${form.id}, '${escapeJs(form.title)}')" class="flex-1 border border-action/30 text-action text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-action-tint">
                        <span class="material-symbols-outlined text-[14px]">restore</span> Restore
                    </button>
                ` : `
                    <button onclick="openCancelFormModal(${form.id}, '${escapeJs(form.title)}')" class="flex-1 border border-danger/30 text-danger text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-red-50">
                        <span class="material-symbols-outlined text-[14px]">cancel</span> Cancel
                    </button>
                `}
                <button onclick="window.location.href='/form-responses/${form.id}'" class="flex-1 bg-action-tint text-action text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-action/20">
                    <span class="material-symbols-outlined text-[14px]">group</span> Attendance
                </button>
            </div>
            <button onclick="shareLink('/form-details/${form.id}')" class="w-full border border-line text-muted text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-canvas-sunk">
                <span class="material-symbols-outlined text-[14px]">share</span> Share Link
            </button>
        </div>
    `;

    return `
        <div class="border border-line bg-canvas rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all duration-200">
            <div>
                <div class="h-40 relative event-image" style="background-image: url('${banner}')"></div>
                <div class="p-4 space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="border px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${badgeClass}">${status}</span>
                        <span class="text-muted-dim text-[10px] eyebrow">${escapeHtml(form.participationType || "PUBLIC")}</span>
                    </div>
                    <h3 class="font-display font-semibold text-ink text-sm line-clamp-1">${escapeHtml(form.title)}</h3>
                    <div class="space-y-1 text-xs text-muted">
                        <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] text-action">person</span> <span>Creator: ${escapeHtml(form.createdBy || "Organizer")}</span></p>
                        <p class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] text-action">timer</span> <span>Deadline: ${formatDate(form.registrationDeadLine)}</span></p>
                    </div>
                </div>
            </div>
            <div class="p-4 pt-0">${actionButtons}</div>
        </div>
    `;
}
window.renderFormCard = renderFormCard;

function renderHostRow(host) {
    const name = host.user ? host.user.name : "Unknown User";
    const univ = host.user && host.user.university ? host.user.university.name : "No University";
    const phone = host.phone || "—";
    const email = host.collegeEmail || "—";
    const date = formatDate(host.createdAt || host.appliedAt);

    let statusBadge = "";
    if (host.status === "PENDING") {
        statusBadge = `<span class="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Pending</span>`;
    } else if (host.status === "APPROVED") {
        statusBadge = `<span class="bg-green-50 text-signal border border-green-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Approved</span>`;
    } else if (host.status === "REJECTED") {
        statusBadge = `<span class="bg-red-50 text-danger border border-red-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Rejected / Revoked</span>`;
    }

    let actionBtn = "";
    if (currentTab === "PENDING") {
        actionBtn = `
            <div class="flex items-center justify-end gap-2">
                <button onclick="openApproveHostModal(${host.hostId}, '${escapeJs(name)}')" class="bg-action hover:bg-action-hover text-white text-xs font-semibold py-1 px-3 rounded transition-all shadow-sm">
                    Approve
                </button>
                <button onclick="openRejectHostModal(${host.hostId}, '${escapeJs(name)}')" class="border border-danger hover:bg-red-50 text-danger text-xs font-semibold py-1 px-3 rounded transition-all">
                    Reject
                </button>
            </div>
        `;
    } else if (currentTab === "APPROVED") {
        actionBtn = `
            <div class="flex items-center justify-end">
                <button onclick="openRejectHostModal(${host.hostId}, '${escapeJs(name)}')" class="border border-danger hover:bg-red-50 text-danger text-xs font-semibold py-1 px-3 rounded transition-all">
                    Revoke privileges
                </button>
            </div>
        `;
    } else if (currentTab === "REJECTED") {
        actionBtn = `
            <div class="flex items-center justify-end">
                <button onclick="openApproveHostModal(${host.hostId}, '${escapeJs(name)}')" class="border border-action hover:bg-action-tint text-action text-xs font-semibold py-1 px-3 rounded transition-all">
                    Re-approve
                </button>
            </div>
        `;
    }

    return `
        <tr class="hover:bg-canvas-sunk transition-colors">
            <td class="px-4 py-3">
                <div class="font-semibold text-ink">${escapeHtml(name)}</div>
                <div class="text-xs text-muted">${escapeHtml(univ)}</div>
            </td>
            <td class="px-4 py-3 text-muted">${escapeHtml(email)}</td>
            <td class="px-4 py-3 text-muted">${escapeHtml(phone)}</td>
            <td class="px-4 py-3 text-muted font-mono text-xs">${date}</td>
            <td class="px-4 py-3">${statusBadge}</td>
            <td class="px-4 py-3">${actionBtn}</td>
        </tr>
    `;
}
window.renderHostRow = renderHostRow;

// Modal triggers
function openModal(modalId) {
    document.getElementById(modalId).classList.remove("hidden");
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add("hidden");
    activeId = null;
    activeTitle = "";
    actionType = "";
}
window.closeModal = closeModal;

// Host Privileges triggers
function openApproveHostModal(hostId, name) {
    activeId = hostId;
    document.getElementById("approve-host-name").textContent = name;
    openModal("approve-host-modal");
}
window.openApproveHostModal = openApproveHostModal;

function openRejectHostModal(hostId, name) {
    activeId = hostId;
    document.getElementById("reject-host-name").textContent = name;
    openModal("reject-host-modal");
}
window.openRejectHostModal = openRejectHostModal;

async function confirmApproveHost() {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_ADMIN}/host/${activeId}/approve`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("approve-host-modal");
            await fetchSectionData();
            showToast("Host application approved successfully!", "success");
        } else {
            showToast("Failed to approve host application.", "error");
        }
    } catch (e) {
        showToast("Network error approving host.", "error");
    }
}

async function confirmRejectHost() {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_ADMIN}/host/${activeId}/reject`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("reject-host-modal");
            await fetchSectionData();
            showToast("Host application status updated.", "success");
        } else {
            showToast("Failed to reject host application.", "error");
        }
    } catch (e) {
        showToast("Network error rejecting host.", "error");
    }
}

// Event Moderation triggers
function openApproveEventModal(eventId, title) {
    activeId = eventId;
    document.getElementById("approve-event-title").textContent = title;
    openModal("approve-event-modal");
}
window.openApproveEventModal = openApproveEventModal;

function openRejectEventModal(eventId, title) {
    activeId = eventId;
    document.getElementById("reject-event-title").textContent = title;
    openModal("reject-event-modal");
}
window.openRejectEventModal = openRejectEventModal;

async function confirmApproveEvent() {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_ADMIN}/events/${activeId}/approve`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("approve-event-modal");
            await fetchSectionData();
            showToast("Event request approved successfully!", "success");
        } else {
            showToast("Failed to approve event request.", "error");
        }
    } catch (e) {
        showToast("Network error approving event.", "error");
    }
}

async function confirmRejectEvent() {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_ADMIN}/events/${activeId}/reject`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("reject-event-modal");
            await fetchSectionData();
            showToast("Event request rejected successfully.", "success");
        } else {
            showToast("Failed to reject event request.", "error");
        }
    } catch (e) {
        showToast("Network error rejecting event.", "error");
    }
}

// Hosted Event triggers
function openCancelEventModal(eventId, title) {
    activeId = eventId;
    document.getElementById("cancel-event-title").textContent = title;
    openModal("cancel-modal");
}
window.openCancelEventModal = openCancelEventModal;

async function confirmCancel() {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`/api/v1/events/${activeId}/cancel`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("cancel-modal");
            await fetchSectionData();
            showToast("Event canceled successfully!", "success");
        } else {
            showToast("Failed to cancel event listing.", "error");
        }
    } catch (e) {
        showToast("Network error canceling event.", "error");
    }
}

function openRestoreEventModal(eventId, title) {
    activeId = eventId;
    document.getElementById("uncancel-event-title").textContent = title;
    openModal("uncancel-modal");
}
window.openRestoreEventModal = openRestoreEventModal;

async function confirmUncancel() {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`/api/v1/events/${activeId}/restore`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("uncancel-modal");
            await fetchSectionData();
            showToast("Event reactivated successfully!", "success");
        } else {
            showToast("Failed to restore event listing.", "error");
        }
    } catch (e) {
        showToast("Network error restoring event.", "error");
    }
}

// Campus Form Moderation triggers
function openApproveFormModal(formId, title) {
    activeId = formId;
    document.getElementById("approve-form-title").textContent = title;
    openModal("approve-form-modal");
}
window.openApproveFormModal = openApproveFormModal;

function openRejectFormModal(formId, title) {
    activeId = formId;
    document.getElementById("reject-form-title").textContent = title;
    openModal("reject-form-modal");
}
window.openRejectFormModal = openRejectFormModal;

async function confirmApproveForm() {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_ADMIN}/custom-forms/${activeId}/approve`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("approve-form-modal");
            await fetchSectionData();
            showToast("Campus Form approved successfully!", "success");
        } else {
            showToast("Failed to approve custom form.", "error");
        }
    } catch (e) {
        showToast("Network error approving form.", "error");
    }
}

async function confirmRejectForm() {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_ADMIN}/custom-forms/${activeId}/reject`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("reject-form-modal");
            await fetchSectionData();
            showToast("Campus Form request rejected.", "success");
        } else {
            showToast("Failed to reject custom form.", "error");
        }
    } catch (e) {
        showToast("Network error rejecting form.", "error");
    }
}

// Hosted Campus Form triggers
function openCancelFormModal(formId, title) {
    activeId = formId;
    document.getElementById("cancel-form-title").textContent = title;
    openModal("cancel-form-modal");
}
window.openCancelFormModal = openCancelFormModal;

async function confirmCancelForm() {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/${activeId}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("cancel-form-modal");
            await fetchSectionData();
            showToast("Campus Form canceled successfully!", "success");
        } else {
            const body = await res.json().catch(() => ({}));
            showToast(body.message || "Failed to cancel form.", "error");
        }
    } catch (e) {
        showToast("Network error canceling form.", "error");
    }
}

function openRestoreFormModal(formId, title) {
    activeId = formId;
    document.getElementById("restore-form-title").textContent = title;
    openModal("restore-form-modal");
}
window.openRestoreFormModal = openRestoreFormModal;

async function confirmRestoreForm() {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/${activeId}/restore`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            closeModal("restore-form-modal");
            await fetchSectionData();
            showToast("Campus Form restored successfully!", "success");
        } else {
            const body = await res.json().catch(() => ({}));
            showToast(body.message || "Failed to restore form.", "error");
        }
    } catch (e) {
        showToast("Network error restoring form.", "error");
    }
}

// Toggle submissions acceptance
async function toggleResponses(formId, currentVal) {
    const token = localStorage.getItem("accessToken");
    const newVal = !currentVal;
    try {
        const res = await fetch(`${API_CUSTOM_FORM_BASE}/${formId}/accepting-responses`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newVal) // Spring maps request body boolean value
        });
        if (res.ok) {
            await fetchSectionData();
            showToast(newVal ? "Form submissions enabled." : "Form submissions disabled.", "success");
        } else {
            showToast("Failed to toggle form responses availability.", "error");
        }
    } catch (e) {
        showToast("Network error updating form status.", "error");
    }
}
window.toggleResponses = toggleResponses;

// Attendance view triggers
function showAttendeesView(eventId, eventTitle) {
    activeEventForAttendees = { eventId, title: eventTitle };
    attendeesPage = 0;
    attendeeSearchQuery = "";

    const searchInput = document.getElementById("attendeeSearch");
    if (searchInput) searchInput.value = "";

    document.getElementById("attendees-event-title").textContent = eventTitle;

    document.getElementById("admin-dashboard-view").classList.add("hidden");
    document.getElementById("attendees-view").classList.remove("hidden");

    fetchAttendeesData();
}
window.showAttendeesView = showAttendeesView;

function hideAttendeesView() {
    activeEventForAttendees = null;
    closeScanner();
    document.getElementById("attendees-view").classList.add("hidden");
    document.getElementById("admin-dashboard-view").classList.remove("hidden");
}
window.hideAttendeesView = hideAttendeesView;

async function fetchAttendeesData() {
    if (!activeEventForAttendees) return;
    const token = localStorage.getItem("accessToken");
    const tableBody = document.getElementById("attendees-table-body");
    const emptyMsg = document.getElementById("attendees-empty-msg");
    const paginationSection = document.getElementById("attendees-pagination");

    try {
        const res = await fetch(`/api/v1/tickets/${activeEventForAttendees.eventId}/audienceList?page=0&size=200`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();
        if (res.ok && body.success) {
            allAttendeesList = body.data.content || [];
            filterAndRenderAttendees();
        } else {
            throw new Error(body.message || "Failed to load attendees");
        }
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-danger font-medium">Error loading attendees: ${err.message}</td></tr>`;
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
            (a.email && a.email.toLowerCase().includes(query))
        );
    } else {
        filteredAttendees = [...allAttendeesList];
    }

    const total = filteredAttendees.length;
    const totalPages = Math.ceil(total / attendeesPageSize) || 1;

    if (attendeesPage >= totalPages) attendeesPage = totalPages - 1;
    if (attendeesPage < 0) attendeesPage = 0;

    const startIdx = attendeesPage * attendeesPageSize;
    const endIdx = Math.min(startIdx + attendeesPageSize, total);
    const slice = filteredAttendees.slice(startIdx, endIdx);

    if (total === 0) {
        tableBody.innerHTML = "";
        emptyMsg.classList.remove("hidden");
        paginationSection.classList.add("hidden");
        return;
    }

    emptyMsg.classList.add("hidden");
    paginationSection.classList.remove("hidden");
    paginationInfo.textContent = `Showing ${startIdx + 1}-${endIdx} of ${total}`;

    document.getElementById("attendees-prev-btn").disabled = attendeesPage === 0;
    document.getElementById("attendees-next-btn").disabled = attendeesPage === totalPages - 1;

    tableBody.innerHTML = slice.map(a => {
        let badge = a.checkedIn 
            ? `<span class="bg-green-50 text-signal border border-green-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">PRESENT</span>`
            : `<span class="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">ABSENT</span>`;

        const action = a.checkedIn 
            ? `<button onclick="toggleAttendance(${a.ticketId}, 'absent')" class="border border-danger/40 hover:bg-red-50 text-danger text-xs font-semibold py-1 px-3 rounded flex items-center gap-1 ml-auto"><span class="material-symbols-outlined text-[16px]">close</span> Mark Absent</button>`
            : `<button onclick="toggleAttendance(${a.ticketId}, 'present')" class="bg-action-tint hover:bg-action/20 text-action border border-action/20 text-xs font-semibold py-1 px-3 rounded flex items-center gap-1 ml-auto"><span class="material-symbols-outlined text-[16px]">check</span> Mark Present</button>`;

        return `
            <tr class="hover:bg-canvas-sunk transition-colors">
                <td class="p-3 font-semibold text-ink">${escapeHtml(a.name || "—")}</td>
                <td class="p-3 text-muted">${escapeHtml(a.email || "—")}</td>
                <td class="p-3 text-muted font-mono text-xs">${a.ticketId || "—"}</td>
                <td class="p-3">${badge}</td>
                <td class="p-3 text-right">${action}</td>
            </tr>
        `;
    }).join("");
}

async function toggleAttendance(ticketId, actionVal) {
    const token = localStorage.getItem("accessToken");
    const endPoint = actionVal === 'present' ? 'markPresent' : 'markAbsent';
    try {
        const res = await fetch(`/api/v1/tickets/${ticketId}/${endPoint}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            await fetchAttendeesData();
            showToast(`Guest marked ${actionVal} successfully!`, "success");
        } else {
            showToast("Failed to update guest attendance.", "error");
        }
    } catch (e) {
        showToast("Network error updating attendance.", "error");
    }
}
window.toggleAttendance = toggleAttendance;

// Scan tickets handlers
function openScanner() {
    openModal("scanner-modal");
    document.getElementById("scanner-status").className = "text-xs font-semibold text-amber-500 text-center animate-pulse";
    document.getElementById("scanner-status").textContent = "Requesting camera permissions...";

    html5QrCode = new Html5Qrcode("scanner-preview");
    html5QrCode.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 200, height: 200 }
        },
        onScanSuccess,
        () => {}
    ).then(() => {
        document.getElementById("scanner-status").className = "text-xs font-semibold text-signal text-center";
        document.getElementById("scanner-status").textContent = "Camera active. Scan QR code...";
    }).catch(() => {
        document.getElementById("scanner-status").className = "text-xs font-semibold text-danger text-center";
        document.getElementById("scanner-status").textContent = "Error opening camera. Verify permissions.";
    });
}
window.openScanner = openScanner;

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
window.closeScanner = closeScanner;

async function onScanSuccess(decodedText) {
    await closeScanner();
    const urlParts = decodedText.split("/");
    const ticketCode = urlParts[urlParts.length - 1];

    if (!ticketCode || isNaN(ticketCode)) {
        showToast("Invalid QR Code content scanned.", "error");
        openScanner();
        return;
    }

    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`/api/v1/tickets/${ticketCode}/checkin`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            showToast("Guest checked in successfully!", "success");
            await fetchAttendeesData();
        } else {
            showToast("Failed to process QR code check-in.", "error");
        }
    } catch (err) {
        showToast("Network error checking in guest.", "error");
    }
    openScanner();
}

// Utility: copy link
function shareLink(path) {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast("Shareable link copied to clipboard!", "success");
    }).catch(() => {
        showToast("Failed to copy link.", "error");
    });
}
window.shareLink = shareLink;

// Toast alert notification
function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full";
        document.body.appendChild(container);
    }
    
    const toast = document.createElement("div");
    toast.className = "flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 pointer-events-auto transform translate-y-[-1rem] opacity-0";
    
    if (type === "success") {
        toast.classList.add("bg-green-50", "text-emerald-500", "border-green-200");
    } else {
        toast.classList.add("bg-red-50", "text-red-500", "border-red-200");
    }
    
    const icon = type === "success" ? "check_circle" : "error";
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[20px]">${icon}</span>
        <span class="text-xs font-semibold">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove("translate-y-[-1rem]", "opacity-0");
        toast.classList.add("translate-y-0", "opacity-100");
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-[-1rem]", "opacity-0");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

document.addEventListener("DOMContentLoaded", initPage);
