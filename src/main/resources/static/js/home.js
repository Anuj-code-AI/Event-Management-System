// home.js — wired to the real backend.
// GET /api/v1/event/getGlobalEvents?page=N&size=10 returns a Spring Page<EventSummaryResponse>
// wrapped in ApiResponse: { success, message, data: { content, number, totalPages, last, ... }, timestamp }

const EVENTS_API_BASE = "/api/v1/event";
const PAGE_SIZE = 9;

let currentPage = 0;
let isLastPage = false;
let isLoading = false;

function authHeaders() {
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fetches one page of global events from the real API.
 * Returns the Spring Page object (content, number, totalPages, last, ...) or throws.
 */
async function fetchEventsPage(page, size, query = "") {
    const queryParam = query ? `&query=${encodeURIComponent(query)}` : "";
    const response = await fetch(
        `${EVENTS_API_BASE}/global?page=${page}&size=${size}${queryParam}`,
        { credentials: "include", headers: authHeaders() }
    );

    if (!response.ok) {
        throw new Error(`Failed to load events (${response.status})`);
    }

    const body = await response.json();
    console.log("[home.js] raw getGlobalEvents response:", body);
    // ApiResponse envelope -> body.data is the actual Spring Page
    return body.data;
}

/** Formats an ISO date string (lastRegistrationDate) into a short, readable label. */
function formatRegistrationDeadline(isoDate) {
    if (!isoDate) return "Registration date TBA";
    try {
        const date = new Date(isoDate);
        const formatted = date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
        return `Register by ${formatted}`;
    } catch {
        return "Registration date TBA";
    }
}

function formatPrice(ticketPrice) {
    if (ticketPrice === null || ticketPrice === undefined || ticketPrice === 0) return "Free";
    return `$${ticketPrice.toFixed(2).replace(/\.00$/, "")}`;
}

function eventCardHtml(ev) {
    const bannerStyle = ev.bannerUrl
        ? `background-image: url('${ev.bannerUrl}')`
        : "background-color: #171f1c";

    return `
    <article class="bg-surface-container border border-outline-variant rounded-xl overflow-hidden hover:border-primary/50 transition-colors group">
        <a href="/eventDetails/${ev.eventId}" class="block h-40 event-card-img relative" style="${bannerStyle}">
            ${ev.logoUrl ? `<span class="absolute top-sm left-sm bg-background/80 backdrop-blur-sm p-0.5 rounded-full border border-outline-variant/30 flex items-center justify-center w-8 h-8"><img src="${ev.logoUrl}" alt="University Logo" class="w-full h-full object-contain rounded-full" /></span>` : ""}
            ${ev.category ? `<span class="absolute top-sm right-sm bg-background/80 backdrop-blur-sm text-on-background text-label-md px-sm py-xs rounded-full">${ev.category}</span>` : ""}
        </a>
        <div class="p-md space-y-sm">
            <a href="/eventDetails/${ev.eventId}">
                <h3 class="text-title-lg font-semibold text-on-surface group-hover:text-primary transition-colors">${ev.title}</h3>
            </a>
            <div class="flex items-center gap-xs text-on-surface-variant text-body-sm">
                <span class="material-symbols-outlined text-[18px]">schedule</span>
                ${formatRegistrationDeadline(ev.lastRegistrationDate)}
            </div>
            <div class="flex items-center gap-xs text-on-surface-variant text-body-sm">
                <span class="material-symbols-outlined text-[18px]">location_on</span>
                ${ev.location || "Location TBA"}
            </div>
            <div class="flex items-center justify-between pt-sm">
                <span class="text-on-surface font-bold">${formatPrice(ev.ticketPrice)}</span>
                <span class="text-label-md text-on-surface-variant uppercase">${ev.eventStatus || ""}</span>
            </div>
        </div>
    </article>`;
}

function setLoadMoreVisible(visible, label) {
    const btn = document.getElementById("load-more-btn");
    if (!btn) return;
    if (visible) {
        btn.classList.remove("hidden");
        btn.disabled = false;
        btn.textContent = label || "Load More";
    } else {
        btn.classList.add("hidden");
    }
}

let searchQuery = "";

async function loadEventsPage(page, isNewSearch = false) {
    const container = document.getElementById("event-cards");
    const emptyMsg = document.getElementById("events-empty-msg");
    const errorMsg = document.getElementById("events-error-msg");
    if (!container) return;

    isLoading = true;
    if (errorMsg) errorMsg.classList.add("hidden");
    if (emptyMsg) emptyMsg.classList.add("hidden");
    setLoadMoreVisible(true, "Loading...");
    document.getElementById("load-more-btn")?.setAttribute("disabled", "true");

    try {
        const pageData = await fetchEventsPage(page, PAGE_SIZE, searchQuery);
        const events = pageData.content || [];

        if (page === 0 || isNewSearch) {
            container.innerHTML = "";
        }

        if (events.length === 0 && (page === 0 || isNewSearch)) {
            if (emptyMsg) emptyMsg.classList.remove("hidden");
        } else {
            container.insertAdjacentHTML("beforeend", events.map(eventCardHtml).join(""));
        }

        currentPage = Number.isInteger(pageData.number) ? pageData.number : page;
        isLastPage = pageData.last === true;
        setLoadMoreVisible(!isLastPage, "Load More");
    } catch (err) {
        if (errorMsg) {
            errorMsg.textContent = "Couldn't load events. " + (err.message || "");
            errorMsg.classList.remove("hidden");
        }
        setLoadMoreVisible(page > 0, "Retry"); // allow retry if it wasn't the first load
    } finally {
        isLoading = false;
    }
}

// Global search bar listener
const searchInput = document.getElementById("eventSearch");
let debounceTimer;

if (searchInput) {
    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchQuery = searchInput.value.trim();
            currentPage = 0;
            loadEventsPage(0, true);
        }, 400);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadEventsPage(0);

    const loadMoreBtn = document.getElementById("load-more-btn");
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            if (isLoading || isLastPage) return;
            loadEventsPage(currentPage + 1);
        });
    }
});