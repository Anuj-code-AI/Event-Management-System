const ADMIN_API_BASE = "/api/v1/admin";
const UNIVERSITY_PAGE_SIZE = 6;
const USER_PAGE_SIZE = 10;

const state = {
    activeTab: "universities",
    universities: { page: 0, totalPages: 0, query: "" },
    users: { page: 0, totalPages: 0, query: "" },
    busy: false,
};

function authHeaders() {
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function escapeHtml(value) {
    const node = document.createElement("div");
    node.textContent = value == null ? "" : String(value);
    return node.innerHTML;
}

function showToast(message, success = true) {
    const toast = document.getElementById("toast");
    document.getElementById("toast-message").textContent = message;
    document.getElementById("toast-icon").innerHTML = `<i class="fa-solid fa-${success ? "circle-check" : "circle-exclamation"}"></i>`;
    toast.classList.remove("translate-y-20", "opacity-0");
    window.setTimeout(() => toast.classList.add("translate-y-20", "opacity-0"), 3500);
}

function setModal(id, open) {
    const modal = document.getElementById(id);
    modal.classList.toggle("hidden", !open);
    modal.classList.toggle("flex", open);
}

function setStatus(kind, mode, message = "") {
    ["loading", "empty", "error"].forEach((name) => document.getElementById(`${kind}-${name}-msg`).classList.toggle("hidden", name !== mode));
    if (mode === "error") document.getElementById(`${kind}-error-msg`).textContent = message;
}

async function request(path, options = {}) {
    const response = await fetch(`${ADMIN_API_BASE}${path}`, { credentials: "include", ...options, headers: { ...authHeaders(), ...options.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) throw new Error(body.message || `Request failed (${response.status})`);
    return body.data;
}

function renderUniversityCard(university) {
    const card = document.createElement("article");
    card.className = "border border-line bg-canvas p-4 transition hover:border-action/50 hover:shadow-[0_10px_28px_-18px_rgba(11,21,38,.38)]";
    const initials = escapeHtml((university.name || "U").slice(0, 1).toUpperCase());
    const logo = university.logoUrl
        ? `<img src="${escapeHtml(university.logoUrl)}" alt="" class="h-11 w-11 rounded-lg border border-line object-contain" />`
        : `<span class="flex h-11 w-11 items-center justify-center rounded-lg bg-action-tint font-display font-semibold text-action">${initials}</span>`;
    card.innerHTML = `<div class="flex items-start gap-3"><div class="shrink-0">${logo}</div><div class="min-w-0 flex-1"><h3 class="truncate font-display text-base font-semibold text-ink">${escapeHtml(university.name)}</h3><p class="mt-1 truncate font-mono text-xs text-muted">${escapeHtml(university.domain)}</p><div class="mt-4 flex gap-3"><button class="edit-university text-sm font-semibold text-action hover:text-action-hover">Edit</button><button class="delete-university text-sm font-semibold text-danger hover:underline">Delete</button></div></div></div>`;
    card.querySelector(".edit-university").addEventListener("click", () => openEditModal(university));
    card.querySelector(".delete-university").addEventListener("click", () => deleteUniversity(university));
    return card;
}

async function loadUniversities(page = 0, query = state.universities.query) {
    const grid = document.getElementById("univ-grid");
    setStatus("univ", "loading"); grid.replaceChildren();
    state.universities.query = query;
    try {
        const params = new URLSearchParams({ page, size: UNIVERSITY_PAGE_SIZE });
        if (query) params.set("query", query);
        const data = await request(`/university?${params}`);
        const list = data.content || [];
        list.forEach((university) => grid.appendChild(renderUniversityCard(university)));
        setStatus("univ", list.length ? "none" : "empty");
        state.universities.page = data.number || 0;
        state.universities.totalPages = data.totalPages || 0;
        updatePagination("univ", data, state.universities.page, state.universities.totalPages);
    } catch (error) { setStatus("univ", "error", `Could not load universities. ${error.message}`); }
}

function rolePill(role) {
    const classes = role === "SUPER_ADMIN" ? "bg-red-50 text-danger" : role === "HOD" ? "bg-signal-tint text-signal" : "bg-action-tint text-action";
    return `<span class="rounded px-2 py-1 text-[11px] font-semibold ${classes}">${escapeHtml(role)}</span>`;
}

function renderUserRow(user) {
    const row = document.createElement("tr");
    const canChange = user.systemRole !== "SUPER_ADMIN";
    const target = user.systemRole === "HOD" ? "USER" : "HOD";
    const action = canChange ? `<button class="role-button rounded-lg border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink hover:border-action hover:text-action">${target === "HOD" ? "Make HOD" : "Remove HOD"}</button>` : `<span class="text-xs text-muted">System owner</span>`;
    row.innerHTML = `<td class="px-4 py-3 font-medium text-ink">${escapeHtml(user.name || "Unnamed user")}</td><td class="px-4 py-3 text-muted">${escapeHtml(user.email || "-")}</td><td class="px-4 py-3 text-muted">${escapeHtml(user.university || "No university")}</td><td class="px-4 py-3">${rolePill(user.systemRole || "USER")}</td><td class="px-4 py-3 text-right">${action}</td>`;
    if (canChange) row.querySelector(".role-button").addEventListener("click", () => updateUserRole(user.userId, target, user.name));
    return row;
}

async function loadUsers(page = 0, query = state.users.query) {
    const body = document.getElementById("users-tbody");
    setStatus("users", "loading"); body.replaceChildren();
    state.users.query = query;
    try {
        const params = new URLSearchParams({ page, size: USER_PAGE_SIZE });
        if (query) params.set("query", query);
        const data = await request(`/users?${params}`);
        const list = data.content || [];
        list.forEach((user) => body.appendChild(renderUserRow(user)));
        setStatus("users", list.length ? "none" : "empty");
        state.users.page = data.number || 0;
        state.users.totalPages = data.totalPages || 0;
        updatePagination("users", data, state.users.page, state.users.totalPages);
    } catch (error) { setStatus("users", "error", `Could not load users. ${error.message}`); }
}

function updatePagination(kind, data, page, totalPages) {
    const pagination = document.getElementById(`${kind}-pagination`);
    pagination.classList.toggle("hidden", totalPages <= 1);
    if (totalPages <= 1) return;
    document.getElementById(kind === "univ" ? "pagination-info" : "users-pagination-info").textContent = `Page ${page + 1} of ${totalPages} (${data.totalElements} total)`;
    document.getElementById(kind === "univ" ? "prev-page-btn" : "users-prev-page-btn").disabled = page === 0;
    document.getElementById(kind === "univ" ? "next-page-btn" : "users-next-page-btn").disabled = page >= totalPages - 1;
}

function openEditModal(university) {
    document.getElementById("edit-univ-id").value = university.universityId;
    document.getElementById("edit-univ-name").value = university.name || "";
    document.getElementById("edit-univ-domain").value = university.domain || "";
    document.getElementById("edit-univ-error").classList.add("hidden");
    setModal("edit-univ-modal", true);
}

async function deleteUniversity(university) {
    if (!window.confirm(`Delete ${university.name}? This cannot be undone.`)) return;
    try { await request(`/university/${university.universityId}`, { method: "DELETE" }); showToast("University deleted"); loadUniversities(state.universities.page); }
    catch (error) { showToast(error.message, false); }
}

async function updateUserRole(userId, role, name) {
    if (state.busy || !window.confirm(`Change ${name || "this user's"} role to ${role}?`)) return;
    state.busy = true;
    try { await request(`/hod/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) }); showToast("Role updated"); loadUsers(state.users.page); }
    catch (error) { showToast(error.message, false); } finally { state.busy = false; }
}

async function submitUniversity(event, edit = false) {
    event.preventDefault();
    if (state.busy) return;
    const prefix = edit ? "edit" : "add";
    const error = document.getElementById(`${prefix}-univ-error`);
    const button = event.currentTarget.querySelector("button[type='submit']");
    error.classList.add("hidden"); state.busy = true; button.disabled = true;
    try {
        const name = document.getElementById(`${prefix}-univ-name`).value.trim();
        const domain = document.getElementById(`${prefix}-univ-domain`).value.trim();
        if (edit) {
            await request(`/university/${document.getElementById("edit-univ-id").value}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, domain }) });
            setModal("edit-univ-modal", false); showToast("University updated");
        } else {
            const form = new FormData(); form.append("name", name); form.append("domain", domain);
            const logo = document.getElementById("add-univ-logo").files[0]; if (logo) form.append("logo", logo);
            await request("/university", { method: "POST", body: form }); event.currentTarget.reset(); setModal("add-univ-modal", false); showToast("University added");
        }
        loadUniversities(0);
    } catch (errorValue) { error.textContent = errorValue.message; error.classList.remove("hidden"); }
    finally { state.busy = false; button.disabled = false; }
}

function switchTab(tab) {
    state.activeTab = tab;
    const universities = tab === "universities";
    document.getElementById("section-universities").classList.toggle("hidden", !universities);
    document.getElementById("section-users").classList.toggle("hidden", universities);
    document.getElementById("tab-univ-btn").className = universities ? "border-b-2 border-action px-4 py-3 text-sm font-semibold text-action" : "border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-muted hover:text-ink";
    document.getElementById("tab-users-btn").className = universities ? "border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-muted hover:text-ink" : "border-b-2 border-action px-4 py-3 text-sm font-semibold text-action";
    const search = document.getElementById("universitySearch"); search.value = universities ? state.universities.query : state.users.query; search.placeholder = universities ? "Search universities" : "Search users";
    universities ? loadUniversities(state.universities.page) : loadUsers(state.users.page);
}

document.addEventListener("DOMContentLoaded", async () => {
    const user = await getCurrentUser();
    if (!user || user.systemRole !== "SUPER_ADMIN") { window.location.href = "/home"; return; }
    loadUniversities();
    document.getElementById("tab-univ-btn").addEventListener("click", () => switchTab("universities"));
    document.getElementById("tab-users-btn").addEventListener("click", () => switchTab("users"));
    document.getElementById("open-add-modal-btn").addEventListener("click", () => { document.getElementById("add-univ-form").reset(); setModal("add-univ-modal", true); });
    document.querySelectorAll(".close-modal-btn").forEach((button) => button.addEventListener("click", () => { setModal("add-univ-modal", false); setModal("edit-univ-modal", false); }));
    document.getElementById("add-univ-form").addEventListener("submit", (event) => submitUniversity(event));
    document.getElementById("edit-univ-form").addEventListener("submit", (event) => submitUniversity(event, true));
    document.getElementById("prev-page-btn").addEventListener("click", () => loadUniversities(state.universities.page - 1));
    document.getElementById("next-page-btn").addEventListener("click", () => loadUniversities(state.universities.page + 1));
    document.getElementById("users-prev-page-btn").addEventListener("click", () => loadUsers(state.users.page - 1));
    document.getElementById("users-next-page-btn").addEventListener("click", () => loadUsers(state.users.page + 1));
    let timer;
    const bindSearch = (id, tab) => document.getElementById(id).addEventListener("input", (event) => { clearTimeout(timer); const query = event.target.value.trim(); document.getElementById("universitySearch").value = query; timer = setTimeout(() => tab === "universities" ? loadUniversities(0, query) : loadUsers(0, query), 350); });
    bindSearch("univ-search-input", "universities"); bindSearch("user-search-input", "users");
    document.getElementById("universitySearch").addEventListener("input", (event) => { clearTimeout(timer); const query = event.target.value.trim(); timer = setTimeout(() => state.activeTab === "universities" ? loadUniversities(0, query) : loadUsers(0, query), 350); });
});
