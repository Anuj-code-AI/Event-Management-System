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
async function fetchEventsPage(page, size) {
    const response = await fetch(
        `${EVENTS_API_BASE}/global?page=${page}&size=${size}`,
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
        <a href="/events/${ev.eventId}" class="block h-40 event-card-img relative" style="${bannerStyle}">
            ${ev.category ? `<span class="absolute top-sm right-sm bg-background/80 backdrop-blur-sm text-on-background text-label-md px-sm py-xs rounded-full">${ev.category}</span>` : ""}
        </a>
        <div class="p-md space-y-sm">
            <a href="/events/${ev.eventId}">
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

async function loadEventsPage(page) {
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
        const pageData = await fetchEventsPage(page, PAGE_SIZE);
        const events = pageData.content || [];

        if (page === 0) {
            container.innerHTML = "";
        }

        if (events.length === 0 && page === 0) {
            if (emptyMsg) emptyMsg.classList.remove("hidden");
        } else {
            container.insertAdjacentHTML("beforeend", events.map(eventCardHtml).join(""));
        }

        currentPage = Number.isInteger(pageData.number) ? pageData.number : page;
        isLastPage = pageData.last === true;
        if (!Number.isInteger(pageData.number)) {
            console.warn(
                "[home.js] pageData.number was not a valid integer — got:",
                pageData.number,
                "Falling back to requested page:", page,
                "Full pageData:", pageData
            );
        }
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
//h

const searchInput = document.getElementById("eventSearch");

let debounceTimer;

searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        const query = searchInput.value.trim();

        loadEvents(query);
    }, 400);
});

async function loadEvents(query = "") {
    try {
        const url = query
            ? `/api/v1/event/global?query=${encodeURIComponent(query)}&page=0&size=10`
            : `/api/v1/event/global?page=0&size=10`;

        const response = await fetch(url);
        const data = await response.json();

        console.log(data.data.content);

        renderEvents(data.data.content);

    } catch (error) {
        console.error("Failed to load events:", error);
    }
}

function renderEvents(events) {
    const container = document.getElementById("eventsContainer");

    container.innerHTML = "";

    events.forEach(event => {
        container.innerHTML += `
            <div class="event-card">
                <h3>${event.title}</h3>
                <p>${event.location}</p>
            </div>
        `;
    });
}
//h
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