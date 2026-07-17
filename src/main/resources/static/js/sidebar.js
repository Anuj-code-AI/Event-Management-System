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
                const isActive = window.location.pathname === item.href;
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

function show404Page(message = "The page you are looking for doesn't exist.") {
    const mainEl = document.querySelector("main");
    if (!mainEl) return;
    mainEl.className = "flex-1 px-4 py-6 md:px-8 md:py-8 space-y-6";
    mainEl.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-12 animate-fade-in">
            <div class="relative mb-6">
                <h1 class="text-[120px] md:text-[160px] font-extrabold font-display leading-none select-none bg-gradient-to-r from-danger/20 via-amber/20 to-action/20 bg-clip-text text-transparent">404</h1>
                <div class="absolute inset-0 flex items-center justify-center">
                    <span class="material-symbols-outlined text-[64px] text-danger">error</span>
                </div>
            </div>
            
            <h2 class="text-2xl md:text-3xl font-extrabold text-ink font-display tracking-tight mb-3">
                Page Doesn't Exist
            </h2>
            <p class="text-sm md:text-base text-muted max-w-md mb-8 leading-relaxed">
                ${message}
            </p>
            
            <div class="flex flex-wrap items-center justify-center gap-4">
                <a href="/home" class="inline-flex items-center gap-2 bg-action hover:bg-action-hover text-white font-semibold px-6 py-3 rounded-lg text-sm transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                    <span class="material-symbols-outlined text-[18px]">home</span>
                    <span>Return to Home</span>
                </a>
                <button onclick="window.history.back()" class="inline-flex items-center gap-2 border border-line-strong bg-canvas hover:bg-canvas-sunk text-ink font-semibold px-6 py-3 rounded-lg text-sm transition-all shadow-sm">
                    <span class="material-symbols-outlined text-[18px]">arrow_back</span>
                    <span>Go Back</span>
                </button>
            </div>
        </div>
    `;
}

function showLoginRequiredPage(message = "Please login to register for this event.") {
    const mainEl = document.querySelector("main");
    if (!mainEl) return;
    mainEl.className = "flex-1 px-4 py-6 md:px-8 md:py-8 space-y-6";
    mainEl.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-12 animate-fade-in">
            <div class="relative mb-6">
                <div class="w-24 h-24 rounded-full bg-action-tint flex items-center justify-center mx-auto mb-2 shadow-inner">
                    <span class="material-symbols-outlined text-[48px] text-action">lock</span>
                </div>
            </div>
            
            <h2 class="text-2xl md:text-3xl font-extrabold text-ink font-display tracking-tight mb-3">
                Login Required
            </h2>
            <p class="text-sm md:text-base text-muted max-w-md mb-8 leading-relaxed font-medium">
                ${message}
            </p>
            
            <div class="flex flex-wrap items-center justify-center gap-4">
                <a href="/login" class="inline-flex items-center gap-2 bg-action hover:bg-action-hover text-white font-semibold px-8 py-3 rounded-lg text-sm transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                    <span class="material-symbols-outlined text-[18px]">login</span>
                    <span>Login / Register</span>
                </a>
                <a href="/home" class="inline-flex items-center gap-2 border border-line-strong bg-canvas hover:bg-canvas-sunk text-ink font-semibold px-6 py-3 rounded-lg text-sm transition-all shadow-sm">
                    <span class="material-symbols-outlined text-[18px]">home</span>
                    <span>Return to Home</span>
                </a>
            </div>
        </div>
    `;
}