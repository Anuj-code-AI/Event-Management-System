const CAMPUS_EVENTS_API = "/api/v1/events/university-events";
const CAMPUS_FORMS_API = "/api/v1/custom-forms/university-forms";
const PAGE_SIZE = 9;

const feeds = {
    events: { page: 0, last: false, loading: false, endpoint: CAMPUS_EVENTS_API },
    forms: { page: 0, last: false, loading: false, endpoint: CAMPUS_FORMS_API },
};
let searchQuery = "";
let searchTimer;

const SKELETON_CARD = `
<div class="overflow-hidden border border-line bg-canvas">
    <div class="skeleton h-36 bg-canvas-mid"></div>
    <div class="p-4">
        <div class="skeleton h-5 w-2/3 bg-canvas-mid rounded"></div>
        <div class="mt-4 space-y-2">
            <div class="skeleton h-3.5 w-1/2 bg-canvas-mid rounded"></div>
            <div class="skeleton h-3.5 w-1/3 bg-canvas-mid rounded"></div>
        </div>
        <div class="mt-6 flex items-center justify-between border-t border-line pt-3">
            <div class="skeleton h-3.5 w-16 bg-canvas-mid rounded"></div>
            <div class="skeleton h-3.5 w-12 bg-canvas-mid rounded"></div>
        </div>
    </div>
</div>
`;

function authHeaders() {
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
}

// Format date into a label
function dateLabel(value, prefix) {
    if (!value) return `${prefix} TBA`;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return `${prefix} TBA`;
    return `${prefix} ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

// Format ticket price label
function priceLabel(value) {
    if (value === null || value === undefined || Number(value) === 0) return "Free";
    return `$${Number(value).toFixed(2).replace(/\.00$/, "")}`;
}

// Fetch single feed page from endpoint
async function fetchPage(feedName, page) {
    const feed = feeds[feedName];
    const params = new URLSearchParams({ page, size: PAGE_SIZE });
    if (searchQuery) params.set("query", searchQuery);
    const response = await fetch(`${feed.endpoint}?${params}`, { credentials: "include", headers: authHeaders() });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const body = await response.json();
    return body.data || { content: [], last: true, number: page };
}

function imageStyle(url) {
    return url ? `style="background-image:url('${escapeHtml(url).replace(/'/g, "%27")}')"` : "";
}

// Generate Event card HTML
function eventCard(event) {
    const id = encodeURIComponent(event.eventId);
    return `<article class="group overflow-hidden border border-line bg-canvas transition hover:border-action/50 hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)]">
        <a href="/event-details/${id}" class="event-image relative block h-36" ${imageStyle(event.bannerUrl)}>
            <span class="absolute left-3 top-3 rounded bg-canvas/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">${escapeHtml(event.category || "Event")}</span>
        </a>
        <div class="p-4">
            <a href="/event-details/${id}" class="font-display text-base font-semibold text-ink group-hover:text-action">${escapeHtml(event.title || "Untitled event")}</a>
            <div class="mt-3 space-y-1.5 text-sm text-muted">
                <p><i class="fa-regular fa-calendar mr-2 w-3 text-muted-dim"></i>${escapeHtml(dateLabel(event.lastRegistrationDate, "Register by"))}</p>
                <p><i class="fa-solid fa-location-dot mr-2 w-3 text-muted-dim"></i>${escapeHtml(event.location || "Location TBA")}</p>
            </div>
            <div class="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span class="font-mono text-xs font-semibold text-ink">${escapeHtml(priceLabel(event.ticketPrice))}</span>
                <span class="text-[11px] font-medium text-signal">${escapeHtml(event.eventStatus || "OPEN")}</span>
            </div>
        </div>
    </article>`;
}

// Generate Custom Form card HTML
function formCard(form) {
    const id = encodeURIComponent(form.id);
    return `<article class="group overflow-hidden border border-line bg-canvas transition hover:border-signal/60 hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)]">
        <a href="/form-details/${id}" class="event-image relative block h-36" ${imageStyle(form.bannerUrl)}>
            <span class="absolute left-3 top-3 rounded bg-signal-tint px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-signal">Registration</span>
        </a>
        <div class="p-4">
            <a href="/form-details/${id}" class="font-display text-base font-semibold text-ink group-hover:text-signal">${escapeHtml(form.title || "Untitled form")}</a>
            <p class="mt-3 text-sm text-muted"><i class="fa-regular fa-clock mr-2 w-3 text-muted-dim"></i>${escapeHtml(dateLabel(form.registrationDeadLine, "Closes"))}</p>
            <div class="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span class="font-mono text-xs font-semibold text-ink">Open form</span>
                <span class="text-[11px] font-medium text-signal">${escapeHtml(form.status || "ACTIVE")}</span>
            </div>
        </div>
    </article>`;
}

// Toggle load-more buttons
function updateButton(feedName, label) {
    const feed = feeds[feedName];
    const button = document.getElementById(`load-more-${feedName}-btn`);
    if (!button) return;
    button.classList.toggle("hidden", feed.last && !feed.loading);
    button.disabled = feed.loading;
    button.textContent = feed.loading ? "Loading..." : label;
}

// Fetch and render feed items
async function loadFeed(feedName, reset = false) {
    const feed = feeds[feedName];
    if (feed.loading) return;
    if (reset) { feed.page = 0; feed.last = false; }
    if (feed.last && !reset) return;

    const section = document.getElementById(feedName);
    const container = document.getElementById(`${feedName === "events" ? "event" : "form"}-cards`);
    const empty = document.getElementById(`${feedName}-empty-msg`);
    const error = document.getElementById(`${feedName}-error-msg`);
    const count = document.getElementById(`${feedName}-count`);

    section.classList.remove("hidden");
    feed.loading = true;
    if (error) error.classList.add("hidden");
    updateButton(feedName, `Load more ${feedName === "events" ? "events" : "registrations"}`);

    if (reset && container) {
        container.innerHTML = Array(3).fill(SKELETON_CARD).join("");
    }

    try {
        const data = await fetchPage(feedName, feed.page);
        const items = data.content || [];
        if (reset) container.innerHTML = "";
        container.insertAdjacentHTML("beforeend", items.map(feedName === "events" ? eventCard : formCard).join(""));
        
        empty.classList.toggle("hidden", container.children.length !== 0);
        feed.page = Number.isInteger(data.number) ? data.number + 1 : feed.page + 1;
        feed.last = data.last === true;
        if (count && typeof data.totalElements === "number") {
            count.textContent = `${data.totalElements} available`;
        }
    } catch (err) {
        console.error(`loadFeed ${feedName} error:`, err);
        if (error) {
            error.textContent = `Couldn't load ${feedName}. ${err.message || "Please try again."}`;
            error.classList.remove("hidden");
        }
    } finally {
        feed.loading = false;
        updateButton(feedName, `Load more ${feedName === "events" ? "events" : "registrations"}`);
    }
}

// Initialization
async function initPage() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = "/login";
        return;
    }
    if (!user.university?.trim()) {
        document.getElementById("loading-state").classList.add("hidden");
        document.getElementById("no-university-state").classList.remove("hidden");
        return;
    }

    const univName = user.university.trim();
    document.getElementById("banner-university-name").textContent = univName;
    document.getElementById("campus-name-heading").textContent = `Events at ${univName}`;
    document.getElementById("loading-state").classList.add("hidden");

    // Fetch university list to find logo
    try {
        const response = await fetch("/api/v1/universities-list", { credentials: "include", headers: authHeaders() });
        if (response.ok) {
            const body = await response.json();
            if (body.success && Array.isArray(body.data)) {
                const matchedUniv = body.data.find(u => u.name && u.name.trim().toLowerCase() === univName.toLowerCase());
                const logoContainer = document.getElementById("banner-logo-container");
                if (matchedUniv && matchedUniv.logoUrl) {
                    logoContainer.innerHTML = `<img src="${escapeHtml(matchedUniv.logoUrl)}" alt="Logo" class="h-10 w-10 rounded-full border border-line object-contain bg-white" />`;
                    logoContainer.classList.remove("hidden");
                } else {
                    const initial = escapeHtml(univName.slice(0, 1).toUpperCase());
                    logoContainer.innerHTML = `<span class="flex h-10 w-10 items-center justify-center rounded-full bg-action-tint font-display font-semibold text-action">${initial}</span>`;
                    logoContainer.classList.remove("hidden");
                }
            }
        }
    } catch (e) {
        console.warn("Could not load university logo:", e);
        const logoContainer = document.getElementById("banner-logo-container");
        const initial = escapeHtml(univName.slice(0, 1).toUpperCase());
        logoContainer.innerHTML = `<span class="flex h-10 w-10 items-center justify-center rounded-full bg-action-tint font-display font-semibold text-action">${initial}</span>`;
        logoContainer.classList.remove("hidden");
    }

    // Load initial feeds
    loadFeed("events", true);
    loadFeed("forms", true);
}

document.addEventListener("DOMContentLoaded", () => {
    initPage();
    document.getElementById("retry-btn").addEventListener("click", () => {
        document.getElementById("error-state").classList.add("hidden");
        initPage();
    });
    document.getElementById("load-more-events-btn")?.addEventListener("click", () => loadFeed("events"));
    document.getElementById("load-more-forms-btn")?.addEventListener("click", () => loadFeed("forms"));
    document.getElementById("eventSearch").addEventListener("input", (event) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchQuery = event.target.value.trim();
            loadFeed("events", true);
            loadFeed("forms", true);
        }, 350);
    });
});
