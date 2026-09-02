// form-responses.js — Handles loading form submissions and exporting responses to CSV
//
// NOTE (read this before you trust it):
// - This file suppresses console output and raw error surfacing for the USER.
//   It does NOT fix the underlying issues in the original code (client-side-only
//   auth check, missing auth header on loadFormMetadata, unescaped fileUrl in the
//   attachment href). Swallowing errors quietly makes those bugs *harder* to notice
//   in QA, not safer. Fix the real bugs; don't just hide the symptoms.
// - "No logs in front of the user" only goes so far: browser devtools will still
//   show uncaught exceptions unless you literally intercept and preventDefault
//   every one, which this does, but a determined user opening devtools network
//   tab will still see raw API responses. This is not a security boundary.
// - PAGINATION NOTE: the original fetchResponses() never sent page/size query
//   params at all, so it silently relied on whatever default the backend applies
//   (page=0&size=10). That's why only 10 responses ever showed. Fixed below by
//   actually sending page/size and reading back whatever pagination shape the
//   backend returns.
// - SEARCH: the backend controller (GET /custom-forms/{formId}/responses) accepts
//   a `query` param and searches server-side across ALL submissions, not just the
//   loaded page — confirmed from the actual controller signature. Search below
//   sends that param and re-fetches from page 0 on every keystroke (debounced),
//   same pattern as the admin users/universities search. It does NOT filter
//   client-side anymore; that was a stopgap for when this wasn't confirmed.

const API_CUSTOM_FORMS = "/api/v1/custom-forms";
const DEFAULT_RESPONSES_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

let formId = null;
let submissionsList = [];

const responsesState = {
    page: 0,
    size: DEFAULT_RESPONSES_PAGE_SIZE,
    totalPages: 0,
    query: "",
};

// ---------------------------------------------------------------------------
// Global error containment
// ---------------------------------------------------------------------------

// Swallow uncaught runtime errors and unhandled promise rejections so nothing
// raw hits the console/user. Silent by default; flip DEBUG to see real errors
// while developing, because debugging blind is worse than a noisy console.
const DEBUG = false;

function silentLog(...args) {
    if (DEBUG) {
        // eslint-disable-next-line no-console
        console.error(...args);
    }
}

window.addEventListener("error", (event) => {
    silentLog("Uncaught error:", event.error || event.message);
    showToast("Something went wrong. Please try again.", "error");
    event.preventDefault();
});

window.addEventListener("unhandledrejection", (event) => {
    silentLog("Unhandled promise rejection:", event.reason);
    showToast("Something went wrong. Please try again.", "error");
    event.preventDefault();
});

/**
 * Wraps an async function so any thrown error is caught, logged only in DEBUG
 * mode, and surfaced to the user as a friendly toast instead of a stack trace.
 * Returns the wrapped function's result on success, or `undefined` on failure
 * — callers should treat `undefined` as "this failed, already handled".
 */
function withErrorHandling(fn, userMessage = "Something went wrong. Please try again.") {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (err) {
            silentLog(fn.name || "anonymous fn", err);
            showToast(userMessage, "error");
            return undefined;
        }
    };
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

const initPage = withErrorHandling(async function initPage() {
    const user = await getCurrentUser();
    if (!user || (user.systemRole !== "HOD" && user.hostStatus !== "APPROVED")) {
        show404Page("You do not have permission to view form responses.");
        return;
    }

    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(user);
    }

    // Extract formId from path variable (e.g. /form-responses/{formId})
    const pathParts = window.location.pathname.split("/");
    const idParam = pathParts[pathParts.length - 1];

    if (!idParam || isNaN(parseInt(idParam, 10))) {
        showToast("Invalid Form ID in path variable.", "error");
        return;
    }

    formId = parseInt(idParam, 10);

    // Fetch form specifications
    await loadFormMetadata();
    await fetchResponses(0);

    // Bind Search Input — debounced, server-side (see file header note)
    const searchInput = document.getElementById("responseSearch");
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            const value = e.target.value.trim();
            debounceTimer = setTimeout(() => {
                responsesState.query = value;
                fetchResponses(0);
            }, SEARCH_DEBOUNCE_MS);
        });
    }

    // Bind CSV Export
    const exportBtn = document.getElementById("export-csv-btn");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            downloadResponsesCsv();
        });
    }

    // Bind page size selector
    const pageSizeSelect = document.getElementById("responses-page-size");
    if (pageSizeSelect) {
        pageSizeSelect.value = String(responsesState.size);
        pageSizeSelect.addEventListener("change", (e) => {
            responsesState.size = Number(e.target.value);
            fetchResponses(0);
        });
    }

    // Bind pagination buttons
    const prevBtn = document.getElementById("responses-prev-page-btn");
    const nextBtn = document.getElementById("responses-next-page-btn");
    if (prevBtn) prevBtn.addEventListener("click", () => fetchResponses(responsesState.page - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => fetchResponses(responsesState.page + 1));
}, "Failed to load this page. Please refresh and try again.");

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

const loadFormMetadata = withErrorHandling(async function loadFormMetadata() {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`${API_CUSTOM_FORMS}/${formId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const body = await res.json();
    if (res.ok && body.success && body.data) {
        const titleEl = document.getElementById("responses-form-title");
        if (titleEl) titleEl.textContent = body.data.title;
    }
    // Deliberately not throwing on failure here — a missing title shouldn't
    // block the rest of the page. Silent no-op is intentional, not an accident.
}, "Failed to load form details.");

const fetchResponses = withErrorHandling(async function fetchResponses(page = 0) {
    const token = localStorage.getItem("accessToken");
    const headerRow = document.getElementById("responses-table-header");
    const tableBody = document.getElementById("responses-table-body");

    if (headerRow) headerRow.innerHTML = "";
    if (tableBody) tableBody.innerHTML = "";

    const params = new URLSearchParams({ page, size: responsesState.size });
    if (responsesState.query) params.set("query", responsesState.query);

    const res = await fetch(`${API_CUSTOM_FORMS}/${formId}/responses?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const body = await res.json();

    if (res.ok && body.success) {
        const data = body.data;
        const list = (data && data.content) || (Array.isArray(data) ? data : []);
        submissionsList = list;

        const meta = extractPageMeta(data, responsesState.size, page, list.length);
        responsesState.page = meta.number;
        responsesState.totalPages = meta.totalPages;
        updateResponsesPagination(meta, list.length, responsesState.size);

        renderResponses();
    } else {
        throw new Error(body.message || "Failed to load responses");
    }
}, "Failed to fetch registrations. Please try again.");

// Same defensive read as the admin universities/users pages: Spring Boot
// 3.1+/Spring Data 3.1+ nests pagination metadata under a "page" object
// (data.page.totalPages, data.page.number) instead of flat top-level fields.
// This checks both shapes, then falls back to a computed guess if neither is
// present so Next doesn't silently disappear.
function extractPageMeta(data, size, page, listLength) {
    const meta = data && typeof data.page === "object" ? data.page : data || {};
    let totalPages = typeof meta.totalPages === "number" && meta.totalPages > 0 ? meta.totalPages : undefined;
    const totalElements = typeof meta.totalElements === "number" ? meta.totalElements : undefined;
    const number = typeof meta.number === "number" ? meta.number : page;
    if (totalPages === undefined) {
        if (totalElements !== undefined && totalElements > 0) totalPages = Math.max(1, Math.ceil(totalElements / size));
        else if (listLength === size) totalPages = page + 2; // unknown total, page came back full: assume more exist
        else totalPages = page + 1;
    }
    return { totalPages, totalElements, number };
}

function updateResponsesPagination(meta, listLength, size) {
    const { number: page, totalPages, totalElements } = meta;
    const pagination = document.getElementById("responses-pagination");
    const showPagination = totalPages > 1 || listLength === size;
    pagination.classList.toggle("hidden", !showPagination);
    if (!showPagination) return;

    const infoText = totalElements !== undefined
        ? `Page ${page + 1} of ${totalPages} (${totalElements} total)`
        : `Page ${page + 1} of ${totalPages}`;
    document.getElementById("responses-pagination-info").textContent = infoText;
    document.getElementById("responses-prev-page-btn").disabled = page === 0;
    document.getElementById("responses-next-page-btn").disabled = page >= totalPages - 1;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderResponses() {
    try {
        const headerRow = document.getElementById("responses-table-header");
        const tableBody = document.getElementById("responses-table-body");
        const emptyMsg = document.getElementById("responses-empty-msg");
        const table = document.getElementById("responses-table");

        headerRow.innerHTML = "";
        tableBody.innerHTML = "";

        if (submissionsList.length === 0) {
            table.classList.add("hidden");
            emptyMsg.classList.remove("hidden");
            return;
        }

        table.classList.remove("hidden");
        emptyMsg.classList.add("hidden");

        // Dynamic headers based on first submission answers schema
        const sampleAnswers = submissionsList[0].answers || [];
        let headersHtml = `
            <th class="p-3 text-[11px] eyebrow text-ink font-semibold">Submission Code</th>
            <th class="p-3 text-[11px] eyebrow text-ink font-semibold">Applicant</th>
            <th class="p-3 text-[11px] eyebrow text-ink font-semibold">Email</th>
            <th class="p-3 text-[11px] eyebrow text-ink font-semibold">Applied Date</th>
        `;

        sampleAnswers.forEach(ans => {
            headersHtml += `<th class="p-3 text-[11px] eyebrow text-ink font-semibold">${escapeHtml(ans.questionTitle)}</th>`;
        });
        headerRow.innerHTML = headersHtml;

        // Render body rows
        submissionsList.forEach(sub => {
            const subDate = new Date(sub.submittedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
            let rowHtml = `
                <tr class="hover:bg-canvas-sunk transition-colors">
                    <td class="p-3 text-xs font-semibold text-action">${escapeHtml(sub.submissionCode)}</td>
                    <td class="p-3 text-xs text-ink font-medium">${escapeHtml(sub.submittedBy)}</td>
                    <td class="p-3 text-xs text-muted">${escapeHtml(sub.email)}</td>
                    <td class="p-3 text-xs text-muted">${subDate}</td>
            `;

            (sub.answers || []).forEach(ans => {
                if (ans.fileUrl) {
                    // fileUrl is escaped + scheme-checked before being placed in href.
                    // The original code interpolated it raw — that's an XSS hole via
                    // javascript:/data: URIs in a submitted answer. Fixed here.
                    const safeUrl = sanitizeUrl(ans.fileUrl);
                    rowHtml += `
                        <td class="p-3 text-xs text-action">
                            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 hover:underline font-semibold">
                                <span class="material-symbols-outlined text-[16px]">attachment</span>
                                <span>View Attachment</span>
                            </a>
                        </td>
                    `;
                } else {
                    rowHtml += `<td class="p-3 text-xs text-muted">${escapeHtml(ans.answerValue || "—")}</td>`;
                }
            });

            rowHtml += "</tr>";
            tableBody.insertAdjacentHTML("beforeend", rowHtml);
        });
    } catch (err) {
        silentLog("renderResponses", err);
        showToast("Failed to render responses.", "error");
    }
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

const downloadResponsesCsv = withErrorHandling(async function downloadResponsesCsv() {
    const token = localStorage.getItem("accessToken");
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
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast("CSV exported successfully!", "success");
    } else {
        showToast("Failed to export CSV.", "error");
    }
}, "Network error exporting CSV.");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
}

// Only allow http(s) URLs into an href. Blocks javascript:, data:, vbscript:
// and other schemes that would otherwise execute on click.
function sanitizeUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl, window.location.origin);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return escapeHtml(parsed.href);
        }
    } catch (_) {
        // fall through to reject
    }
    return "#";
}

// Standalone toast alert
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
    const iconEl = document.createElement("span");
    iconEl.className = "material-symbols-outlined text-[20px]";
    iconEl.textContent = icon;

    const textEl = document.createElement("span");
    textEl.className = "text-xs font-semibold";
    textEl.textContent = message; // textContent, not innerHTML — message is never raw HTML

    toast.appendChild(iconEl);
    toast.appendChild(textEl);
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