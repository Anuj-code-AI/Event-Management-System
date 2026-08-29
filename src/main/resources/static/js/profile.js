// profile.js
// Manages profile display, profile updates and host applications.

const API_USER = "/api/v1/user";

let currentUser = null;
let currentRole = null;


// ============================================================
// ELEMENTS
// ============================================================

const profileAlert = document.getElementById("profile-alert");

const avatarInitial = document.getElementById("avatar-initial");
const displayName = document.getElementById("display-name");
const displayEmail = document.getElementById("display-email");
const roleBadge = document.getElementById("role-badge");
const universityBadge = document.getElementById("university-badge");

const profileForm = document.getElementById("profile-form");
const updateBtn = document.getElementById("update-btn");

const nameInput = document.getElementById("name");
const emailDisplay = document.getElementById("email-display");
const universityDisplay = document.getElementById("university-display");

const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");


// Host application

const hostStatusChip = document.getElementById("host-status-chip");
const hostPendingAlert = document.getElementById("host-pending-alert");
const hostApprovedAlert = document.getElementById("host-approved-alert");

const hostApplyForm = document.getElementById("host-apply-form");
const applyBtn = document.getElementById("apply-btn");
const phoneInput = document.getElementById("phone");


// Account actions

const deleteModal = document.getElementById("delete-modal");
const deleteBtn = document.getElementById("deleteAccount");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const logoutBtn = document.getElementById("logoutBtn");


// ============================================================
// INIT
// ============================================================

async function initPage() {

    currentUser = await getCurrentUser();

    if (!currentUser) {
        window.location.href = "/login";
        return;
    }

    if (typeof renderLoggedInSidebar === "function") {
        renderLoggedInSidebar(currentUser);
    }

    await loadUserProfile();

    if (profileForm) {
        profileForm.addEventListener(
            "submit",
            handleProfileUpdate
        );
    }

    if (hostApplyForm) {
        hostApplyForm.addEventListener(
            "submit",
            handleHostApply
        );
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
            deleteModal.classList.remove("hidden");
        });
    }

    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener("click", () => {
            deleteModal.classList.add("hidden");
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener(
            "click",
            handleDeactivateAccount
        );
    }

    if (logoutBtn) {

        logoutBtn.addEventListener("click", async () => {

            logoutBtn.disabled = true;

            try {

                if (typeof logoutUser === "function") {
                    await logoutUser();
                }

            } catch {
                // logoutUser clears local state in finally.
            }

            window.location.href = "/login";
        });
    }
}


// ============================================================
// ALERTS
// ============================================================

function showAlert(type, message) {

    if (!profileAlert) return;

    profileAlert.classList.remove("hidden");

    if (type === "success") {

        profileAlert.className =
            "p-4 rounded-lg text-xs font-semibold flex items-start gap-2 " +
            "bg-green-50 border border-green-200 text-signal shadow-sm";

        profileAlert.innerHTML = `
            <span class="material-symbols-outlined text-[18px]">
                check_circle
            </span>
            <span>${message}</span>
        `;

    } else {

        profileAlert.className =
            "p-4 rounded-lg text-xs font-semibold flex items-start gap-2 " +
            "bg-red-50 border border-red-200 text-danger shadow-sm";

        profileAlert.innerHTML = `
            <span class="material-symbols-outlined text-[18px]">
                error
            </span>
            <span>${message}</span>
        `;
    }
}


function clearAlert() {

    if (profileAlert) {
        profileAlert.classList.add("hidden");
    }
}


// ============================================================
// LOAD PROFILE
// ============================================================

async function loadUserProfile() {

    const token = localStorage.getItem("accessToken");

    if (!token) return;

    try {

        const meRes = await fetch(API_USER, {
            credentials: "include",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const roleRes = await fetch(
            `${API_USER}/roleOfMe`,
            {
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const meBody = await meRes.json();
        const roleBody = await roleRes.json();

        if (
            meRes.ok &&
            roleRes.ok &&
            meBody.success &&
            roleBody.success
        ) {

            const user = meBody.data;
            const role = roleBody.data;

            currentUser = user;
            currentRole = role;

            populateFields(user, role);

        } else {

            throw new Error(
                meBody.message ||
                roleBody.message ||
                "Failed to load profile details"
            );
        }

    } catch (err) {

        console.error(
            "loadUserProfile error:",
            err
        );

        showAlert(
            "error",
            err.message ||
            "Could not retrieve user details."
        );
    }
}


// ============================================================
// POPULATE PROFILE
// ============================================================

function populateFields(user, role) {

    // Header

    if (displayName) {
        displayName.textContent =
            user.name || "—";
    }

    if (displayEmail) {
        displayEmail.textContent =
            user.email || "—";
    }

    if (avatarInitial) {
        avatarInitial.textContent =
            user.name
                ? user.name.charAt(0).toUpperCase()
                : "U";
    }


    // Role

    if (roleBadge) {

        roleBadge.textContent =
            user.systemRole
                ? user.systemRole
                    .replace("ROLE_", "")
                    .replace("_", " ")
                : "USER";
    }


    // University badge

    if (universityBadge) {

        if (user.university) {

            universityBadge.textContent =
                user.university;

            universityBadge.className =
                "bg-action-tint text-action " +
                "border border-action/25 text-[10px] " +
                "px-2.5 py-0.5 rounded-full font-semibold";

        } else {

            universityBadge.textContent =
                "No University";

            universityBadge.className =
                "bg-canvas-sunk text-ink " +
                "border border-line text-[10px] " +
                "px-2.5 py-0.5 rounded-full font-semibold";
        }
    }


    // Editable account information

    if (nameInput) {
        nameInput.value = user.name || "";
    }

    // Read-only email

    if (emailDisplay) {
        emailDisplay.value = user.email || "";
    }

    // Read-only university

    if (universityDisplay) {
        universityDisplay.value =
            user.university || "No university associated";
    }


    // Password fields

    if (passwordInput) {
        passwordInput.value = "";
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.value = "";
    }


    renderHostStatusSection(role);
}


// ============================================================
// HOST STATUS
// ============================================================

function renderHostStatusSection(role) {

    if (
        !hostStatusChip ||
        !hostPendingAlert ||
        !hostApprovedAlert ||
        !hostApplyForm
    ) {
        return;
    }

    const status = role?.status || "NONE";


    // Status chip

    hostStatusChip.classList.remove("hidden");

    let chipClass =
        "bg-canvas-sunk text-ink border border-line";

    if (status === "PENDING") {

        chipClass =
            "bg-amber-50 text-amber-700 border border-amber-200";

    } else if (status === "APPROVED") {

        chipClass =
            "bg-green-50 text-signal border border-green-200";

    } else if (status === "REJECTED") {

        chipClass =
            "bg-red-50 text-danger border border-red-200";
    }

    hostStatusChip.className =
        `${chipClass} text-[10px] px-2.5 py-0.5 ` +
        "rounded-full font-semibold uppercase " +
        "tracking-wider eyebrow";

    hostStatusChip.textContent =
        `Host Status: ${status}`;


    // Reset

    hostPendingAlert.classList.add("hidden");
    hostApprovedAlert.classList.add("hidden");
    hostApplyForm.classList.add("hidden");


    // Show correct section

    if (
        status === "NONE" ||
        status === "REJECTED"
    ) {

        hostApplyForm.classList.remove("hidden");

    } else if (status === "PENDING") {

        hostPendingAlert.classList.remove("hidden");

    } else if (status === "APPROVED") {

        hostApprovedAlert.classList.remove("hidden");
    }
}


// ============================================================
// UPDATE PROFILE
// ============================================================

async function handleProfileUpdate(e) {

    e.preventDefault();

    clearAlert();

    const token =
        localStorage.getItem("accessToken");

    if (!token) return;


    const name =
        nameInput.value.trim();

    const password =
        passwordInput.value;

    const confirmPassword =
        confirmPasswordInput.value;


    // Name validation

    if (!name) {

        showAlert(
            "error",
            "Name cannot be empty."
        );

        return;
    }


    // Password validation

    if (password) {

        if (password !== confirmPassword) {

            showAlert(
                "error",
                "Passwords do not match."
            );

            return;
        }

        if (password.length < 4) {

            showAlert(
                "error",
                "Password must be at least 4 characters long."
            );

            return;
        }
    }


    updateBtn.disabled = true;

    updateBtn.classList.add(
        "opacity-60",
        "cursor-not-allowed"
    );


    // IMPORTANT:
    // UserUpdateRequest contains ONLY name and password.

    const payload = {
        name: name,
        password: password || null
    };


    try {

        const res = await fetch(
            API_USER,
            {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            }
        );

        const body = await res.json();


        if (res.ok && body.success) {

            showAlert(
                "success",
                "Profile updated successfully!"
            );

            await loadUserProfile();

            if (
                typeof renderSidebar === "function"
            ) {
                await renderSidebar();
            }

        } else {

            throw new Error(
                body.message ||
                "Failed to update profile details"
            );
        }

    } catch (err) {

        console.error(
            "handleProfileUpdate error:",
            err
        );

        showAlert(
            "error",
            err.message ||
            "Network issue updating profile."
        );

    } finally {

        updateBtn.disabled = false;

        updateBtn.classList.remove(
            "opacity-60",
            "cursor-not-allowed"
        );
    }
}


// ============================================================
// HOST APPLICATION
// ============================================================

async function handleHostApply(e) {

    e.preventDefault();

    clearAlert();

    const token =
        localStorage.getItem("accessToken");

    if (!token) return;


    // University is already associated with the user.
    // No university/college email should be entered here.

    if (
        !currentUser ||
        !currentUser.university
    ) {

        showAlert(
            "error",
            "Your account is not associated with a university."
        );

        return;
    }


    const phone =
        phoneInput.value.trim();


    if (!phone) {

        showAlert(
            "error",
            "Phone number is required."
        );

        return;
    }


    // Same validation as backend:
    // ^\+?[0-9]{10,15}$

    const phonePattern =
        /^\+?[0-9]{10,15}$/;

    if (!phonePattern.test(phone)) {

        showAlert(
            "error",
            "Phone number must be between 10 and 15 digits."
        );

        return;
    }


    applyBtn.disabled = true;

    applyBtn.classList.add(
        "opacity-60",
        "cursor-not-allowed"
    );


    try {

        const res = await fetch(
            `${API_USER}/host/apply`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },

                // HostRequest contains ONLY phone.
                body: JSON.stringify({
                    phone: phone
                })
            }
        );


        const body = await res.json();


        if (res.ok && body.success) {

            showAlert(
                "success",
                "Host application submitted successfully! Pending HOD review."
            );

            await loadUserProfile();

        } else {

            throw new Error(
                body.message ||
                "Failed to submit host request"
            );
        }

    } catch (err) {

        console.error(
            "handleHostApply error:",
            err
        );

        showAlert(
            "error",
            err.message ||
            "Network issue submitting host application."
        );

    } finally {

        applyBtn.disabled = false;

        applyBtn.classList.remove(
            "opacity-60",
            "cursor-not-allowed"
        );
    }
}


// ============================================================
// ACCOUNT DEACTIVATION
// ============================================================

async function handleDeactivateAccount() {

    const token =
        localStorage.getItem("accessToken");

    if (!token) return;


    deleteModal.classList.add("hidden");

    showAlert(
        "success",
        "Processing account deactivation..."
    );


    try {

        const res = await fetch(
            API_USER,
            {
                method: "DELETE",
                credentials: "include",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const body = await res.json();


        if (res.ok && body.success) {

            showAlert(
                "success",
                "Account deactivated successfully. Logging out..."
            );

            setTimeout(() => {

                if (
                    typeof clearTokens === "function"
                ) {
                    clearTokens();
                }

                localStorage.removeItem(
                    "accessToken"
                );

                localStorage.removeItem(
                    "refreshToken"
                );

                window.location.href =
                    "/login";

            }, 1500);

        } else {

            throw new Error(
                body.message ||
                "Deactivation request failed"
            );
        }

    } catch (err) {

        console.error(
            "handleDeactivateAccount error:",
            err
        );

        showAlert(
            "error",
            err.message ||
            "Network issue during account deactivation."
        );
    }
}


// ============================================================
// INIT
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    initPage
);