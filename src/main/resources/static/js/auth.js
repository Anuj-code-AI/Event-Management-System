// auth.js — shared logic for register.html and login.html
// Assumes frontend and backend are same-origin (per user confirmation).
// Access token -> localStorage. Refresh token -> httpOnly cookie (set by server, invisible to JS).

const API_BASE = "/api/v1/auth";

/**
 * Extracts a human-readable error message from a failed response body.
 * Backend has two known error shapes:
 *  1. ApiResponse.error(...) -> { success: false, message: "...", timestamp: "..." }
 *  2. MethodArgumentNotValidException handler -> { fieldName: "error message", ... } (raw map, no "message" key)
 * This defensively handles both, and falls back to a generic string if neither shape matches.
 */
function extractErrorMessage(body, fallback) {
    if (!body || typeof body !== "object") return fallback;
    if (typeof body.message === "string" && body.message.trim()) return body.message;
    // Fallback: field-validation map shape { field: "message" }
    const values = Object.values(body).filter((v) => typeof v === "string" && v.trim());
    if (values.length) return values[0];
    return fallback;
}

/**
 * Wraps fetch with credentials included (so the refresh-token cookie can be set by the server),
 * JSON parsing, and consistent error throwing.
 */
async function authFetch(path, options) {
    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            ...options,
        });
    } catch (networkErr) {
        // fetch() itself throws only on network failure (offline, DNS, CORS block, server down) — not on 4xx/5xx.
        throw new Error("Could not reach the server. Check your connection and try again.");
    }

    let body = null;
    try {
        body = await response.json();
    } catch {
        // Response had no JSON body (e.g. empty 204) — fine, leave body null.
    }

    if (!response.ok) {
        throw new Error(extractErrorMessage(body, `Request failed (${response.status})`));
    }

    return body;
}

/**
 * Registers a new user. Throws if password/confirmPassword mismatch client-side
 * before even hitting the network, since that's a pure UX check the server also re-validates.
 */
async function registerUser({ name, email, password, confirmPassword, university }) {
    if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
    }
    const data = await authFetch("/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, confirmPassword, university: university || null }),
    });
    if (!data || !data.accessToken) {
        throw new Error("Registration succeeded but no access token was returned.");
    }
    localStorage.setItem("accessToken", data.accessToken);
    return data;
}

/**
 * Logs in an existing user.
 */
async function loginUser({ email, password }) {
    const data = await authFetch("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    if (!data || !data.accessToken) {
        throw new Error("Login succeeded but no access token was returned.");
    }
    localStorage.setItem("accessToken", data.accessToken);
    return data;
}

/**
 * Calls /refresh to mint a new access token using the httpOnly refresh cookie.
 * The browser only attaches that cookie because this request's path matches
 * the cookie's restricted path (/api/v1/auth/refresh) exactly — see note in chat.
 */
async function refreshAccessToken() {
    const data = await authFetch("/refresh", { method: "POST" });
    if (data && data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
    }
    return data;
}

/**
 * Logs out: tells the server to revoke the refresh token, then clears the local access token
 * regardless of whether the server call succeeds (so the UI never gets stuck "logged in"
 * if the network request fails).
 */
async function logoutUser() {
    try {
        await authFetch("/logout", { method: "POST" });
    } finally {
        localStorage.removeItem("accessToken");
    }
}

/** Small helper to wire up a form's submit handler with loading state + error display. */
function bindAuthForm({ formEl, errorEl, buttonEl, buttonDefaultText, onSubmit, redirectTo }) {
    formEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        errorEl.classList.add("hidden");
        errorEl.textContent = "";
        buttonEl.disabled = true;
        buttonEl.textContent = "Please wait...";

        try {
            await onSubmit();
            window.location.href = redirectTo;
        } catch (err) {
            errorEl.textContent = err.message || "Something went wrong. Please try again.";
            errorEl.classList.remove("hidden");
            buttonEl.disabled = false;
            buttonEl.textContent = buttonDefaultText;
        }
    });
}

/**
 * Checks whether the user already has a usable session, and if so, redirects them
 * away from the login/register page instead of making them log in again.
 *
 * Strategy:
 *  1. If no access token is in localStorage at all, nothing to check — show the form.
 *  2. If a token exists, try calling /refresh. This is the one call that tells us
 *     definitively whether the httpOnly refresh cookie is still valid — it doesn't
 *     matter whether the in-memory/localStorage access token has expired, since
 *     /refresh mints a brand new one regardless.
 *  3. On success: store the fresh access token, redirect.
 *  4. On any failure (no valid cookie, expired refresh token, network error): clear
 *     the stale access token and show the form normally — do NOT loop or retry.
 *
 * NOTE: this will only work if the refresh-token cookie was actually set by the
 * server in the first place. If COOKIE_SECURE=true while running on plain http://
 * locally, the browser silently refuses to store that cookie, and this check will
 * always fail — that's a separate, already-flagged backend/env issue, not a bug
 * in this function.
 */
async function checkExistingSessionAndRedirect(redirectTo) {
    const existingToken = localStorage.getItem("accessToken");
    if (!existingToken) return false;

    try {
        await refreshAccessToken(); // throws on failure, already stores new token on success
        window.location.href = redirectTo;
        return true;
    } catch (err) {
        console.warn("[auth.js] No valid existing session (this is normal if you're logged out):", err.message);
        localStorage.removeItem("accessToken");
        return false;
    }
}