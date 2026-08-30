// auth.js
// Shared authentication logic for register.html and login.html.
// Assumes frontend and backend are same-origin.
//
// Access token -> localStorage
// Refresh token -> httpOnly cookie (set by server, invisible to JS)

const API_BASE = "/api/v1/auth";


/**
 * Extract a human-readable error message from a failed response.
 * Supported backend error shapes:
 * 1. ApiResponse.error(...)
 *    {
 *        success: false,
 *        message: "...",
 *        timestamp: "..."
 *    }
 * 2. Validation error map
 *    {
 *        "email": "Invalid email format",
 *        "password": "Password must be..."
 *    }
 */
function extractErrorMessage(body, fallback) {

    if (!body || typeof body !== "object") {
        return fallback;
    }

    if (
        typeof body.message === "string" &&
        body.message.trim()
    ) {
        return body.message;
    }

    const values = Object.values(body)
        .filter(
            value =>
                typeof value === "string" &&
                value.trim()
        );

    if (values.length > 0) {
        return values[0];
    }

    return fallback;
}


/**
 * Wrapper around fetch for authentication requests.
 *
 * Includes credentials so the browser can send/receive
 * the httpOnly refresh-token cookie.
 */
async function authFetch(path, options = {}) {

    let response;

    try {

        response = await fetch(`${API_BASE}${path}`, {

            credentials: "include",

            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },

            ...options
        });

    } catch (networkErr) {

        throw new Error(
            "Could not reach the server. Check your connection and try again."
        );
    }


    let body = null;

    try {

        body = await response.json();

    } catch {

        // Response has no JSON body.
        // Leave body as null.
    }


    if (!response.ok) {

        throw new Error(
            extractErrorMessage(
                body,
                `Request failed (${response.status})`
            )
        );
    }


    return body;
}


/**
 * Register a new user.
 *
 * IMPORTANT:
 * University is intentionally NOT sent anymore.
 *
 * The backend determines the user's university from
 * the email domain after registration.
 */
async function registerUser({
                                name,
                                email,
                                password,
                                confirmPassword
                            }) {

    // Client-side password confirmation.
    if (password !== confirmPassword) {

        throw new Error(
            "Passwords do not match."
        );
    }


    const data = await authFetch("/register", {

        method: "POST",

        body: JSON.stringify({

            name,
            email,
            password,
            confirmPassword

        })
    });


    return data;
}


/**
 * Login an existing user.
 */
async function loginUser({
                             email,
                             password
                         }) {

    const data = await authFetch("/login", {

        method: "POST",

        body: JSON.stringify({
            email,
            password
        })
    });


    if (!data || !data.accessToken) {

        throw new Error(
            "Login succeeded but no access token was returned."
        );
    }


    localStorage.setItem(
        "accessToken",
        data.accessToken
    );


    return data;
}


/**
 * Verify email using OTP.
 */
async function verifyEmailOtp({
                                  email,
                                  otp
                              }) {

    const data = await authFetch("/verify-email", {

        method: "POST",

        body: JSON.stringify({
            email,
            otp
        })
    });


    if (!data || !data.accessToken) {

        throw new Error(
            "Verification succeeded but no access token was returned."
        );
    }


    localStorage.setItem(
        "accessToken",
        data.accessToken
    );


    return data;
}


/**
 * Resend email OTP.
 */
async function resendEmailOtp(email) {

    let response;

    try {

        response = await fetch(
            `${API_BASE}/resend-otp`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "text/plain"
                },

                body: email
            }
        );

    } catch {

        throw new Error(
            "Could not reach the server. Check your connection and try again."
        );
    }


    if (!response.ok) {

        let errorMessage =
            "Failed to resend OTP.";

        try {

            const body =
                await response.json();

            errorMessage =
                body?.message ||
                errorMessage;

        } catch {
            // Ignore invalid/empty response.
        }


        throw new Error(errorMessage);
    }


    return response;
}


/**
 * Refresh the access token using the httpOnly refresh cookie.
 */
async function refreshAccessToken() {

    const data = await authFetch(
        "/refresh",
        {
            method: "POST"
        }
    );


    if (data && data.accessToken) {

        localStorage.setItem(
            "accessToken",
            data.accessToken
        );
    }


    return data;
}


/**
 * Logout the user.
 */
async function logoutUser() {

    try {

        await authFetch(
            "/logout",
            {
                method: "POST"
            }
        );

    } finally {

        // Always clear the local access token.
        localStorage.removeItem(
            "accessToken"
        );
    }
}


/**
 * Bind an authentication form.
 */
function bindAuthForm({
                          formEl,
                          errorEl,
                          buttonEl,
                          buttonDefaultText,
                          onSubmit,
                          redirectTo
                      }) {

    formEl.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            errorEl.classList.add("hidden");
            errorEl.textContent = "";

            buttonEl.disabled = true;
            buttonEl.textContent = "Please wait...";


            try {

                await onSubmit();


                if (redirectTo) {

                    window.location.href =
                        redirectTo;
                }

            } catch (err) {

                errorEl.textContent =
                    err.message ||
                    "Something went wrong. Please try again.";

                errorEl.classList.remove(
                    "hidden"
                );

                buttonEl.disabled = false;

                buttonEl.textContent =
                    buttonDefaultText;
            }
        }
    );
}


/**
 * Check whether an existing valid session exists.
 *
 * If the refresh cookie is valid, obtain a new access token
 * and redirect the user.
 */
async function checkExistingSessionAndRedirect(
    redirectTo
) {

    try {

        const refreshed =
            await refreshAccessToken();


        if (
            !refreshed ||
            !refreshed.accessToken
        ) {

            throw new Error(
                "No active session"
            );
        }


        window.location.href =
            redirectTo;

        return true;
    } catch (err) {

        console.warn(
            "[auth.js] No valid existing session:",
            err.message
        );


        localStorage.removeItem(
            "accessToken"
        );


        return false;
    }
}