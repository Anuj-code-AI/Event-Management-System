// nav-config.js — maps a user's role + host status to sidebar navigation items.
// Wired to real endpoints: GET /api/v1/users/me and GET /api/v1/users/roleOfMe
const API_USERS_BASE = "/api/v1/users";

const SYSTEM_ROLE = {
    SUPER_ADMIN: "SUPER_ADMIN",
    HOD: "HOD",
    USER: "USER",
};

const HOST_STATUS = {
    PENDING: "PENDING",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    NONE: "NONE",
};

/**
 * Fetches the current user's identity + role + host status from the backend.
 * Returns null if the user is not authenticated (no token, expired token, or
 * the server rejects the request) — callers must treat null as "logged out".
 */
async function getCurrentUser() {
    let token = localStorage.getItem("accessToken");
    if (!token) return null;

    async function makeRequests(tok) {
        return Promise.all([
            fetch(`${API_USERS_BASE}/me`, {
                credentials: "include",
                headers: { Authorization: `Bearer ${tok}` },
            }),
            fetch(`${API_USERS_BASE}/roleOfMe`, {
                credentials: "include",
                headers: { Authorization: `Bearer ${tok}` },
            }),
        ]);
    }

    try {
        let [meRes, roleRes] = await makeRequests(token);

        // If unauthorized (expired token), try to refresh and retry once
        if (meRes.status === 401 || roleRes.status === 401) {
            console.log("[nav-config] Access token expired, attempting silent refresh...");
            try {
                if (typeof refreshAccessToken === "function") {
                    const refreshData = await refreshAccessToken();
                    if (refreshData && refreshData.accessToken) {
                        token = refreshData.accessToken;
                        [meRes, roleRes] = await makeRequests(token);
                    }
                }
            } catch (refreshErr) {
                console.warn("[nav-config] Proactive refresh failed:", refreshErr);
                return null;
            }
        }

        if (!meRes.ok || !roleRes.ok) {
            // Log the real reason instead of swallowing it — needed to debug auth issues.
            console.warn(
                "[nav-config] getCurrentUser failed:",
                "me ->", meRes.status, meRes.statusText,
                "| roleOfMe ->", roleRes.status, roleRes.statusText
            );
            try {
                console.warn("[nav-config] /me body:", await meRes.clone().text());
                console.warn("[nav-config] /roleOfMe body:", await roleRes.clone().text());
            } catch {
                // ignore secondary failures reading the body for logging purposes
            }
            return null;
        }

        const meBody = await meRes.json();
        const roleBody = await roleRes.json();

        // Both endpoints wrap their payload in ApiResponse: { success, message, data, timestamp }
        const me = meBody.data;
        const role = roleBody.data;

        if (!me || !role) return null;

        return {
            name: me.name,
            email: me.email,
            university: me.university,
            systemRole: role.systemRole,
            hostStatus: role.status,
        };
    } catch (err) {
        // Network failure, server down, CORS block, etc. — log it, treat as logged out.
        console.warn("[nav-config] getCurrentUser threw:", err);
        return null;
    }
}

/**
 * Builds the ordered list of nav items for a given user.
 * Host items (Request Event, Hosted Events) only appear when hostStatus is APPROVED —
 * PENDING/REJECTED/NONE are all treated identically (both items hidden), since a
 * non-approved host has nothing to manage yet.
 */
function buildNavItems(user) {
    const base = [
        { label: "Home", icon: "home", href: "/home" },
        { label: "Campus Events", icon: "explore", href: "/campus-events" },
        { label: "My Tickets", icon: "confirmation_number", href: "/tickets" },
        { label: "My Events", icon: "event_available", href: "/myEvents" },
        { label: "About Us", icon: "info", href: "/aboutUs" },
    ];

    const eventManagementItem = { label: "Event Management", icon: "event_note", href: "/event-management" };
    const adminPageItem = { label: "Admin Page", icon: "shield_person", href: "/admin" };

    const superAdminItems = [
        { label: "Universities", icon: "account_balance", href: "/universities" },
    ];

    let items = [...base];

    // Show Event Management if the user is an approved host OR an HOD
    if (user.hostStatus === HOST_STATUS.APPROVED || user.systemRole === SYSTEM_ROLE.HOD) {
        items.push(eventManagementItem);
    }

    // Show Admin Page if the user is an HOD
    if (user.systemRole === SYSTEM_ROLE.HOD) {
        items.push(adminPageItem);
    }

    // Show Universities admin tab if user is SUPER_ADMIN
    if (user.systemRole === SYSTEM_ROLE.SUPER_ADMIN) {
        items = items.concat(superAdminItems);
    }

    return items;
}