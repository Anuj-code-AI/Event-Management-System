const EVENTS_API = "/api/v1/events/public-events";
const FORMS_API = "/api/v1/custom-forms/public-forms";
const PAGE_SIZE = 9;
const FORM_BANNER_PLACEHOLDER = "/images/banner-placeholder.png";
const EVENT_BANNER_PLACEHOLDER = "/images/eventBanner-placeholder.png";

const feeds = {
    events: { page: 0, last: false, loading: false, endpoint: EVENTS_API },
    forms: { page: 0, last: false, loading: false, endpoint: FORMS_API },
};
let searchQuery = "";
let searchTimer;

function authHeaders() {
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value == null ? "" : String(value);
    return element.innerHTML;
}

function dateLabel(value, prefix) {
    if (!value) return `${prefix} TBA`;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return `${prefix} TBA`;
    return `${prefix} ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function priceLabel(value) {
    if (value === null || value === undefined || Number(value) === 0) return "Free";
    return `$${Number(value).toFixed(2).replace(/\.00$/, "")}`;
}

async function fetchPage(feedName, page) {
    const feed = feeds[feedName];
    const params = new URLSearchParams({ page, size: PAGE_SIZE });
    if (searchQuery) params.set("query", searchQuery);
    const response = await fetch(`${feed.endpoint}?${params}`, { credentials: "include", headers: authHeaders() });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const body = await response.json();
    return body.data || { content: [], last: true, number: page };
}

function imageStyle(url, fallback) {
    const safeUrl = url || fallback;
    return `style="background-image:url('${escapeHtml(safeUrl).replace(/'/g, "%27")}')"`;
}

function eventCard(event) {
    const id = encodeURIComponent(event.eventId);
    return `<article class="group overflow-hidden border border-line bg-canvas transition hover:border-action/50 hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)]">
        <a href="/event-details/${id}" class="event-image relative block h-36" ${imageStyle(event.bannerUrl, EVENT_BANNER_PLACEHOLDER)}>
            <span class="absolute left-3 top-3 rounded bg-canvas/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">${escapeHtml(event.category || "Event")}</span>
        </a>
        <div class="p-4"><a href="/event-details/${id}" class="font-display text-base font-semibold text-ink group-hover:text-action">${escapeHtml(event.title || "Untitled event")}</a>
            <div class="mt-3 space-y-1.5 text-sm text-muted"><p><i class="fa-regular fa-calendar mr-2 w-3 text-muted-dim"></i>${escapeHtml(dateLabel(event.lastRegistrationDate, "Register by"))}</p><p><i class="fa-solid fa-location-dot mr-2 w-3 text-muted-dim"></i>${escapeHtml(event.location || "Location TBA")}</p></div>
            <div class="mt-4 flex items-center justify-between border-t border-line pt-3"><span class="font-mono text-xs font-semibold text-ink">${escapeHtml(priceLabel(event.ticketPrice))}</span><span class="text-[11px] font-medium text-signal">${escapeHtml(event.eventStatus || "OPEN")}</span></div></div></article>`;
}

function formCard(form) {
    const id = encodeURIComponent(form.id);
    return `<article class="group overflow-hidden border border-line bg-canvas transition hover:border-signal/60 hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)]">
        <a href="/form-details/${id}" class="event-image relative block h-36" ${imageStyle(form.bannerUrl, FORM_BANNER_PLACEHOLDER)}><span class="absolute left-3 top-3 rounded bg-signal-tint px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-signal">Registration</span></a>
        <div class="p-4"><a href="/form-details/${id}" class="font-display text-base font-semibold text-ink group-hover:text-signal">${escapeHtml(form.title || "Untitled form")}</a>
            <p class="mt-3 text-sm text-muted"><i class="fa-regular fa-clock mr-2 w-3 text-muted-dim"></i>${escapeHtml(dateLabel(form.registrationDeadline, "Closes"))}</p>
            <div class="mt-4 flex items-center justify-between border-t border-line pt-3"><span class="font-mono text-xs font-semibold text-ink">Open form</span><span class="text-[11px] font-medium text-signal">${escapeHtml(form.status || "ACTIVE")}</span></div></div></article>`;
}

function updateButton(feedName, label) {
    const feed = feeds[feedName];
    const button = document.getElementById(`load-more-${feedName}-btn`);
    if (!button) return;
    button.classList.toggle("hidden", feed.last && !feed.loading);
    button.disabled = feed.loading;
    button.textContent = feed.loading ? "Loading..." : label;
}

async function loadFeed(feedName, reset = false) {
    const feed = feeds[feedName];
    if (feed.loading) return;
    if (reset) { feed.page = 0; feed.last = false; }
    if (feed.last && !reset) return;
    const container = document.getElementById(`${feedName === "events" ? "event" : "form"}-cards`);
    const empty = document.getElementById(`${feedName}-empty-msg`);
    const error = document.getElementById(`${feedName}-error-msg`);
    const count = document.getElementById(`${feedName}-count`);
    feed.loading = true; error.classList.add("hidden"); updateButton(feedName, `Load more ${feedName}`);
    try {
        const data = await fetchPage(feedName, feed.page);
        const items = data.content || [];
        if (reset) container.innerHTML = "";
        container.insertAdjacentHTML("beforeend", items.map(feedName === "events" ? eventCard : formCard).join(""));
        empty.classList.toggle("hidden", container.children.length !== 0);
        feed.page = Number.isInteger(data.number) ? data.number + 1 : feed.page + 1;
        feed.last = data.last === true;
        if (count && typeof data.totalElements === "number") count.textContent = `${data.totalElements} available`;
        if (feedName === "events" && reset) renderFeatured(items[0]);
    } catch (errorValue) {
        error.textContent = `Couldn't load ${feedName}. ${errorValue.message || "Please try again."}`;
        error.classList.remove("hidden");
    } finally { feed.loading = false; updateButton(feedName, `Load more ${feedName}`); }
}

function renderFeatured(event) {
    const target = document.getElementById("featured-event");
    if (!event) { target.innerHTML = `<p class="eyebrow text-[10px] text-muted">Featured event</p><p class="mt-3 text-sm text-muted">New events will appear here as they are published.</p>`; return; }
    target.innerHTML = `<p class="eyebrow text-[10px] text-action">Featured event</p><h2 class="mt-2 font-display text-lg font-semibold text-ink">${escapeHtml(event.title || "Untitled event")}</h2><p class="mt-2 text-sm text-muted">${escapeHtml(event.location || "Location TBA")} &middot; ${escapeHtml(dateLabel(event.lastRegistrationDate, "Register by"))}</p><a class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-action hover:text-action-hover" href="/event-details/${encodeURIComponent(event.eventId)}">View details <i class="fa-solid fa-arrow-right text-xs"></i></a>`;
}

document.addEventListener("DOMContentLoaded", () => {
    loadFeed("events", true); loadFeed("forms", true);
    document.getElementById("load-more-events-btn")?.addEventListener("click", () => loadFeed("events"));
    document.getElementById("load-more-forms-btn")?.addEventListener("click", () => loadFeed("forms"));
    document.getElementById("eventSearch")?.addEventListener("input", (event) => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { searchQuery = event.target.value.trim(); loadFeed("events", true); loadFeed("forms", true); }, 350); });
});
