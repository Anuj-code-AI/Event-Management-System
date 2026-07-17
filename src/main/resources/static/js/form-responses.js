// form-responses.js — Handles loading form submissions and exporting responses to CSV
const API_CUSTOM_FORMS = "/api/v1/custom-forms";
let formId = null;
let submissionsList = [];
let filteredList = [];

// Initialize Page
async function initPage() {
    const user = await getCurrentUser();
    if (!user || (user.systemRole !== "HOD" && user.hostStatus !== "APPROVED")) {
        window.location.href = "/home";
        return;
    }

    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(user);
    }

    // Extract formId from path variable (e.g. /form-responses/{formId})
    const pathParts = window.location.pathname.split("/");
    const idParam = pathParts[pathParts.length - 1];

    if (!idParam || isNaN(parseInt(idParam))) {
        showToast("Invalid Form ID in path variable.", "error");
        return;
    }

    formId = parseInt(idParam);

    // Fetch form specifications
    await loadFormMetadata();
    await fetchResponses();

    // Bind Search Input
    const searchInput = document.getElementById("responseSearch");
    searchInput.addEventListener("input", (e) => {
        filterAndRender(e.target.value.toLowerCase().trim());
    });

    // Bind CSV Export
    document.getElementById("export-csv-btn").addEventListener("click", () => {
        downloadResponsesCsv();
    });
}

// Fetch Form Metadata
async function loadFormMetadata() {
    try {
        const res = await fetch(`${API_CUSTOM_FORMS}/${formId}`);
        const body = await res.json();
        if (res.ok && body.success && body.data) {
            document.getElementById("responses-form-title").textContent = body.data.title;
        }
    } catch (e) {
        console.error("loadFormMetadata error:", e);
    }
}

// Fetch Responses list
async function fetchResponses() {
    const token = localStorage.getItem("accessToken");
    const headerRow = document.getElementById("responses-table-header");
    const tableBody = document.getElementById("responses-table-body");
    const emptyMsg = document.getElementById("responses-empty-msg");
    const table = document.getElementById("responses-table");

    headerRow.innerHTML = "";
    tableBody.innerHTML = "";

    try {
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
    } catch (e) {
        console.error("fetchResponses error:", e);
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="p-6 text-center text-sm text-danger font-medium">
                    Failed to fetch registrations: ${e.message || "Network issue"}
                </td>
            </tr>
        `;
    }
}

// Render dynamic responses table
function filterAndRender(query) {
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

        sub.answers.forEach(ans => {
            if (ans.fileUrl) {
                rowHtml += `
                    <td class="p-3 text-xs text-action">
                        <a href="${ans.fileUrl}" target="_blank" class="inline-flex items-center gap-1 hover:underline font-semibold">
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
}

// Download CSV file
async function downloadResponsesCsv() {
    const token = localStorage.getItem("accessToken");
    try {
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
    } catch (e) {
        console.error("downloadResponsesCsv error:", e);
        showToast("Network error exporting CSV.", "error");
    }
}

// Escape Html helper
function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
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

document.addEventListener("DOMContentLoaded", initPage);
