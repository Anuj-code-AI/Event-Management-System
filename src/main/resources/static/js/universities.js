// universities.js — University and HOD administration logic.
// Protected by SUPER_ADMIN pre-authorization.

const ADMIN_API_BASE = "/api/v1/admin";
const PAGE_SIZE = 6;
const USER_PAGE_SIZE = 10;

// Universities State
let currentUnivPage = 0;
let totalUnivPages = 0;
let univQuery = "";

// Users State
let currentUsersPage = 0;
let totalUsersPages = 0;
let usersQuery = "";

let activeTab = "universities"; // "universities" or "users"
let isSubmitting = false;

// Return standard auth header
function authHeaders() {
    const token = localStorage.getItem("accessToken");
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

// Show Toast message
function showToast(message, isSuccess = true) {
    const toast = document.getElementById("toast");
    const toastIcon = document.getElementById("toast-icon");
    const toastMessage = document.getElementById("toast-message");

    if (!toast || !toastIcon || !toastMessage) return;

    toastMessage.textContent = message;
    if (isSuccess) {
        toastIcon.textContent = "check_circle";
        toastIcon.className = "material-symbols-outlined text-primary";
    } else {
        toastIcon.textContent = "error";
        toastIcon.className = "material-symbols-outlined text-error";
    }

    toast.classList.remove("translate-y-24", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");

    setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-24", "opacity-0");
    }, 4000);
}

// Modal open/close actions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.remove("opacity-0");
        modal.querySelector("div").classList.remove("scale-95");
    }, 10);
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("opacity-0");
    modal.querySelector("div").classList.add("scale-95");
    setTimeout(() => {
        modal.classList.add("hidden");
    }, 200);
}

// Fetch all universities for the grid
async function fetchUniversities(page, query = "") {
    const loadingMsg = document.getElementById("univ-loading-msg");
    const emptyMsg = document.getElementById("univ-empty-msg");
    const errorMsg = document.getElementById("univ-error-msg");
    const grid = document.getElementById("univ-grid");
    const pagination = document.getElementById("univ-pagination");

    if (!grid) return;

    loadingMsg.classList.remove("hidden");
    emptyMsg.classList.add("hidden");
    errorMsg.classList.add("hidden");
    grid.innerHTML = "";
    univQuery = query;

    try {
        const pageNum = parseInt(page) || 0;
        const response = await fetch(`${ADMIN_API_BASE}/university?page=${pageNum}&size=${PAGE_SIZE}&query=${encodeURIComponent(query)}`, {
            headers: authHeaders()
        });

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const body = await response.json();
        const pageData = body.data;

        loadingMsg.classList.add("hidden");

        const list = pageData.content || [];
        if (list.length === 0) {
            emptyMsg.classList.remove("hidden");
            pagination.classList.add("hidden");
            return;
        }

        // Render cards
        list.forEach(univ => {
            const logoHtml = univ.logoUrl 
                ? `<img src="${univ.logoUrl}" alt="${univ.name} Logo" class="w-12 h-12 rounded-lg object-contain bg-surface-container-low border border-outline-variant/30" />`
                : `<div class="w-12 h-12 rounded-lg logo-placeholder flex items-center justify-center border border-outline-variant/30 text-on-surface-variant font-bold text-lg">${univ.name.charAt(0)}</div>`;

            grid.insertAdjacentHTML("beforeend", `
                <div class="bg-surface-container border border-outline-variant rounded-xl p-md flex items-start gap-md hover:border-primary/30 transition-all group animate-fade-in">
                    <div class="shrink-0 pt-xs">
                        ${logoHtml}
                    </div>
                    <div class="flex-1 min-w-0 space-y-xs">
                        <h3 class="text-body-md font-semibold text-on-surface truncate group-hover:text-primary transition-colors">${univ.name}</h3>
                        <p class="text-body-sm text-on-surface-variant font-mono truncate">${univ.domain}</p>
                        <div class="flex gap-sm pt-sm">
                            <button onclick="openEditModal(${univ.universityId}, '${univ.name.replace(/'/g, "\\'")}', '${univ.domain.replace(/'/g, "\\'")}')" 
                                    class="text-label-md text-primary hover:underline flex items-center gap-1">
                                <span class="material-symbols-outlined text-[16px]">edit</span> Edit
                            </button>
                            <button onclick="confirmDeleteUniversity(${univ.universityId}, '${univ.name.replace(/'/g, "\\'")}')" 
                                    class="text-label-md text-error hover:underline flex items-center gap-1">
                                <span class="material-symbols-outlined text-[16px]">delete</span> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `);
        });

        // Set pagination
        currentUnivPage = pageData.number;
        totalUnivPages = pageData.totalPages;

        if (totalUnivPages > 1) {
            pagination.classList.remove("hidden");
            document.getElementById("pagination-info").textContent = `Page ${currentUnivPage + 1} of ${totalUnivPages} (Total ${pageData.totalElements} universities)`;
            document.getElementById("prev-page-btn").disabled = currentUnivPage === 0;
            document.getElementById("next-page-btn").disabled = currentUnivPage >= totalUnivPages - 1;
        } else {
            pagination.classList.add("hidden");
        }

    } catch (err) {
        loadingMsg.classList.add("hidden");
        errorMsg.textContent = "Failed to load universities. " + err.message;
        errorMsg.classList.remove("hidden");
    }
}

// Fetch all users for the grid
async function fetchUsers(page, query = "") {
    const loadingMsg = document.getElementById("users-loading-msg");
    const emptyMsg = document.getElementById("users-empty-msg");
    const errorMsg = document.getElementById("users-error-msg");
    const tbody = document.getElementById("users-tbody");
    const pagination = document.getElementById("users-pagination");

    if (!tbody) return;

    loadingMsg.classList.remove("hidden");
    emptyMsg.classList.add("hidden");
    errorMsg.classList.add("hidden");
    tbody.innerHTML = "";
    usersQuery = query;

    try {
        const pageNum = parseInt(page) || 0;
        const response = await fetch(`${ADMIN_API_BASE}/users?page=${pageNum}&size=${USER_PAGE_SIZE}&query=${encodeURIComponent(query)}`, {
            headers: authHeaders()
        });

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const body = await response.json();
        const pageData = body.data;

        loadingMsg.classList.add("hidden");

        const list = pageData.content || [];
        if (list.length === 0) {
            emptyMsg.classList.remove("hidden");
            pagination.classList.add("hidden");
            return;
        }

        // Render table rows
        list.forEach(user => {
            const initials = (user.name ? user.name.slice(0, 2) : "US").toUpperCase();
            
            // Color code role badge
            let roleBadgeClass = "";
            if (user.systemRole === "SUPER_ADMIN") {
                roleBadgeClass = "bg-error-container/20 text-error border border-error/20";
            } else if (user.systemRole === "HOD") {
                roleBadgeClass = "bg-secondary-container/20 text-secondary border border-secondary/20";
            } else {
                roleBadgeClass = "bg-primary-container/20 text-primary border border-primary/20";
            }

            // Actions panel
            let actionHtml = "";
            if (user.systemRole === "USER") {
                actionHtml = `
                    <button onclick="updateUserRole(${user.userId}, 'HOD')" 
                            class="bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/30 px-md py-xs rounded-lg text-label-md font-bold transition-all flex items-center gap-1 inline-flex">
                        <span class="material-symbols-outlined text-[16px]">arrow_upward</span> Promote to HOD
                    </button>
                `;
            } else if (user.systemRole === "HOD") {
                actionHtml = `
                    <button onclick="updateUserRole(${user.userId}, 'USER')" 
                            class="bg-error-container/10 hover:bg-error text-error hover:text-on-error border border-error/30 px-md py-xs rounded-lg text-label-md font-bold transition-all flex items-center gap-1 inline-flex">
                        <span class="material-symbols-outlined text-[16px]">arrow_downward</span> Revoke HOD
                    </button>
                `;
            } else {
                actionHtml = `<span class="text-on-surface-variant/40 italic text-label-md">System Owner</span>`;
            }

            tbody.insertAdjacentHTML("beforeend", `
                <tr class="hover:bg-surface-container-high transition-colors group">
                    <td class="p-md flex items-center gap-md">
                        <div class="w-10 h-10 rounded-full bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary font-bold text-body-sm">
                            ${initials}
                        </div>
                        <span class="font-semibold text-on-surface truncate max-w-[150px]">${user.name || "Student User"}</span>
                    </td>
                    <td class="p-md text-on-surface-variant font-medium">${user.email}</td>
                    <td class="p-md text-on-surface-variant">${user.university || "None"}</td>
                    <td class="p-md">
                        <span class="px-sm py-xs rounded-full text-label-md font-semibold tracking-wide ${roleBadgeClass}">
                            ${user.systemRole}
                        </span>
                    </td>
                    <td class="p-md text-right">
                        ${actionHtml}
                    </td>
                </tr>
            `);
        });

        // Set pagination
        currentUsersPage = pageData.number;
        totalUsersPages = pageData.totalPages;

        if (totalUsersPages > 1) {
            pagination.classList.remove("hidden");
            document.getElementById("users-pagination-info").textContent = `Page ${currentUsersPage + 1} of ${totalUsersPages} (Total ${pageData.totalElements} users)`;
            document.getElementById("users-prev-page-btn").disabled = currentUsersPage === 0;
            document.getElementById("users-next-page-btn").disabled = currentUsersPage >= totalUsersPages - 1;
        } else {
            pagination.classList.add("hidden");
        }

    } catch (err) {
        loadingMsg.classList.add("hidden");
        errorMsg.textContent = "Failed to load users. " + err.message;
        errorMsg.classList.remove("hidden");
    }
}

// Global functions for card action triggers
window.openEditModal = function(id, name, domain) {
    document.getElementById("edit-univ-id").value = id;
    document.getElementById("edit-univ-name").value = name;
    document.getElementById("edit-univ-domain").value = domain;
    document.getElementById("edit-univ-error").classList.add("hidden");
    openModal("edit-univ-modal");
};

// Confirm delete university
window.confirmDeleteUniversity = async function(id, name) {
    if (confirm(`Are you sure you want to delete "${name}"? This will deactivate the university registry.`)) {
        try {
            const response = await fetch(`${ADMIN_API_BASE}/university/${id}`, {
                method: "DELETE",
                headers: authHeaders()
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.message || `Server returned status ${response.status}`);
            }

            showToast("University deleted successfully");
            fetchUniversities(currentUnivPage, univQuery);
        } catch (err) {
            alert("Error: " + err.message);
        }
    }
};

// Update user role
window.updateUserRole = async function(userId, role) {
    if (isSubmitting) return;
    
    const confirmMsg = role === "HOD" 
        ? "Are you sure you want to promote this user to HOD?" 
        : "Are you sure you want to revoke this user's HOD role?";

    if (!confirm(confirmMsg)) return;

    isSubmitting = true;

    try {
        const response = await fetch(`${ADMIN_API_BASE}/hod/${userId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({ role: role })
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(body.message || "Failed to update user authorization role");
        }

        showToast(`Role updated successfully to ${role}!`);
        // Refresh users list
        fetchUsers(currentUsersPage, usersQuery);

    } catch (err) {
        alert("Error updating role: " + err.message);
    } finally {
        isSubmitting = false;
    }
};

// Form Add University submit handler
async function handleAddUniversity(e) {
    e.preventDefault();
    if (isSubmitting) return;

    const errorEl = document.getElementById("add-univ-error");
    errorEl.classList.add("hidden");

    const name = document.getElementById("add-univ-name").value.trim();
    const domain = document.getElementById("add-univ-domain").value.trim();
    const logoFile = document.getElementById("add-univ-logo").files[0];

    const submitBtn = e.target.querySelector("button[type='submit']");
    const defaultText = submitBtn.textContent;

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    const formData = new FormData();
    formData.append("name", name);
    formData.append("domain", domain);
    if (logoFile) {
        formData.append("logo", logoFile);
    }

    try {
        const response = await fetch(`${ADMIN_API_BASE}/university`, {
            method: "POST",
            headers: {
                ...authHeaders()
            },
            body: formData
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(body.message || "Failed to add university");
        }

        showToast("University added successfully!");
        closeModal("add-univ-modal");
        e.target.reset();
        fetchUniversities(0, univQuery); // reload to page 1

    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
    } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = defaultText;
    }
}

// Form Edit University submit handler
async function handleEditUniversity(e) {
    e.preventDefault();
    if (isSubmitting) return;

    const errorEl = document.getElementById("edit-univ-error");
    errorEl.classList.add("hidden");

    const id = document.getElementById("edit-univ-id").value;
    const name = document.getElementById("edit-univ-name").value.trim();
    const domain = document.getElementById("edit-univ-domain").value.trim();

    const submitBtn = e.target.querySelector("button[type='submit']");
    const defaultText = submitBtn.textContent;

    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";

    try {
        const response = await fetch(`${ADMIN_API_BASE}/university/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders()
            },
            body: JSON.stringify({ name, domain })
        });

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(body.message || "Failed to update university");
        }

        showToast("University updated successfully!");
        closeModal("edit-univ-modal");
        fetchUniversities(currentUnivPage, univQuery); // reload current page

    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
    } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.textContent = defaultText;
    }
}

// Tab switcher handler
function switchTab(tabId) {
    activeTab = tabId;
    
    const univBtn = document.getElementById("tab-univ-btn");
    const usersBtn = document.getElementById("tab-users-btn");
    const univSection = document.getElementById("section-universities");
    const usersSection = document.getElementById("section-users");
    const searchInputHeader = document.getElementById("universitySearch");

    if (tabId === "universities") {
        // Toggle tab styles
        univBtn.className = "px-lg py-sm border-b-2 border-primary text-primary font-bold text-body-md transition-all flex items-center gap-2 focus:outline-none";
        usersBtn.className = "px-lg py-sm border-b-2 border-transparent text-on-surface-variant hover:text-on-surface font-semibold text-body-md transition-all flex items-center gap-2 focus:outline-none";
        
        // Show/hide sections
        univSection.classList.remove("hidden");
        usersSection.classList.add("hidden");
        
        // Update header search box state
        if (searchInputHeader) {
            searchInputHeader.placeholder = "Search universities by name or domain...";
            searchInputHeader.value = univQuery;
        }

        fetchUniversities(currentUnivPage, univQuery);
    } else {
        // Toggle tab styles
        usersBtn.className = "px-lg py-sm border-b-2 border-primary text-primary font-bold text-body-md transition-all flex items-center gap-2 focus:outline-none";
        univBtn.className = "px-lg py-sm border-b-2 border-transparent text-on-surface-variant hover:text-on-surface font-semibold text-body-md transition-all flex items-center gap-2 focus:outline-none";
        
        // Show/hide sections
        usersSection.classList.remove("hidden");
        univSection.classList.add("hidden");
        
        // Update header search box state
        if (searchInputHeader) {
            searchInputHeader.placeholder = "Search users by name or email...";
            searchInputHeader.value = usersQuery;
        }

        fetchUsers(currentUsersPage, usersQuery);
    }
}

// Initial session check and wiring
document.addEventListener("DOMContentLoaded", async () => {
    // Authenticate Super Admin
    const user = await getCurrentUser();
    if (!user || user.systemRole !== "SUPER_ADMIN") {
        console.warn("[universities.js] Authorization check failed. Redirecting to /home.");
        window.location.href = "/home";
        return;
    }

    // Load initial university list
    fetchUniversities(0, "");

    // Tab switcher events
    document.getElementById("tab-univ-btn").addEventListener("click", () => switchTab("universities"));
    document.getElementById("tab-users-btn").addEventListener("click", () => switchTab("users"));

    // Universities Pagination Listeners
    document.getElementById("prev-page-btn").addEventListener("click", () => {
        if (currentUnivPage > 0) fetchUniversities(currentUnivPage - 1, univQuery);
    });

    document.getElementById("next-page-btn").addEventListener("click", () => {
        if (currentUnivPage < totalUnivPages - 1) fetchUniversities(currentUnivPage + 1, univQuery);
    });

    // Users Pagination Listeners
    document.getElementById("users-prev-page-btn").addEventListener("click", () => {
        if (currentUsersPage > 0) fetchUsers(currentUsersPage - 1, usersQuery);
    });

    document.getElementById("users-next-page-btn").addEventListener("click", () => {
        if (currentUsersPage < totalUsersPages - 1) fetchUsers(currentUsersPage + 1, usersQuery);
    });

    // Wire Add Modal toggle
    document.getElementById("open-add-modal-btn").addEventListener("click", () => {
        document.getElementById("add-univ-form").reset();
        document.getElementById("add-univ-error").classList.add("hidden");
        openModal("add-univ-modal");
    });

    // Wire Cancel / Close buttons on modals
    document.querySelectorAll(".close-modal-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            closeModal("add-univ-modal");
            closeModal("edit-univ-modal");
        });
    });

    // Form submit wiring
    document.getElementById("add-univ-form").addEventListener("submit", handleAddUniversity);
    document.getElementById("edit-univ-form").addEventListener("submit", handleEditUniversity);

    // Search filter inputs debounce
    const searchUnivInput = document.getElementById("univ-search-input");
    const searchUserInput = document.getElementById("user-search-input");
    const searchHeaderInput = document.getElementById("universitySearch");

    let debounceTimer;
    
    function triggerSearch(tab, query) {
        if (tab === "universities") {
            fetchUniversities(0, query);
        } else {
            fetchUsers(0, query);
        }
    }

    if (searchUnivInput) {
        searchUnivInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            // Sync with header search input if present
            if (searchHeaderInput) searchHeaderInput.value = query;
            debounceTimer = setTimeout(() => triggerSearch("universities", query), 400);
        });
    }

    if (searchUserInput) {
        searchUserInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            // Sync with header search input if present
            if (searchHeaderInput) searchHeaderInput.value = query;
            debounceTimer = setTimeout(() => triggerSearch("users", query), 400);
        });
    }

    if (searchHeaderInput) {
        searchHeaderInput.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            // Sync with tab search inputs
            if (activeTab === "universities") {
                if (searchUnivInput) searchUnivInput.value = query;
            } else {
                if (searchUserInput) searchUserInput.value = query;
            }
            debounceTimer = setTimeout(() => triggerSearch(activeTab, query), 400);
        });
    }
});
