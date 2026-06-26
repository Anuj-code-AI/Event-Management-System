// profile.js — manages profile display, updates, and host applications

const API_USERS = "/api/v1/users";

// State
let currentUser = null;
let currentRole = null;

// Element selections
const profileAlert = document.getElementById("profile-alert");
const avatarInitial = document.getElementById("avatar-initial");
const displayName = document.getElementById("display-name");
const displayEmail = document.getElementById("display-email");
const roleBadge = document.getElementById("role-badge");
const universityBadge = document.getElementById("university-badge");

// Forms
const profileForm = document.getElementById("profile-form");
const updateBtn = document.getElementById("update-btn");
const nameInput = document.getElementById("name");
const universityInput = document.getElementById("university");
const secondaryEmailInput = document.getElementById("secondaryEmail");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

// Host Apply Section
const hostStatusChip = document.getElementById("host-status-chip");
const hostPendingAlert = document.getElementById("host-pending-alert");
const hostApprovedAlert = document.getElementById("host-approved-alert");
const hostApplyForm = document.getElementById("host-apply-form");
const applyBtn = document.getElementById("apply-btn");
const collegeEmailInput = document.getElementById("collegeEmail");
const phoneInput = document.getElementById("phone");

// Modals & Deactivate
const deleteModal = document.getElementById("delete-modal");
const deleteBtn = document.getElementById("deleteAccount");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const logoutBtn = document.getElementById("logoutBtn");

// Init Page
async function initPage() {
    currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = "/login";
        return;
    }

    // Render sidebar
    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(currentUser);
    }

    // Load full user details
    await loadUserProfile();

    // Bind forms
    if (profileForm) profileForm.addEventListener("submit", handleProfileUpdate);
    if (hostApplyForm) hostApplyForm.addEventListener("submit", handleHostApply);

    // Bind modals
    if (deleteBtn) deleteBtn.addEventListener("click", () => deleteModal.classList.remove("hidden"));
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", () => deleteModal.classList.add("hidden"));
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", handleDeactivateAccount);
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            if (typeof logoutUser === "function") {
                await logoutUser();
            }
            window.location.href = "/login";
        });
    }
}

// Display Alerts
function showAlert(type, message) {
    if (!profileAlert) return;
    profileAlert.classList.remove("hidden");
    if (type === "success") {
        profileAlert.className = "p-sm rounded-lg text-body-sm font-medium flex items-start gap-xs bg-primary/10 border border-primary/20 text-primary";
        profileAlert.innerHTML = `<span class="material-symbols-outlined text-[18px]">check_circle</span> <span>${message}</span>`;
    } else {
        profileAlert.className = "p-sm rounded-lg text-body-sm font-medium flex items-start gap-xs bg-error/10 border border-error/20 text-error";
        profileAlert.innerHTML = `<span class="material-symbols-outlined text-[18px]">error</span> <span>${message}</span>`;
    }
}

// Clear Alerts
function clearAlert() {
    if (profileAlert) profileAlert.classList.add("hidden");
}

// Load and populate profile fields
async function loadUserProfile() {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
        // Fetch fresh User details
        const meRes = await fetch(`${API_USERS}/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const meBody = await meRes.json();

        // Fetch fresh Role details
        const roleRes = await fetch(`${API_USERS}/roleOfMe`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const roleBody = await roleRes.json();

        if (meRes.ok && roleRes.ok && meBody.success && roleBody.success) {
            const user = meBody.data;
            const role = roleBody.data;

            currentUser = user;
            currentRole = role;

            populateFields(user, role);
        } else {
            throw new Error(meBody.message || roleBody.message || "Failed to load profile details");
        }
    } catch (err) {
        console.error("loadUserProfile error:", err);
        showAlert("error", err.message || "Could not retrieve user details from database.");
    }
}

// Populate template variables
function populateFields(user, role) {
    // Header details
    if (displayName) displayName.textContent = user.name || "—";
    if (displayEmail) displayEmail.textContent = user.email || "—";
    if (avatarInitial) avatarInitial.textContent = user.name ? user.name.charAt(0).toUpperCase() : "U";

    if (roleBadge) {
        roleBadge.textContent = user.systemRole ? user.systemRole.replace("ROLE_", "").replace("_", " ") : "USER";
    }

    if (universityBadge) {
        if (user.university) {
            universityBadge.textContent = user.university;
            universityBadge.className = "bg-primary/10 text-primary border border-primary/30 text-label-md px-sm py-xs rounded-full font-semibold";
        } else {
            universityBadge.textContent = "No University Selected";
            universityBadge.className = "bg-surface-container-high text-on-surface-variant border border-outline-variant/30 text-label-md px-sm py-xs rounded-full font-semibold";
        }
    }

    // Input fields
    if (nameInput) nameInput.value = user.name || "";
    if (universityInput) universityInput.value = user.university || "";
    if (secondaryEmailInput) secondaryEmailInput.value = user.secondaryEmail || "";

    // Clear password inputs
    if (passwordInput) passwordInput.value = "";
    if (confirmPasswordInput) confirmPasswordInput.value = "";

    // Render Host Profile Status Section
    renderHostStatusSection(role, user);
}

// Toggle Host Forms & Alert chips
function renderHostStatusSection(role, user) {
    if (!hostStatusChip || !hostPendingAlert || !hostApprovedAlert || !hostApplyForm) return;

    const status = role.status || "NONE";

    // Set Status chip text & style
    hostStatusChip.classList.remove("hidden");
    let chipClass = "bg-surface-container text-on-surface-variant border border-outline-variant";
    if (status === "PENDING") chipClass = "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30";
    else if (status === "APPROVED") chipClass = "bg-primary/10 text-primary border border-primary/30";
    else if (status === "REJECTED") chipClass = "bg-error/10 text-error border border-error/30";
    hostStatusChip.className = `${chipClass} text-label-md px-sm py-xs rounded-full font-semibold uppercase`;
    hostStatusChip.textContent = `Host Status: ${status}`;

    // Reset visibility states
    hostPendingAlert.classList.add("hidden");
    hostApprovedAlert.classList.add("hidden");
    hostApplyForm.classList.add("hidden");

    if (status === "NONE" || status === "REJECTED") {
        hostApplyForm.classList.remove("hidden");
        // Preset college email if user secondaryEmail is present, otherwise fall back to primary email if it matches university domain
        if (collegeEmailInput && !collegeEmailInput.value) {
            collegeEmailInput.value = user.secondaryEmail || user.email || "";
        }
    } else if (status === "PENDING") {
        hostPendingAlert.classList.remove("hidden");
    } else if (status === "APPROVED") {
        hostApprovedAlert.classList.remove("hidden");
    }
}

// Handle details update submission
async function handleProfileUpdate(e) {
    e.preventDefault();
    clearAlert();

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const name = nameInput.value.trim();
    const university = universityInput.value.trim();
    const secondaryEmail = secondaryEmailInput ? secondaryEmailInput.value.trim() : "";
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!name) {
        showAlert("error", "Name cannot be empty.");
        return;
    }

    if (password) {
        if (password !== confirmPassword) {
            showAlert("error", "Passwords do not match.");
            return;
        }
        if (password.length < 4) {
            showAlert("error", "Password must be at least 4 characters long.");
            return;
        }
    }

    // Client-side domain check if university is entered and domain is loaded
    if (university && currentUser && currentUser.universityDomain) {
        const primaryDomain = currentUser.email.substring(currentUser.email.lastIndexOf("@") + 1).toLowerCase();
        const secondaryDomain = secondaryEmail ? secondaryEmail.substring(secondaryEmail.lastIndexOf("@") + 1).toLowerCase() : "";
        
        const primaryMatches = primaryDomain === currentUser.universityDomain.toLowerCase();
        const secondaryMatches = secondaryDomain === currentUser.universityDomain.toLowerCase();
        
        // Only enforce check client-side if the university name hasn't changed (since currentUser.universityDomain belongs to the current university)
        if (university.toLowerCase() === (currentUser.university || "").toLowerCase()) {
            if (secondaryEmail !== (currentUser.secondaryEmail || "")) {
                if (!primaryMatches && !secondaryMatches) {
                    showAlert("error", `To associate with this university, either your primary email or secondary email must match the university domain (${currentUser.universityDomain.toLowerCase()}).`);
                    return;
                }
            }
        }
    }

    updateBtn.disabled = true;
    updateBtn.classList.add("opacity-60", "cursor-not-allowed");

    const payload = { name, university, secondaryEmail };
    if (password) {
        payload.password = password;
    }

    try {
        const res = await fetch(`${API_USERS}/me`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        const body = await res.json();

        if (res.ok && body.success) {
            showAlert("success", "Profile updated successfully!");
            // Reload user state & sidebar
            await loadUserProfile();
            if (typeof renderSidebar === "function") {
                await renderSidebar();
            }
        } else {
            throw new Error(body.message || "Failed to update profile details");
        }
    } catch (err) {
        console.error("handleProfileUpdate error:", err);
        showAlert("error", err.message || "Network issue updating details.");
    } finally {
        updateBtn.disabled = false;
        updateBtn.classList.remove("opacity-60", "cursor-not-allowed");
    }
}

// Handle Host application submission
async function handleHostApply(e) {
    e.preventDefault();
    clearAlert();

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    if (!currentUser || !currentUser.university) {
        showAlert("error", "Please select and save your University in your profile details before applying for a host profile.");
        return;
    }

    const collegeEmail = collegeEmailInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!collegeEmail || !phone) {
        showAlert("error", "Please fill in all host application details.");
        return;
    }

    // Client-side domain verification
    if (currentUser.universityDomain) {
        const domainPart = collegeEmail.substring(collegeEmail.lastIndexOf("@") + 1).toLowerCase();
        if (domainPart !== currentUser.universityDomain.toLowerCase()) {
            showAlert("error", `College email domain (${domainPart}) must match your university domain (${currentUser.universityDomain.toLowerCase()})`);
            return;
        }
    }

    applyBtn.disabled = true;
    applyBtn.classList.add("opacity-60", "cursor-not-allowed");

    try {
        const res = await fetch(`${API_USERS}/host/apply`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ collegeEmail, phone })
        });
        const body = await res.json();

        if (res.ok && body.success) {
            showAlert("success", "Host application submitted successfully! Pending HOD review.");
            await loadUserProfile();
        } else {
            throw new Error(body.message || "Failed to submit host request");
        }
    } catch (err) {
        console.error("handleHostApply error:", err);
        showAlert("error", err.message || "Network issue submitting host application.");
    } finally {
        applyBtn.disabled = false;
        applyBtn.classList.remove("opacity-60", "cursor-not-allowed");
    }
}

// Handle account deactivation
async function handleDeactivateAccount() {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    deleteModal.classList.add("hidden");
    showAlert("success", "Processing account deactivation...");

    try {
        const res = await fetch(`${API_USERS}/me`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
        });
        const body = await res.json();

        if (res.ok && body.success) {
            showAlert("success", "Account deactivated successfully. Logging out...");
            setTimeout(() => {
                if (typeof clearTokens === "function") clearTokens();
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                window.location.href = "/login";
            }, 1500);
        } else {
            throw new Error(body.message || "Deactivation request failed");
        }
    } catch (err) {
        console.error("handleDeactivateAccount error:", err);
        showAlert("error", err.message || "Network issue during account deactivation.");
    }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", initPage);
