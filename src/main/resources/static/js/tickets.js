// tickets.js — manages My Tickets display and pass cancellations
const API_TICKETS = "/api/v1/tickets";

// State management
let currentUser = null;
let currentTab = "active"; // active, used, cancelled
let currentPage = 0;
const pageSize = 5;

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
        const res = await fetch(`${API_TICKETS}/myTickets?page=0&size=1000`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();

        if (res.ok && body.success) {
            allTicketsList = body.data.content || [];
            filterAndRender();
            showLoading(false);
        } else {
            throw new Error(body.message || "Failed to load tickets");
        }
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
            ? "You don't have any active event passes." 
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

// HTML Generator: Beautiful Physical ticket look with dashed border stub
function renderTicketCard(ticket) {
    const event = ticket.event || {};
    const banner = event.bannerUrl || "/images/banner-placeholder.png";
    const priceDisplay = event.ticketPrice > 0 ? `$${event.ticketPrice.toFixed(2)}` : "Free";
    
    // Ticket Status overlays
    const isCancelled = ticket.status === "CANCELLED";
    const isUsed = ticket.status === "USED" || ticket.checkedIn;
    const isActive = ticket.status === "ACTIVE" && !ticket.checkedIn;

    let badgeClass = "bg-primary/10 text-primary border border-primary/30";
    if (isCancelled) badgeClass = "bg-error/10 text-error border border-error/30";
    else if (isUsed) badgeClass = "bg-blue-500/10 text-blue-500 border border-blue-500/30";

    // Overlay stamps
    let qrOverlay = "";
    if (isCancelled) {
        qrOverlay = `
            <div class="absolute inset-0 bg-black/85 flex items-center justify-center">
                <span class="text-error border-2 border-error/60 font-bold px-sm py-xs rounded uppercase tracking-widest text-[14px] rotate-12">VOID</span>
            </div>
        `;
    } else if (isUsed) {
        qrOverlay = `
            <div class="absolute inset-0 bg-black/80 flex items-center justify-center">
                <span class="text-blue-400 border-2 border-blue-400/60 font-bold px-xs py-xs rounded uppercase tracking-widest text-[12px] -rotate-12">CHECKED IN</span>
            </div>
        `;
    }

    return `
        <div class="glass-card rounded-xl overflow-hidden flex flex-col md:flex-row hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300">
            
            <!-- Left Info Block -->
            <div class="flex-1 p-md flex flex-col justify-between space-y-md md:border-r ticket-stub-border">
                <div class="flex flex-col md:flex-row md:items-start gap-md">
                    <!-- Event Banner Miniature -->
                    <div class="w-full md:w-32 h-20 bg-surface-container rounded-lg overflow-hidden border border-outline-variant/30 shrink-0">
                        <img class="w-full h-full object-cover" src="${banner}" alt="${event.title}" onerror="this.src='/images/banner-placeholder.png'">
                    </div>
                    
                    <!-- Meta info details -->
                    <div class="space-y-xs">
                        <div class="flex items-center gap-xs">
                            <span class="inline-block px-sm py-xs rounded text-label-md font-semibold uppercase tracking-wider ${badgeClass}">
                                ${ticket.status}
                            </span>
                            ${event.category ? `<span class="bg-surface-container-high text-on-surface-variant text-label-md px-sm py-xs rounded">${event.category}</span>` : ""}
                        </div>
                        <h3 class="text-title-lg font-bold text-on-background line-clamp-1">${event.title}</h3>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-md gap-y-xs text-body-sm text-on-surface-variant pt-xs">
                            <div class="flex items-center gap-xs">
                                <span class="material-symbols-outlined text-primary text-[18px]">calendar_today</span>
                                <span>${formatDate(event.eventDate)}</span>
                            </div>
                            <div class="flex items-center gap-xs">
                                <span class="material-symbols-outlined text-primary text-[18px]">schedule</span>
                                <span>${formatTime(event.eventTime)}</span>
                            </div>
                            <div class="flex items-center gap-xs sm:col-span-2">
                                <span class="material-symbols-outlined text-primary text-[18px]">pin_drop</span>
                                <span class="line-clamp-1">${event.location || "Venue TBA"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ticket Owner & Cancellation Row -->
                <div class="flex items-center justify-between border-t border-outline-variant/20 pt-sm">
                    <div class="text-label-md text-outline">
                        Pass Price: <span class="text-on-surface font-semibold">${priceDisplay}</span>
                    </div>
                    ${isActive ? `
                        <button onclick="openCancelModal(${ticket.ticketId}, '${event.title.replace(/'/g, "\\'")}')"
                            class="border border-error/50 hover:bg-error/10 text-error font-semibold py-xs px-sm rounded text-body-sm transition-all flex items-center justify-center gap-xs"
                        >
                            <span class="material-symbols-outlined text-[18px]">cancel</span>
                            <span>Cancel Pass</span>
                        </button>
                    ` : ""}
                </div>
            </div>

            <!-- Right QR Code Stub -->
            <div class="w-full md:w-44 bg-surface-container-low/20 shrink-0 p-md flex flex-col items-center justify-center text-center relative border-t md:border-t-0 border-outline-variant/30">
                <div class="w-28 h-28 border border-outline-variant/30 rounded overflow-hidden p-1 bg-white relative">
                    <img class="w-full h-full object-contain" src="${API_TICKETS}/${ticket.ticketId}/qr" alt="Ticket QR Entry Pass">
                    ${qrOverlay}
                </div>
                <div class="mt-sm space-y-xs">
                    <p class="text-label-md text-outline tracking-wider font-mono">CODE: ${ticket.ticketCode}</p>
                    <p class="text-label-md text-primary font-medium">Verify Entry Pass</p>
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
        } else {
            alert(body.message || "Failed to cancel ticket pass.");
        }
    } catch (err) {
        console.error("Cancel ticket error:", err);
        alert("Network error cancelling entry pass.");
    }
}

// Run initialization
document.addEventListener("DOMContentLoaded", initPage);
