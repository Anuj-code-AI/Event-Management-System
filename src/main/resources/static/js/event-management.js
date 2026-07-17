// event-management.js — Personal Event & Campus Forms Management dashboard for Hosts and HODs
const API_EVENTS = "/api/v1/events";
const API_CUSTOM_FORMS = "/api/v1/custom-forms";

// State variables
let currentUser = null;
let activeDashboard = "events"; // events or forms
let eventTab = "PENDING"; // PENDING, APPROVED, REJECTED, CANCELLED
let formTab = "ALL"; // ALL, PENDING, APPROVED, REJECTED, CANCELLED
let currentPage = 0;
const pageSize = 9;

// Data caches
let hostedEventsList = [];
let hostedFormsList = [];

// Confirm Modal action state
let activeId = null;
let activeTitle = "";
let actionType = ""; // "cancel-event", "cancel-form", "delete-event", "delete-form", "restore-event", "restore-form"

// Element selections
const eventsPanel = document.getElementById("events-panel");
const formsPanel = document.getElementById("forms-panel");
const eventsGrid = document.getElementById("events-grid");
const formsGrid = document.getElementById("forms-grid");
const searchInput = document.getElementById("dashboardSearch");

const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const emptyMsgBlock = document.getElementById("dashboard-empty-msg");
const emptyMessageText = document.getElementById("empty-message-text");

// Pagination elements
const paginationSection = document.getElementById("dashboard-pagination");
const paginationInfo = document.getElementById("pagination-info");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");

// Initialize page
async function initPage() {
    currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.systemRole !== "HOD" && currentUser.hostStatus !== "APPROVED")) {
        console.warn("[hostedConsole] Unauthorized access.");
        show404Page("You do not have permission to access the Event Management dashboard.");
        return;
    }

    // Set sidebar
    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(currentUser);
    }

    // Render tabs list
    renderTabs();

    // Fetch initial datasets
    await fetchData();

    // Check manageAttendance query parameter to auto-open attendance panel
    const urlParams = new URLSearchParams(window.location.search);
    const manageAttendanceId = urlParams.get('manageAttendance');
    if (manageAttendanceId) {
        showAttendeesView(manageAttendanceId, "Event Management");
    }

    // Bind event search
    searchInput.addEventListener("input", () => {
        currentPage = 0;
        filterAndRender();
    });

    // Bind pagination buttons
    prevPageBtn.addEventListener("click", () => {
        if (currentPage > 0) {
            currentPage--;
            filterAndRender();
        }
    });

    nextPageBtn.addEventListener("click", () => {
        const totalPages = getActiveTotalPages();
        if (currentPage < totalPages - 1) {
            currentPage++;
            filterAndRender();
        }
    });

    // Wire up modal confirm buttons
    document.getElementById("confirm-cancel-btn").addEventListener("click", confirmCancel);
    document.getElementById("confirm-delete-btn").addEventListener("click", confirmDelete);
    document.getElementById("confirm-restore-btn").addEventListener("click", confirmRestore);

    // Bind attendee search & pagination
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

// Switch between Events and Campus Forms dashboard views with sliding/fading transition
function switchDashboard(section) {
    if (activeDashboard === section) return;
    activeDashboard = section;
    currentPage = 0;
    searchInput.value = "";

    const highlight = document.getElementById("switcher-highlight");
    const btnEvents = document.getElementById("switch-btn-events");
    const btnForms = document.getElementById("switch-btn-forms");
    const titleLabel = document.getElementById("header-dashboard-title");

    if (section === "events") {
        highlight.style.transform = "translateX(0%)";
        btnEvents.classList.add("text-action");
        btnEvents.classList.remove("text-muted");
        btnForms.classList.remove("text-action");
        btnForms.classList.add("text-muted");
        if (titleLabel) titleLabel.textContent = "Events Console";

        // Slide/fade transition
        formsPanel.classList.add("translate-x-8", "opacity-0");
        setTimeout(() => {
            formsPanel.classList.add("hidden");
            eventsPanel.classList.remove("hidden");
            eventsPanel.offsetHeight; // Force reflow
            eventsPanel.classList.remove("translate-x-8", "opacity-0");
            renderTabs();
            filterAndRender();
        }, 200);
    } else {
        highlight.style.transform = "translateX(100%)";
        btnForms.classList.add("text-action");
        btnForms.classList.remove("text-muted");
        btnEvents.classList.remove("text-action");
        btnEvents.classList.add("text-muted");
        if (titleLabel) titleLabel.textContent = "Forms Console";

        // Slide/fade transition
        eventsPanel.classList.add("translate-x-8", "opacity-0");
        setTimeout(() => {
            eventsPanel.classList.add("hidden");
            formsPanel.classList.remove("hidden");
            formsPanel.offsetHeight; // Force reflow
            formsPanel.classList.remove("translate-x-8", "opacity-0");
            renderTabs();
            filterAndRender();
        }, 200);
    }
}

// Render sub-tabs for the active view
function renderTabs() {
    if (activeDashboard === "events") {
        const tabs = [
            { id: "ALL", label: "All Hosted", icon: "folder_open" },
            { id: "PENDING", label: "Pending Requests", icon: "pending_actions" },
            { id: "APPROVED", label: "Approved", icon: "check_circle" },
            { id: "REJECTED", label: "Rejected Requests", icon: "cancel" },
            { id: "CANCELLED", label: "Cancelled Events", icon: "warning" }
        ];

        document.getElementById("events-tabs").innerHTML = tabs.map(tab => {
            const isActive = tab.id === eventTab;
            return `
                <button onclick="switchEventTab('${tab.id}')" id="tab-event-${tab.id}"
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
    } else {
        const tabs = [
            { id: "ALL", label: "All Hosted", icon: "folder_open" },
            { id: "PENDING", label: "Pending Forms", icon: "hourglass_empty" },
            { id: "APPROVED", label: "Approved", icon: "check_circle" },
            { id: "REJECTED", label: "Rejected Forms", icon: "cancel" },
            { id: "CANCELLED", label: "Cancelled Forms", icon: "warning" }
        ];

        document.getElementById("forms-tabs").innerHTML = tabs.map(tab => {
            const isActive = tab.id === formTab;
            return `
                <button onclick="switchFormTab('${tab.id}')" id="tab-form-${tab.id}"
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
}

// Subtabs click triggers
function switchEventTab(tabId) {
    if (eventTab === tabId) return;
    eventTab = tabId;
    currentPage = 0;
    renderTabs();
    filterAndRender();
}

function switchFormTab(tabId) {
    if (formTab === tabId) return;
    formTab = tabId;
    currentPage = 0;
    renderTabs();
    filterAndRender();
}

// Fetch console data
async function fetchData() {
    showLoading(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {
        // Fetch hosted events & hosted custom forms in parallel
        const [eventsRes, formsRes] = await Promise.all([
            fetch(`${API_EVENTS}/hosted-events?page=0&size=1000`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_CUSTOM_FORMS}/my-forms?page=0&size=1000`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const eventsBody = await eventsRes.json();
        const formsBody = await formsRes.json();

        if (eventsRes.ok && eventsBody.success) {
            hostedEventsList = eventsBody.data.content || [];
        } else {
            throw new Error(eventsBody.message || "Failed to load events");
        }

        if (formsRes.ok && formsBody.success) {
            hostedFormsList = formsBody.data.content || [];
        } else {
            throw new Error(formsBody.message || "Failed to load custom forms");
        }

        filterAndRender();
        showLoading(false);
    } catch (err) {
        console.error("fetchData error:", err);
        showLoading(false);
        eventsPanel.classList.add("hidden");
        formsPanel.classList.add("hidden");
        errorState.classList.remove("hidden");
        document.getElementById("error-message").textContent = err.message || "Network issue loading dashboard console.";
    }
}

// Show/Hide loading indicators
function showLoading(show) {
    if (show) {
        loadingState.classList.remove("hidden");
        eventsPanel.classList.add("hidden");
        formsPanel.classList.add("hidden");
        errorState.classList.add("hidden");
        emptyMsgBlock.classList.add("hidden");
        paginationSection.classList.add("hidden");
    } else {
        loadingState.classList.add("hidden");
        if (activeDashboard === "events") {
            eventsPanel.classList.remove("hidden");
        } else {
            formsPanel.classList.remove("hidden");
        }
    }
}

// Calculate active total pages for local pagination
function getActiveTotalPages() {
    const list = getFilteredList();
    return Math.ceil(list.length / pageSize) || 1;
}

// Filter lists locally
function getFilteredList() {
    const query = searchInput.value.toLowerCase().trim();
    if (activeDashboard === "events") {
        let list = hostedEventsList;
        // Filter by tab status
        if (eventTab === "ALL") {
            // Keep full list
        } else if (eventTab === "CANCELLED") {
            list = list.filter(e => e.cancelled === true || e.eventStatus === "CANCELLED");
        } else if (eventTab === "APPROVED") {
            list = list.filter(e => e.eventStatus === "APPROVED" && !e.cancelled);
        } else {
            list = list.filter(e => e.eventStatus === eventTab && !e.cancelled);
        }
        // Filter by query
        if (query) {
            list = list.filter(e => 
                (e.title && e.title.toLowerCase().includes(query)) ||
                (e.location && e.location.toLowerCase().includes(query))
            );
        }
        return list;
    } else {
        let list = hostedFormsList;
        // Filter by tab status
        if (formTab !== "ALL") {
            list = list.filter(f => f.status === formTab);
        }
        // Filter by query
        if (query) {
            list = list.filter(f => 
                (f.title && f.title.toLowerCase().includes(query))
            );
        }
        return list;
    }
}

// Render active grid list
function filterAndRender() {
    eventsGrid.innerHTML = "";
    formsGrid.innerHTML = "";
    emptyMsgBlock.classList.add("hidden");
    paginationSection.classList.add("hidden");

    const filtered = getFilteredList();
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    if (currentPage >= totalPages) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;

    const startIdx = currentPage * pageSize;
    const slice = filtered.slice(startIdx, startIdx + pageSize);

    if (totalItems === 0) {
        emptyMsgBlock.classList.remove("hidden");
        emptyMessageText.textContent = activeDashboard === "events"
            ? "No events found under this category filter."
            : "No Campus Forms found under this category filter.";
        return;
    }

    if (activeDashboard === "events") {
        eventsGrid.innerHTML = slice.map(event => renderEventCard(event)).join("");
    } else {
        formsGrid.innerHTML = slice.map(form => renderFormCard(form)).join("");
        // Fire async fetches for Campus Forms visibility & submission counts
        slice.forEach(form => {
            fetchSubmissionsCount(form.id);
            fetchFormVisibility(form.id);
        });
    }

    // Set pagination controls
    paginationSection.classList.remove("hidden");
    paginationInfo.textContent = `Showing ${startIdx + 1}-${Math.min(startIdx + pageSize, totalItems)} of ${totalItems}`;
    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = currentPage === totalPages - 1;
}

// Async fetches for Campus Form card properties (Submissions and Visibility Type)
async function fetchSubmissionsCount(formId) {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_CUSTOM_FORMS}/${formId}/responses`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();
        if (res.ok && body.success && body.data) {
            const count = body.data.length;
            const badge = document.getElementById(`form-submissions-${formId}`);
            if (badge) {
                badge.textContent = `${count} submission${count !== 1 ? 's' : ''}`;
                badge.classList.remove("hidden");
            }
        }
    } catch (e) {
        console.error("Error fetching form responses count:", e);
    }
}

async function fetchFormVisibility(formId) {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_CUSTOM_FORMS}/${formId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();
        if (res.ok && body.success && body.data) {
            const type = body.data.participationType; // PUBLIC or UNIVERSITY
            const badge = document.getElementById(`form-visibility-${formId}`);
            if (badge) {
                badge.textContent = type === "PUBLIC" ? "Public" : "University Only";
                badge.classList.remove("hidden");
            }
        }
    } catch (e) {
        console.error("Error fetching form details:", e);
    }
}

// Helpers: escape HTML and JS strings
function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
}

function escapeJs(value) {
    return (value || "").replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Format Date string
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Format Time string
function formatTime(timeStr) {
    if (!timeStr) return "TBA";
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    const hr = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hr >= 12 ? "PM" : "AM";
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${minutes} ${ampm}`;
}

// Render individual event cards
function renderEventCard(event) {
    const banner = event.bannerUrl || "/images/banner-placeholder.png";
    const priceDisplay = event.ticketPrice > 0 ? `$${event.ticketPrice.toFixed(2)}` : "Free";
    
    // Status Badge
    let statusBadge = "";
    if (event.cancelled) {
        statusBadge = `<span class="bg-red-50 text-danger border border-red-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Cancelled</span>`;
    } else if (event.eventStatus === "PENDING") {
        statusBadge = `<span class="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Pending</span>`;
    } else if (event.eventStatus === "APPROVED") {
        statusBadge = `<span class="bg-green-50 text-signal border border-green-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Approved</span>`;
    } else if (event.eventStatus === "REJECTED") {
        statusBadge = `<span class="bg-red-50 text-danger border border-red-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Rejected</span>`;
    }

    const actionButtons = `
        <div class="flex flex-col gap-1.5 border-t border-line pt-3 mt-3">
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
                    <button onclick="openRestoreModal(${event.eventId}, '${escapeJs(event.title)}', 'restore-event')" class="flex-1 border border-action/30 text-action text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-action-tint">
                        <span class="material-symbols-outlined text-[14px]">restore</span> Restore
                    </button>
                ` : `
                    <button onclick="openCancelModal(${event.eventId}, '${escapeJs(event.title)}', 'cancel-event')" class="flex-1 border border-danger/30 text-danger text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-red-50">
                        <span class="material-symbols-outlined text-[14px]">cancel</span> Cancel
                    </button>
                `}
                <button onclick="showAttendeesView(${event.eventId}, '${escapeJs(event.title)}')" class="flex-1 bg-action-tint text-action text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-action/20">
                    <span class="material-symbols-outlined text-[14px]">group</span> Attendance
                </button>
            </div>
            <button onclick="shareEventLink(${event.eventId})" class="w-full border border-line text-muted text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-canvas-sunk">
                <span class="material-symbols-outlined text-[14px]">share</span> Share Link
            </button>
        </div>
    `;

    return `
        <div class="border border-line bg-canvas rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)] hover:border-action/30 transition-all duration-300">
            <div>
                <!-- Banner Image -->
                <div class="h-44 bg-canvas-sunk border-b border-line relative overflow-hidden" onclick="window.open('/event-details/${event.eventId}', '_blank')">
                    <img class="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" src="${banner}" alt="${event.title}" onerror="this.src='/images/banner-placeholder.png'">
                    <div class="absolute top-3 right-3">
                        <span class="bg-white/95 text-ink font-semibold text-xs px-2.5 py-1 rounded shadow-sm">
                            ${priceDisplay}
                        </span>
                    </div>
                </div>

                <!-- Body Content -->
                <div class="p-4 space-y-2">
                    <div class="flex items-center justify-between">
                        ${statusBadge}
                        ${event.category ? `<span class="bg-canvas-mid text-muted text-[10px] px-2 py-0.5 rounded">${escapeHtml(event.category)}</span>` : ""}
                    </div>
                    <h3 class="font-display text-base font-bold text-ink line-clamp-1 hover:text-action cursor-pointer transition-colors" onclick="window.open('/event-details/${event.eventId}', '_blank')">${escapeHtml(event.title)}</h3>
                    
                    <div class="space-y-1 text-xs text-muted">
                        <p class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[16px] text-action">calendar_today</span>
                            <span>${formatDate(event.eventDate || event.lastRegistrationDate)}</span>
                        </p>
                        <p class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[16px] text-action">pin_drop</span>
                            <span class="line-clamp-1">${escapeHtml(event.location || "Venue TBA")}</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- Card Actions -->
            <div class="p-4 pt-0">
                ${actionButtons}
            </div>
        </div>
    `;
}

// Render individual Campus Forms cards
function renderFormCard(form) {
    const banner = form.bannerUrl || "/images/banner-placeholder.png";
    
    // Status Badge
    let statusBadge = "";
    if (form.status === "PENDING") {
        statusBadge = `<span class="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Pending</span>`;
    } else if (form.status === "APPROVED") {
        statusBadge = `<span class="bg-green-50 text-signal border border-green-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Approved</span>`;
    } else if (form.status === "REJECTED") {
        statusBadge = `<span class="bg-red-50 text-danger border border-red-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Rejected</span>`;
    } else if (form.status === "CANCELLED") {
        statusBadge = `<span class="bg-red-50 text-danger border border-red-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Cancelled</span>`;
    }

    let hostedActions = "";
    const isAccepting = form.acceptingResponses !== undefined ? form.acceptingResponses : (form.isAcceptingResponses !== undefined ? form.isAcceptingResponses : false);
    if (form.status === "APPROVED" || form.status === "HOSTED") {
        const toggleLabel = isAccepting ? "Disable Submissions" : "Enable Submissions";
        hostedActions = `
            <button onclick="toggleResponses(${form.id}, ${isAccepting})" class="w-full mb-2 bg-canvas-sunk border border-line hover:bg-canvas-mid text-ink text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5">
                <span class="material-symbols-outlined text-[14px]">${isAccepting ? 'do_not_disturb_on' : 'check_circle'}</span> ${toggleLabel}
            </button>
        `;
    }

    const actionButtons = `
        <div class="flex flex-col gap-1.5 border-t border-line pt-3 mt-3">
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
                    <button onclick="openRestoreModal(${form.id}, '${escapeJs(form.title)}', 'restore-form')" class="flex-1 border border-action/30 text-action text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-action-tint">
                        <span class="material-symbols-outlined text-[14px]">restore</span> Restore
                    </button>
                ` : `
                    <button onclick="openCancelModal(${form.id}, '${escapeJs(form.title)}', 'cancel-form')" class="flex-1 border border-danger/30 text-danger text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-red-50">
                        <span class="material-symbols-outlined text-[14px]">cancel</span> Cancel
                    </button>
                `}
                <button onclick="window.location.href='/form-responses/${form.id}'" class="flex-1 bg-action-tint text-action text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-action/20">
                    <span class="material-symbols-outlined text-[14px]">group</span> Attendance
                </button>
            </div>
            <button onclick="shareFormLink(${form.id})" class="w-full border border-line text-muted text-[11px] font-semibold py-1.5 rounded flex items-center justify-center gap-0.5 hover:bg-canvas-sunk">
                <span class="material-symbols-outlined text-[14px]">share</span> Share Link
            </button>
        </div>
    `;

    return `
        <div class="border border-line bg-canvas rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)] hover:border-action/30 transition-all duration-300">
            <div>
                <!-- Banner Image -->
                <div class="h-44 bg-canvas-sunk border-b border-line relative overflow-hidden" onclick="window.open('/form-details/${form.id}', '_blank')">
                    <img class="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" src="${banner}" alt="${form.title}" onerror="this.src='/images/banner-placeholder.png'">
                    
                    <!-- Dynamic properties fetched asynchronously -->
                    <div class="absolute top-3 left-3 flex flex-col gap-1">
                        <span id="form-visibility-${form.id}" class="hidden bg-white/95 text-ink font-semibold text-[10px] px-2 py-0.5 rounded shadow-sm">
                            Loading...
                        </span>
                        <span id="form-submissions-${form.id}" class="hidden bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-[10px] px-2 py-0.5 rounded shadow-sm">
                            Loading...
                        </span>
                    </div>
                </div>

                <!-- Body Content -->
                <div class="p-4 space-y-2">
                    <div class="flex items-center justify-between">
                        ${statusBadge}
                        <span class="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">Campus Form</span>
                    </div>
                    <h3 class="font-display text-base font-bold text-ink line-clamp-1 hover:text-action cursor-pointer transition-colors" onclick="window.open('/form-details/${form.id}', '_blank')">${escapeHtml(form.title)}</h3>
                    
                    <div class="space-y-1 text-xs text-muted">
                        <p class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[16px] text-action">calendar_today</span>
                            <span>Deadline: ${formatDate(form.registrationDeadLine || form.registrationDeadline)}</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- Card Actions -->
            <div class="p-4 pt-0">
                ${actionButtons}
            </div>
        </div>
    `;
}

// Modal open/close helpers
function openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove("hidden");
}

function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add("hidden");
    activeId = null;
    actionType = "";
}

// Dialog open triggers
function openCancelModal(id, title, type) {
    activeId = id;
    activeTitle = title;
    actionType = type;
    document.getElementById("cancel-title").textContent = title;
    openModal("cancel-modal");
}

function openRestoreModal(id, title, type) {
    activeId = id;
    activeTitle = title;
    actionType = type;
    document.getElementById("restore-title").textContent = title;
    openModal("restore-modal");
}

function openDeleteModal(id, title, type) {
    activeId = id;
    activeTitle = title;
    actionType = type;
    document.getElementById("delete-title").textContent = title;
    openModal("delete-modal");
}

// Dialog confirm action triggers
async function confirmCancel() {
    if (!activeId) return;
    const token = localStorage.getItem("accessToken");

    try {
        let res;
        if (actionType === "cancel-event") {
            res = await fetch(`${API_EVENTS}/${activeId}/cancel`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
        } else {
            res = await fetch(`${API_CUSTOM_FORMS}/${activeId}/cancel`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` }
            });
        }

        const body = await res.json();
        if (res.ok && body.success) {
            closeModal("cancel-modal");
            showToast(`"${activeTitle}" cancelled successfully!`, "success");
            await fetchData();
        } else {
            showToast(body.message || "Failed to cancel request.", "error");
        }
    } catch (e) {
        console.error("Cancel error:", e);
        showToast("Network error occurred during cancellation.", "error");
    }
}

async function confirmRestore() {
    if (!activeId) return;
    const token = localStorage.getItem("accessToken");

    try {
        let res;
        if (actionType === "restore-event") {
            res = await fetch(`${API_EVENTS}/${activeId}/restore`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
        } else {
            res = await fetch(`${API_CUSTOM_FORMS}/${activeId}/restore`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` }
            });
        }

        const body = await res.json();
        if (res.ok && body.success) {
            closeModal("restore-modal");
            showToast(`"${activeTitle}" restored successfully!`, "success");
            await fetchData();
        } else {
            showToast(body.message || "Failed to restore request.", "error");
        }
    } catch (e) {
        console.error("Restore error:", e);
        showToast("Network error occurred during restore.", "error");
    }
}

async function confirmDelete() {
    if (!activeId) return;
    const token = localStorage.getItem("accessToken");

    try {
        let res;
        if (actionType === "delete-event") {
            res = await fetch(`${API_EVENTS}/${activeId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
        } else {
            res = await fetch(`${API_CUSTOM_FORMS}/${activeId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
        }

        const body = await res.json();
        if (res.ok && body.success) {
            closeModal("delete-modal");
            showToast(`"${activeTitle}" deleted successfully!`, "success");
            await fetchData();
        } else {
            showToast(body.message || "Failed to delete request.", "error");
        }
    } catch (e) {
        console.error("Delete error:", e);
        showToast("Network error occurred during deletion.", "error");
    }
}

// Toast Feedback Notification System
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 pointer-events-auto toast-enter ${
        type === "success" 
            ? "bg-green-50 text-signal border-green-200" 
            : "bg-red-50 text-danger border-red-200"
    }`;
    
    const icon = type === "success" ? "check_circle" : "error";
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[20px]">${icon}</span>
        <span class="text-sm font-semibold">${message}</span>
    `;

    container.appendChild(toast);

    // Force reflow and slide in
    toast.offsetHeight;
    toast.classList.remove("toast-enter");
    toast.classList.add("toast-active");

    // Remove toast after delay
    setTimeout(() => {
        toast.classList.remove("toast-active");
        toast.classList.add("toast-enter");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}


// WhatsApp Event Sharing Link Utility
function shareEventLink(eventId) {
    const event = hostedEventsList.find(e => e.eventId === eventId);
    if (!event) {
        showToast("Event details not found.", "error");
        return;
    }

    if (event.eventStatus !== "APPROVED") {
        showToast("Event must be approved before sharing.", "error");
        return;
    }

    const eventUrl = `${window.location.origin}/event-details/${eventId}`;
    const cleanDesc = event.description ? (event.description.substring(0, 150) + (event.description.length > 150 ? "..." : "")) : "";
    const message = `🔥 Check out this exciting event on CampusHive! 🔥\n\n📌 *${event.title}*\n📝 ${cleanDesc}\n\n👉 *Register here:* ${eventUrl}`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
}

// Copy Campus Form URL Link to Clipboard
function shareFormLink(formId) {
    const formUrl = `${window.location.origin}/formDetails?formId=${formId}`;
    navigator.clipboard.writeText(formUrl).then(() => {
        showToast("Campus Form registration link copied to clipboard!", "success");
    }).catch(err => {
        const input = document.createElement("input");
        input.value = formUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
        showToast("Campus Form registration link copied to clipboard!", "success");
    });
}


// ATTENDANCE & AUDIENCE MANAGEMENT (For Approved Events)
// ----------------------------------------------------
const attendeesPageSize = 8;
let attendeeSearchQuery = "";
let html5QrCode = null;
let activeEventForAttendees = null;
let allAttendeesList = [];
let filteredAttendees = [];
let attendeesPage = 0;

function showAttendeesView(eventId, eventTitle) {
    activeEventForAttendees = { eventId, title: eventTitle };
    attendeesPage = 0;
    attendeeSearchQuery = "";

    const searchInput = document.getElementById("attendeeSearch");
    if (searchInput) searchInput.value = "";

    // Set header details
    document.getElementById("attendees-event-title").textContent = eventTitle;

    // Toggle views
    document.getElementById("dashboard-view").classList.add("hidden");
    document.getElementById("attendees-view").classList.remove("hidden");

    // Fetch and populate data
    fetchAttendeesData();
}

function hideAttendeesView() {
    activeEventForAttendees = null;
    closeScanner();
    document.getElementById("attendees-view").classList.add("hidden");
    document.getElementById("dashboard-view").classList.remove("hidden");
}

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
            throw new Error(body.message || "Failed to load attendees list");
        }
    } catch (err) {
        console.error("fetchAttendeesData error:", err);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="p-4 text-center text-sm text-danger">
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
            statusBadge = `<span class="bg-green-50 text-signal border border-green-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">PRESENT</span>`;
        } else {
            statusBadge = `<span class="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase">ABSENT</span>`;
        }

        const actionBtn = a.checkedIn ? `
            <button onclick="toggleAttendance(${a.ticketId}, 'absent')" class="border border-danger/50 hover:bg-red-50 text-danger font-semibold py-1 px-3 rounded text-sm transition-all flex items-center gap-1 ml-auto">
                <span class="material-symbols-outlined text-[16px]">close</span>
                <span>Mark Absent</span>
            </button>
        ` : `
            <button onclick="toggleAttendance(${a.ticketId}, 'present')" class="bg-action-tint hover:bg-action/20 text-action border border-action/20 font-semibold py-1 px-3 rounded text-sm transition-all flex items-center gap-1 ml-auto">
                <span class="material-symbols-outlined text-[16px]">check</span>
                <span>Mark Present</span>
            </button>
        `;

        return `
            <tr class="hover:bg-canvas-sunk transition-colors">
                <td class="p-3 font-semibold text-ink">${escapeHtml(a.name || "—")}</td>
                <td class="p-3 text-muted">${escapeHtml(a.email || "—")}</td>
                <td class="p-3 text-muted font-mono text-xs">${a.ticketId || "—"}</td>
                <td class="p-3">${statusBadge}</td>
                <td class="p-3 text-right">${actionBtn}</td>
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
            showToast(body.message || `Failed to mark attendee ${action}.`, "error");
        }
    } catch (err) {
        console.error("toggleAttendance error:", err);
        showToast("Network error toggling attendance.", "error");
    }
}

// Scanner Management
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
        onScanError
    ).then(() => {
        document.getElementById("scanner-status").className = "text-xs font-semibold text-signal text-center";
        document.getElementById("scanner-status").textContent = "Camera active. Scan QR code...";
    }).catch(err => {
        console.error("Scanner start error:", err);
        document.getElementById("scanner-status").className = "text-xs font-semibold text-danger text-center";
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
        const body = await res.json();

        if (res.ok && body.success) {
            showToast(`Guest checked in successfully!`, "success");
            await fetchAttendeesData();
        } else {
            showToast(body.message || "Failed to check in ticket.", "error");
        }
    } catch (err) {
        console.error("Checkin API error:", err);
        showToast("Network error checking in ticket.", "error");
    }

    openScanner();
}

function onScanError(errorMessage) {
    // Quietly ignore frame read failures
}


// CAMPUS REGISTRATION FORM RESPONSES VIEW & EXPORT FOR HOSTS
// ----------------------------------------------------
let activeFormForResponses = null;

function showResponsesView(formId, formTitle) {
    activeFormForResponses = { formId, title: formTitle };
    
    // Set header
    document.getElementById("responses-event-title").textContent = formTitle;

    // Toggle views
    document.getElementById("dashboard-view").classList.add("hidden");
    document.getElementById("responses-view").classList.remove("hidden");

    // Bind CSV export button click
    const exportBtn = document.getElementById("export-csv-btn");
    exportBtn.onclick = () => downloadResponsesCsv(formId);

    // Fetch and populate responses
    fetchResponsesData(formId);
}

function hideResponsesView() {
    activeFormForResponses = null;
    document.getElementById("responses-view").classList.add("hidden");
    document.getElementById("dashboard-view").classList.remove("hidden");
}

async function fetchResponsesData(formId) {
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
        const res = await fetch(`${API_CUSTOM_FORMS}/${formId}/responses`, {
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
                <th class="p-3 text-[11px] eyebrow text-ink font-semibold">Submission Code</th>
                <th class="p-3 text-[11px] eyebrow text-ink font-semibold">Attendee</th>
                <th class="p-3 text-[11px] eyebrow text-ink font-semibold">Email</th>
                <th class="p-3 text-[11px] eyebrow text-ink font-semibold">Submitted At</th>
            `;
            
            sampleAnswers.forEach(ans => {
                headersHtml += `<th class="p-3 text-[11px] eyebrow text-ink font-semibold">${escapeHtml(ans.fieldLabel || ans.label)}</th>`;
            });
            
            headerRow.innerHTML = headersHtml;

            // Populate rows
            submissions.forEach(sub => {
                const subDate = new Date(sub.submittedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                let rowHtml = `
                    <tr class="hover:bg-canvas-sunk transition-colors">
                        <td class="p-3 text-xs font-semibold text-action">${escapeHtml(sub.submissionCode)}</td>
                        <td class="p-3 text-xs text-ink font-medium">${escapeHtml(sub.username)}</td>
                        <td class="p-3 text-xs text-muted">${escapeHtml(sub.userEmail)}</td>
                        <td class="p-3 text-xs text-muted">${subDate}</td>
                `;

                // Map field values
                sub.answers.forEach(ans => {
                    if (ans.fileUrl) {
                        rowHtml += `
                            <td class="p-3 text-xs text-action">
                                <a href="${ans.fileUrl}" target="_blank" class="inline-flex items-center gap-1 hover:underline font-semibold">
                                    <span class="material-symbols-outlined text-[16px]">attachment</span>
                                    <span>View File</span>
                                </a>
                            </td>
                        `;
                    } else {
                        rowHtml += `<td class="p-3 text-xs text-muted">${escapeHtml(ans.value || "—")}</td>`;
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
                <td colspan="4" class="p-6 text-center text-sm text-danger font-medium">
                    Failed to fetch custom responses: ${err.message || "Network issue"}
                </td>
            </tr>
        `;
    }
}

async function downloadResponsesCsv(formId) {
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_CUSTOM_FORMS}/${formId}/responses/export`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `responses_form_${formId}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showToast("CSV exported successfully!", "success");
        } else {
            showToast("Failed to export CSV file.", "error");
        }
    } catch (err) {
        console.error("CSV download error:", err);
        showToast("A network error occurred downloading responses CSV.", "error");
    }
}

// Toggle submissions acceptance
async function toggleResponses(formId, currentVal) {
    const token = localStorage.getItem("accessToken");
    const newVal = !currentVal;
    try {
        const res = await fetch(`${API_CUSTOM_FORMS}/${formId}/accepting-responses`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newVal)
        });
        if (res.ok) {
            await fetchData();
            showToast(newVal ? "Form submissions enabled." : "Form submissions disabled.", "success");
        } else {
            showToast("Failed to toggle form responses availability.", "error");
        }
    } catch (e) {
        showToast("Network error updating form status.", "error");
    }
}
window.toggleResponses = toggleResponses;

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);
