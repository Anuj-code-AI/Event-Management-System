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
    const token = localStorage.getItem("accessToken");
    if (!token) return null;

    try {
        const [meRes, roleRes] = await Promise.all([
            fetch(`${API_USERS_BASE}/me`, {
                credentials: "include",
                headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_USERS_BASE}/roleOfMe`, {
                credentials: "include",
                headers: { Authorization: `Bearer ${token}` },
            }),
        ]);

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
        { label: "Campus Events", icon: "explore", href: "/events" },
        { label: "My Tickets", icon: "confirmation_number", href: "/my-tickets" },
        { label: "My Events", icon: "event_available", href: "/my-events" },
        { label: "About Us", icon: "info", href: "/aboutUs" },
    ];

    const hostItems = [
        { label: "Request Event", icon: "add_circle", href: "/request-event" },
        { label: "Hosted Events", icon: "event", href: "/hosted-events" },
    ];

    const hodItems = [
        { label: "Event Management", icon: "admin_panel_settings", href: "/event-management" },
        { label: "Admin Page", icon: "shield_person", href: "/admin" },
    ];

    const superAdminItems = [
        { label: "Universities", icon: "account_balance", href: "/universities" },
    ];

    let items = [...base];

    if (user.hostStatus === HOST_STATUS.APPROVED) {
        items = items.concat(hostItems);
    }

    if (user.systemRole === SYSTEM_ROLE.HOD) {
        items = items.concat(hodItems);
    }

    if (user.systemRole === SYSTEM_ROLE.SUPER_ADMIN) {
        items = items.concat(superAdminItems);
    }

    return items;
}