// tickets.js — manages My Tickets display and pass cancellations
const API_TICKETS = "/api/v1/tickets";

// State management
let currentUser = null;
let currentTab = "active"; // active, used, cancelled
let currentPage = 0;
const pageSize = 5;

function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
}

function imageStyle(url) {
    return url ? `style="background-image:url('${escapeHtml(url).replace(/'/g, "%27")}')"` : "";
}

// Data arrays cache
let allTicketsList = [];

// Action context
let activeTicketId = null;

// Element selections
const tabsContainer = document.getElementById("tickets-tabs");
const loadingSpinner = document.getElementById("tickets-loading");
const errorBlock = document.getElementById("tickets-error");
const contentSection = document.getElementById("tickets-content-section");
const ticketsList = document.getElementById("tickets-list");
const emptyMsgBlock = document.getElementById("tickets-empty-msg");
const emptyText = document.getElementById("tickets-empty-text");
const searchInput = document.getElementById("ticketSearch");

// Pagination elements
const paginationSection = document.getElementById("tickets-pagination");
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

    // Set sidebar
    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(currentUser);
    }

    // Render tabs list
    renderTabs();

    // Fetch datasets
    await fetchTicketsData();

    // Bind search key inputs
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
        const totalPages = Math.ceil(fullList.length / pageSize) || 1;
        if (currentPage < totalPages - 1) {
            currentPage++;
            filterAndRender();
        }
    });

    // Wire cancel button confirmation
    document.getElementById("confirm-cancel-btn").addEventListener("click", confirmCancelTicket);
}

// Render tabs
function renderTabs() {
    const tabs = [
        { id: "active", label: "Active Passes", icon: "confirmation_number" },
        { id: "used", label: "Checked In", icon: "assignment_turned_in" },
        { id: "cancelled", label: "Cancelled", icon: "cancel" }
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

    // Toggle active visual classes
    document.querySelectorAll("#tickets-tabs button").forEach(btn => {
        btn.className = btn.className
            .replace("border-primary text-primary", "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/50");
    });

    const activeBtn = document.getElementById(`tab-btn-${tabId}`);
    if (activeBtn) {
        activeBtn.className = "flex items-center gap-xs px-md py-sm border-b-2 font-medium text-body-sm transition-all whitespace-nowrap border-primary text-primary";
    }

    filterAndRender();
}

// Filter tickets by active tab and search query
function getActiveList() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    let list = [];

    // Filter by tab
    if (currentTab === "active") {
        list = allTicketsList.filter(t => t.status === "ACTIVE" && !t.checkedIn);
    } else if (currentTab === "used") {
        list = allTicketsList.filter(t => t.status === "USED" || t.checkedIn);
    } else if (currentTab === "cancelled") {
        list = allTicketsList.filter(t => t.status === "CANCELLED");
    }

    // Filter by search query
    if (searchQuery) {
        return list.filter(t => 
            t.event && t.event.title && t.event.title.toLowerCase().includes(searchQuery)
        );
    }

    return list;
}

// Fetch user's tickets
async function fetchTicketsData() {
    showLoading(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {
        // Fetch all tickets to do local filtering and slicing
        const res = await fetch(`${API_TICKETS}/my-tickets?page=0&size=1000`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json().catch(() => ({}));

        if (res.ok && body.success) {
            allTicketsList = body.data.content || [];
        } else if (res.status === 404 || (body && body.message && body.message.includes("joined any event yet"))) {
            // Gracefully handle NoTicketFoundException (404) as an empty list
            allTicketsList = [];
        } else {
            throw new Error(body.message || "Failed to load tickets");
        }

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
                    sub.status = "ACTIVE"; // Show in active passes tab
                    sub.checkedIn = false;
                    // Mock event structure for search filtering
                    sub.event = {
                        title: sub.formTitle,
                        description: "Custom Form Submission",
                        bannerUrl: sub.bannerUrl
                    };
                });
                allTicketsList = [...allTicketsList, ...submissions];
            }
        } catch (e) {
            console.error("Error loading custom form submissions for tickets:", e);
        }

        filterAndRender();
        showLoading(false);
    } catch (err) {
        console.error("fetchTicketsData error:", err);
        showLoading(false);
        contentSection.classList.add("hidden");
        errorBlock.classList.remove("hidden");
        document.getElementById("tickets-error-text").textContent = err.message || "Network issue loading tickets.";
    }
}

// Toggle loading spinner
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

// Filter and render active tickets
function filterAndRender() {
    const list = getActiveList();
    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    ticketsList.innerHTML = "";
    emptyMsgBlock.classList.add("hidden");

    if (totalItems === 0) {
        emptyMsgBlock.classList.remove("hidden");
        paginationSection.classList.add("hidden");
        emptyText.textContent = currentTab === "active" 
            ? "No ticket found, join event now" 
            : currentTab === "used" 
                ? "No checked-in passes found." 
                : "No cancelled passes found.";
        return;
    }

    const startIndex = currentPage * pageSize;
    const slice = list.slice(startIndex, startIndex + pageSize);

    ticketsList.innerHTML = slice.map(ticket => renderTicketCard(ticket)).join("");

    // Render pagination
    paginationSection.classList.remove("hidden");
    paginationInfo.textContent = `Showing page ${currentPage + 1} of ${totalPages}`;
    prevPageBtn.disabled = currentPage === 0;
    nextPageBtn.disabled = currentPage === totalPages - 1;
}

// Helper: Format Dates
function formatDate(dateStr) {
    if (!dateStr) return "TBA";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// Helper: Format Time
function formatTime(timeStr) {
    if (!timeStr) return "TBA";
    const [hours, minutes] = timeStr.split(":");
    const hr = parseInt(hours);
    const ampm = hr >= 12 ? "PM" : "AM";
    const displayHr = hr % 12 || 12;
    return `${displayHr}:${minutes} ${ampm}`;
}

// HTML Generator: Beautiful Physical ticket look with dashed border stuff
function renderTicketCard(ticket) {
    if (ticket.isCustomFormSubmission) {
        const banner = ticket.bannerUrl || "/images/banner-placeholder.png";
        const submittedAtText = ticket.submittedAt
            ? new Date(ticket.submittedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
            : "TBA";
        return `
            <div class="border border-line bg-canvas rounded-xl overflow-hidden flex flex-col md:flex-row hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)] hover:border-action/50 transition-all duration-300">
                
                <!-- Left Info Block -->
                <div class="flex-1 p-4 flex flex-col justify-between space-y-4 md:border-r ticket-stub-border">
                    <div class="flex flex-col md:flex-row md:items-start gap-4">
                        <!-- Event Banner Miniature -->
                        <div class="w-full md:w-32 h-20 bg-canvas-sunk rounded-lg overflow-hidden border border-line shrink-0">
                            <img class="w-full h-full object-cover" src="${banner}" alt="${ticket.formTitle}" onerror="this.src='/images/banner-placeholder.png'">
                        </div>
                        
                        <!-- Meta info details -->
                        <div class="space-y-1 flex-1">
                            <div class="flex items-center gap-2">
                                <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                    Custom Form
                                </span>
                                <span class="bg-action-tint text-action border border-action/20 text-[10px] px-2 py-0.5 rounded uppercase font-semibold">
                                    Submitted
                                </span>
                            </div>
                            <h3 class="text-base font-bold text-ink line-clamp-1 hover:text-action transition-colors cursor-pointer" onclick="window.open('/formDetails?formId=${ticket.formId}', '_blank')">${ticket.formTitle}</h3>
                            
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted pt-1">
                                <div class="flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-action text-[18px]">calendar_today</span>
                                    <span>Submitted At: ${submittedAtText}</span>
                                </div>
                                <div class="flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-action text-[18px]">description</span>
                                    <span class="line-clamp-1">Receipt Code: ${ticket.submissionCode}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center justify-between border-t border-line pt-3">
                        <div class="text-xs text-muted-dim">
                            Pass Price: <span class="text-ink font-semibold">Free</span>
                        </div>
                        <a href="/formDetails?formId=${ticket.formId}" target="_blank"
                           class="border border-action/50 hover:bg-action/10 text-action font-semibold py-1 px-3 rounded text-sm transition-all flex items-center justify-center gap-1"
                        >
                            <span class="material-symbols-outlined text-[18px]">open_in_new</span>
                            <span>View Form Details</span>
                        </a>
                    </div>
                </div>

                <!-- Right QR Code Stub -->
                <div class="w-full md:w-44 bg-canvas-sunk shrink-0 p-4 flex flex-col items-center justify-center text-center relative border-t md:border-t-0 border-line">
                    <div class="w-24 h-24 border border-line rounded overflow-hidden p-1 bg-canvas flex items-center justify-center relative">
                        <span class="material-symbols-outlined text-[56px] text-purple-600">task</span>
                    </div>
                    <div class="mt-2 space-y-1">
                        <p class="text-[10px] text-muted-dim tracking-wider font-mono">SUB ID: ${ticket.submissionCode}</p>
                        <p class="text-[11px] text-signal font-medium">Questionnaire Completed</p>
                    </div>
                </div>

            </div>
        `;
    }

    const event = ticket.event || {};
    const banner = event.bannerUrl || "/images/banner-placeholder.png";
    const priceDisplay = event.ticketPrice > 0 ? `$${event.ticketPrice.toFixed(2)}` : "Free";
    
    // Ticket Status overlays
    const isCancelled = ticket.status === "CANCELLED";
    const isUsed = ticket.status === "USED" || ticket.checkedIn;
    const isActive = ticket.status === "ACTIVE" && !ticket.checkedIn;

    let badgeClass = "bg-action-tint text-action border border-action/20";
    if (isCancelled) badgeClass = "bg-red-50 text-danger border border-red-200";
    else if (isUsed) badgeClass = "bg-blue-50 text-blue-600 border border-blue-200";

    // Overlay stamps
    let qrOverlay = "";
    if (isCancelled) {
        qrOverlay = `
            <div class="absolute inset-0 bg-black/85 flex items-center justify-center">
                <span class="text-danger border-2 border-danger/60 font-bold px-2 py-1 rounded uppercase tracking-widest text-[14px] rotate-12">VOID</span>
            </div>
        `;
    } else if (isUsed) {
        qrOverlay = `
            <div class="absolute inset-0 bg-black/80 flex items-center justify-center">
                <span class="text-blue-400 border-2 border-blue-400/60 font-bold px-1.5 py-1 rounded uppercase tracking-widest text-[12px] -rotate-12">CHECKED IN</span>
            </div>
        `;
    }

    return `
        <div class="border border-line bg-canvas rounded-xl overflow-hidden flex flex-col md:flex-row hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)] hover:border-action/50 transition-all duration-300">
            
            <!-- Left Info Block -->
            <div class="flex-1 p-4 flex flex-col justify-between space-y-4 md:border-r ticket-stub-border">
                <div class="flex flex-col md:flex-row md:items-start gap-4">
                    <!-- Event Banner Miniature -->
                    <div class="w-full md:w-32 h-20 bg-canvas-sunk rounded-lg overflow-hidden border border-line shrink-0">
                        <img class="w-full h-full object-cover" src="${banner}" alt="${event.title}" onerror="this.src='/images/banner-placeholder.png'">
                    </div>
                    
                    <!-- Meta info details -->
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${badgeClass}">
                                ${ticket.status}
                            </span>
                            ${event.category ? `<span class="bg-canvas-mid text-muted text-[10px] px-2 py-0.5 rounded">${event.category}</span>` : ""}
                        </div>
                        <h3 class="text-base font-bold text-ink line-clamp-1">${event.title}</h3>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted pt-1">
                            <div class="flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-action text-[18px]">calendar_today</span>
                                <span>${formatDate(event.eventDate)}</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-action text-[18px]">schedule</span>
                                <span>${formatTime(event.eventTime)}</span>
                            </div>
                            <div class="flex items-center gap-1.5 sm:col-span-2">
                                <span class="material-symbols-outlined text-action text-[18px]">pin_drop</span>
                                <span class="line-clamp-1">${event.location || "Venue TBA"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ticket Owner & Cancellation Row -->
                <div class="flex items-center justify-between border-t border-line pt-3">
                    <div class="text-xs text-muted-dim">
                        Pass Price: <span class="text-ink font-semibold">${priceDisplay}</span>
                    </div>
                    ${isActive ? `
                        <button onclick="openCancelModal(${ticket.ticketId}, '${event.title.replace(/'/g, "\\'")}')"
                            class="border border-danger/50 hover:bg-red-50 text-danger font-semibold py-1 px-3 rounded text-sm transition-all flex items-center justify-center gap-1"
                        >
                            <span class="material-symbols-outlined text-[18px]">cancel</span>
                            <span>Cancel Pass</span>
                        </button>
                    ` : ""}
                </div>
            </div>

            <!-- Right QR Code Stub -->
            <div class="w-full md:w-44 bg-canvas-sunk shrink-0 p-4 flex flex-col items-center justify-center text-center relative border-t md:border-t-0 border-line">
                <div class="w-24 h-24 border border-line rounded overflow-hidden p-1 bg-white relative">
                    <img class="w-full h-full object-contain" src="${API_TICKETS}/${ticket.ticketId}/qr" alt="Ticket QR Entry Pass">
                    ${qrOverlay}
                </div>
                <div class="mt-2 space-y-1">
                    <p class="text-[10px] text-muted-dim tracking-wider font-mono">CODE: ${ticket.ticketCode}</p>
                    <p class="text-[11px] text-signal font-medium">Verify Entry Pass</p>
                </div>
            </div>

        </div>
    `;
}
// Modal management
function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
}

function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
    activeTicketId = null;
}

function openCancelModal(id, title) {
    activeTicketId = id;
    document.getElementById("cancel-event-title").textContent = title;
    openModal("cancel-modal");
}

// Confirm ticket cancellation API call
async function confirmCancelTicket() {
    if (!activeTicketId) return;
    const token = localStorage.getItem("accessToken");
    try {
        const res = await fetch(`${API_TICKETS}/${activeTicketId}/cancel`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();
        if (res.ok && body.success) {
            closeModal("cancel-modal");
            await fetchTicketsData();
            showToast("Pass cancelled successfully!", "success");
        } else {
            showToast(body.message || "Failed to cancel ticket pass.", "error");
        }
    } catch (err) {
        console.error("Cancel ticket error:", err);
        showToast("Network error cancelling entry pass.", "error");
    }
}

// Toast notification system
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
    } else if (type === "error") {
        toast.classList.add("bg-red-50", "text-red-500", "border-red-200");
    } else {
        toast.classList.add("bg-blue-50", "text-blue-500", "border-blue-200");
    }
    
    const icon = type === "success" ? "check_circle" : type === "error" ? "error" : "info";
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

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);
