const CAMPUS_EVENTS_API = "/api/v1/events/university-events";
const CAMPUS_FORMS_API = "/api/v1/custom-forms/university-forms";
const PAGE_SIZE = 9;
let page = 0, totalPages = 0, query = "", searchTimer;

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

async function fetchPage(endpoint, requestedPage) {
    const params = new URLSearchParams({ page: requestedPage, size: PAGE_SIZE });
    if (query) params.set("query", query);
    const response = await fetch(`${endpoint}?${params}`, { credentials: "include", headers: authHeaders() });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) {
        throw new Error(body.message || `Request failed (${response.status})`);
    }
    return body.data || { content: [], last: true };
}

function imageStyle(url) {
    return url ? `style="background-image:url('${escapeHtml(url).replace(/'/g, "%27")}')"` : "";
}

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

function formCard(form) {
    const id = encodeURIComponent(form.id);
    return `<article class="group overflow-hidden border border-line bg-canvas transition hover:border-signal/60 hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)]">
        <a href="/formDetails?formId=${id}" class="event-image relative block h-36" ${imageStyle(form.bannerUrl)}>
            <span class="absolute left-3 top-3 rounded bg-signal-tint px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-signal">Registration</span>
        </a>
        <div class="p-4">
            <a href="/formDetails?formId=${id}" class="font-display text-base font-semibold text-ink group-hover:text-signal">${escapeHtml(form.title || "Untitled form")}</a>
            <p class="mt-3 text-sm text-muted"><i class="fa-regular fa-clock mr-2 w-3 text-muted-dim"></i>${escapeHtml(dateLabel(form.registrationDeadLine, "Closes"))}</p>
            <div class="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span class="font-mono text-xs font-semibold text-ink">Open form</span>
                <span class="text-[11px] font-medium text-signal">${escapeHtml(form.status || "ACTIVE")}</span>
            </div>
        </div>
    </article>`;
}

async function loadCampusEvents(requestedPage = 0) {
    const loading = document.getElementById("loading-state"),
          section = document.getElementById("campus-events-section"),
          grid = document.getElementById("events-grid"),
          empty = document.getElementById("events-empty-msg"),
          error = document.getElementById("error-state"),
          pager = document.getElementById("events-pagination");
          
    section.classList.remove("hidden");
    loading.classList.add("hidden");
    error.classList.add("hidden");
    empty.classList.add("hidden");
    pager.classList.add("hidden");
    
    // Set skeleton loader placeholders
    grid.innerHTML = Array(6).fill(SKELETON_CARD).join("");
    
    try {
        const [eventData, formData] = await Promise.all([
            fetchPage(CAMPUS_EVENTS_API, requestedPage),
            fetchPage(CAMPUS_FORMS_API, requestedPage)
        ]);
        
        const events = eventData.content || [];
        const forms = formData.content || [];
        
        const combinedHTML = [...forms.map(formCard), ...events.map(eventCard)].join("");
        grid.innerHTML = combinedHTML;
        
        empty.classList.toggle("hidden", grid.children.length !== 0);
        
        page = eventData.number ?? requestedPage;
        totalPages = Math.max(eventData.totalPages || 0, formData.totalPages || 0);
        
        const totalElements = (eventData.totalElements || 0) + (formData.totalElements || 0);
        document.getElementById("events-count").textContent = `${totalElements} available`;
        
        pager.classList.toggle("hidden", totalPages <= 1);
        document.getElementById("pagination-info").textContent = `Page ${page + 1} of ${totalPages}`;
        document.getElementById("prev-page-btn").disabled = page === 0;
        document.getElementById("next-page-btn").disabled = page >= totalPages - 1;
    } catch (errorValue) {
        grid.innerHTML = "";
        section.classList.add("hidden");
        document.getElementById("error-message").textContent = `Could not load campus listings. ${errorValue.message || "Please try again."}`;
        error.classList.remove("hidden");
    }
}

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

    loadCampusEvents();
}

document.addEventListener("DOMContentLoaded", () => {
    initPage();
    document.getElementById("retry-btn").addEventListener("click", () => loadCampusEvents(page));
    document.getElementById("prev-page-btn").addEventListener("click", () => loadCampusEvents(page - 1));
    document.getElementById("next-page-btn").addEventListener("click", () => loadCampusEvents(page + 1));
    document.getElementById("eventSearch").addEventListener("input", (event) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            query = event.target.value.trim();
            loadCampusEvents(0);
        }, 350);
    });
});
