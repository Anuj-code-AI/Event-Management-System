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

const API_CUSTOM_FORMS = "/api/v1/custom-forms";
let formId = null;
let submissionsList = [];
let filteredList = [];

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
    await fetchResponses();

    // Bind Search Input
    const searchInput = document.getElementById("responseSearch");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            filterAndRender(e.target.value.toLowerCase().trim());
        });
    }

    // Bind CSV Export
    const exportBtn = document.getElementById("export-csv-btn");
    if (exportBtn) {
        exportBtn.addEventListener("click", () => {
            downloadResponsesCsv();
        });
    }
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

const fetchResponses = withErrorHandling(async function fetchResponses() {
    const token = localStorage.getItem("accessToken");
    const headerRow = document.getElementById("responses-table-header");
    const tableBody = document.getElementById("responses-table-body");

    if (headerRow) headerRow.innerHTML = "";
    if (tableBody) tableBody.innerHTML = "";

    const res = await fetch(`${API_CUSTOM_FORMS}/${formId}/responses`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const body = await res.json();

    if (res.ok && body.success) {
        submissionsList = (body.data && body.data.content) || body.data || [];
        filterAndRender("");
    } else {
        throw new Error(body.message || "Failed to load responses");
    }
}, "Failed to fetch registrations. Please try again.");

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function filterAndRender(query) {
    try {
        const headerRow = document.getElementById("responses-table-header");
        const tableBody = document.getElementById("responses-table-body");
        const emptyMsg = document.getElementById("responses-empty-msg");
        const table = document.getElementById("responses-table");

        headerRow.innerHTML = "";
        tableBody.innerHTML = "";

        if (query) {
            filteredList = submissionsList.filter(s =>
                (s.submittedBy && s.submittedBy.toLowerCase().includes(query)) ||
                (s.email && s.email.toLowerCase().includes(query)) ||
                (s.submissionCode && s.submissionCode.toLowerCase().includes(query))
            );
        } else {
            filteredList = [...submissionsList];
        }

        if (filteredList.length === 0) {
            table.classList.add("hidden");
            emptyMsg.classList.remove("hidden");
            return;
        }

        table.classList.remove("hidden");
        emptyMsg.classList.add("hidden");

        // Dynamic headers based on first submission answers schema
        const sampleAnswers = filteredList[0].answers || [];
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
        filteredList.forEach(sub => {
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
        silentLog("filterAndRender", err);
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