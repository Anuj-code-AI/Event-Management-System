// campus-events.js — Campus events explore page logic

const EVENT_API_BASE = "/api/v1/event";
const PAGE_SIZE = 6;

let currentPage = 0;
let totalPages = 0;
let searchQuery = "";

function authHeaders() {
    const token = localStorage.getItem("accessToken");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function loadCampusEvents(page, query = "") {
    const loadingState = document.getElementById("loading-state");
    const campusSection = document.getElementById("campus-events-section");
    const eventsGrid = document.getElementById("events-grid");
    const emptyMsg = document.getElementById("events-empty-msg");
    const errorState = document.getElementById("error-state");
    const pagination = document.getElementById("events-pagination");

    if (!eventsGrid) return;

    loadingState.classList.remove("hidden");
    campusSection.classList.add("hidden");
    errorState.classList.add("hidden");
    emptyMsg.classList.add("hidden");
    eventsGrid.innerHTML = "";
    searchQuery = query;

    try {
        const pageNum = parseInt(page) || 0;
        const response = await fetch(`${EVENT_API_BASE}/getUniversityEvents?page=${pageNum}&size=${PAGE_SIZE}&query=${encodeURIComponent(query)}`, {
            headers: authHeaders()
        });

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const body = await response.json();
        const pageData = body.data;

        loadingState.classList.add("hidden");
        campusSection.classList.remove("hidden");

        const list = pageData.content || [];
        if (list.length > 0 && list[0].logoUrl) {
            const logoContainer = document.getElementById("banner-logo-container");
            if (logoContainer) {
                logoContainer.innerHTML = `<img src="${list[0].logoUrl}" alt="University Logo" class="w-12 h-12 md:w-16 md:h-16 object-contain rounded-full bg-white/10 p-1 border border-outline-variant/30 shadow-lg" />`;
                logoContainer.classList.remove("hidden");
            }
        }

        if (list.length === 0) {
            emptyMsg.classList.remove("hidden");
            pagination.classList.add("hidden");
            return;
        }

        // Render event cards
        list.forEach(event => {
            const dateText = event.lastRegistrationDate
                ? new Date(event.lastRegistrationDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : "TBA";
            const priceText = event.ticketPrice > 0 ? `₹${event.ticketPrice}` : "Free";
            const bannerUrl = event.bannerUrl || "/images/event-placeholder.jpg";

            eventsGrid.insertAdjacentHTML("beforeend", `
                <div class="bg-surface-container border border-outline-variant rounded-xl overflow-hidden hover:border-primary/30 transition-all group flex flex-col h-full animate-fade-in">
                    <a href="/eventDetails/${event.eventId}" class="block relative pt-[56.25%] overflow-hidden bg-surface-container-low shrink-0">
                        <img src="${bannerUrl}" alt="${event.title} Banner" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ${event.logoUrl ? `<span class="absolute top-sm left-sm bg-background/80 backdrop-blur-sm p-0.5 rounded-full border border-outline-variant/30 flex items-center justify-center w-8 h-8 z-10"><img src="${event.logoUrl}" alt="University Logo" class="w-full h-full object-contain rounded-full" /></span>` : ""}
                        <span class="absolute top-sm right-sm bg-surface-container-high/90 backdrop-blur-sm text-primary text-label-md font-semibold px-sm py-xs rounded-full border border-outline-variant/30 uppercase tracking-wide">
                            ${event.category || "General"}
                        </span>
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
            `);
        });

        // Set pagination
        currentPage = pageData.number;
        totalPages = pageData.totalPages;

        if (totalPages > 1) {
            pagination.classList.remove("hidden");
            document.getElementById("pagination-info").textContent = `Page ${currentPage + 1} of ${totalPages} (Total ${pageData.totalElements} events)`;
            document.getElementById("prev-page-btn").disabled = currentPage === 0;
            document.getElementById("next-page-btn").disabled = currentPage >= totalPages - 1;
        } else {
            pagination.classList.add("hidden");
        }

    } catch (err) {
        loadingState.classList.add("hidden");
        errorState.classList.remove("hidden");
        document.getElementById("error-message").textContent = "Failed to load events. " + err.message;
    }
}

async function initPage() {
    const loadingState = document.getElementById("loading-state");
    const noUnivState = document.getElementById("no-university-state");
    const campusSection = document.getElementById("campus-events-section");

    loadingState.classList.remove("hidden");
    noUnivState.classList.add("hidden");
    campusSection.classList.add("hidden");

    try {
        const user = await getCurrentUser();
        if (!user) {
            console.warn("[campusEvents] No user session found. Redirecting to login.");
            window.location.href = "/login";
            return;
        }

        loadingState.classList.add("hidden");

        if (!user.university || user.university.trim() === "") {
            noUnivState.classList.remove("hidden");
        } else {
            const bannerUnivName = document.getElementById("banner-university-name");
            if (bannerUnivName) bannerUnivName.textContent = user.university;
            document.getElementById("campus-name-heading").textContent = `Events at ${user.university}`;
            loadCampusEvents(0, "");
        }
    } catch (err) {
        console.error("[campusEvents] Init failed:", err);
        loadingState.classList.add("hidden");
        document.getElementById("error-state").classList.remove("hidden");
        document.getElementById("error-message").textContent = "An error occurred checking your profile status.";
    }
}

function retryLoad() {
    document.getElementById("error-state").classList.add("hidden");
    initPage();
}

window.retryLoad = retryLoad;

document.addEventListener("DOMContentLoaded", () => {
    initPage();

    // Pagination Listeners
    document.getElementById("prev-page-btn").addEventListener("click", () => {
        if (currentPage > 0) loadCampusEvents(currentPage - 1, searchQuery);
    });

    document.getElementById("next-page-btn").addEventListener("click", () => {
        if (currentPage < totalPages - 1) loadCampusEvents(currentPage + 1, searchQuery);
    });

    // Wire up search input from header
    const searchHeaderInput = document.getElementById("eventSearch");
    if (searchHeaderInput) {
        let debounceTimer;
        searchHeaderInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            debounceTimer = setTimeout(() => {
                const noUnivState = document.getElementById("no-university-state");
                // Only search if we are not in the "no university" state
                if (noUnivState.classList.contains("hidden")) {
                    loadCampusEvents(0, query);
                }
            }, 400);
        });
    }
});
