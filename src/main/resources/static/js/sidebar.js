// sidebar.js — renders nav items (or login/register if logged out), wires logout,
// and handles the mobile sidebar drawer toggle (hamburger button).

function iconFor(name) {
    return `<span class="material-symbols-outlined text-[22px]">${name}</span>`;
}

function renderLoggedOutSidebar() {
    const nameEl = document.getElementById("sidebar-username");
    const roleEl = document.getElementById("sidebar-role");
    const navEl = document.getElementById("sidebar-nav");
    const authActionsEl = document.getElementById("sidebar-auth-actions");
    const logoutWrap = document.getElementById("sidebar-logout-wrap");

    if (nameEl) nameEl.textContent = "Welcome";
    if (roleEl) roleEl.textContent = "Not signed in";

    if (navEl) navEl.classList.add("hidden");
    if (authActionsEl) authActionsEl.classList.remove("hidden");
    if (logoutWrap) logoutWrap.classList.add("hidden");
}

function renderLoggedInSidebar(user) {
    const navItems = buildNavItems(user);
    const nameEl = document.getElementById("sidebar-username");
    const roleEl = document.getElementById("sidebar-role");
    const navEl = document.getElementById("sidebar-nav");
    const authActionsEl = document.getElementById("sidebar-auth-actions");
    const logoutWrap = document.getElementById("sidebar-logout-wrap");

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.systemRole.replace("_", " ");

    if (navEl) {
        navEl.classList.remove("hidden");
        navEl.innerHTML = navItems
            .map((item, idx) => {
                const isActive = idx === 0; // "Home" active by default on this page
                return `
                <a href="${item.href}"
                   class="flex items-center gap-sm px-md py-sm rounded-lg text-body-sm font-medium transition-colors
                   ${isActive
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface border border-transparent"}">
                    ${iconFor(item.icon)}
                    <span>${item.label}</span>
                </a>`;
            })
            .join("");
    }

    if (authActionsEl) authActionsEl.classList.add("hidden");
    if (logoutWrap) logoutWrap.classList.remove("hidden");
}

async function renderSidebar() {
    const user = await getCurrentUser();
    if (user) {
        renderLoggedInSidebar(user);
    } else {
        renderLoggedOutSidebar();
    }
}

/** Opens/closes the mobile sidebar drawer + backdrop. Matches IDs already in home.html. */
function setMobileSidebarOpen(open) {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar || !overlay) return;

    if (open) {
        sidebar.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");
    } else {
        sidebar.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    renderSidebar();

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            logoutBtn.disabled = true;
            try {
                if (typeof logoutUser === "function") {
                    await logoutUser();
                }
            } catch {
                // Even if the server call fails, proceed — logoutUser() already clears
                // localStorage in a finally block (see auth.js), so local state is safe.
            }
            window.location.href = "/login";
        });
    }

    // Mobile hamburger toggle — these IDs (#sidebar-open, #sidebar-close, #sidebar-overlay)
    // already exist in home.html; this was the missing piece causing the reported bug.
    const openBtn = document.getElementById("sidebar-open");
    const closeBtn = document.getElementById("sidebar-close");
    const overlay = document.getElementById("sidebar-overlay");

    if (openBtn) openBtn.addEventListener("click", () => setMobileSidebarOpen(true));
    if (closeBtn) closeBtn.addEventListener("click", () => setMobileSidebarOpen(false));
    if (overlay) overlay.addEventListener("click", () => setMobileSidebarOpen(false));

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") setMobileSidebarOpen(false);
    });
});