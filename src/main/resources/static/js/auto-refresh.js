(function() {
    let refreshTimeoutId = null;

    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    async function checkAndRefresh() {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            return;
        }

        const payload = parseJwt(token);
        if (!payload || !payload.exp) {
            return;
        }

        const expMs = payload.exp * 1000;
        const timeUntilExpiry = expMs - Date.now();
        
        // If expired or expiring in less than 60 seconds, refresh immediately
        if (timeUntilExpiry < 60000) {
            console.log("[auto-refresh] Token is close to expiring or expired. Refreshing now...");
            const success = await performRefresh();
            if (!success) {
                console.warn("[auto-refresh] Silent refresh failed.");
            }
        } else {
            // Schedule refresh 60 seconds before expiration
            const delay = timeUntilExpiry - 60000;
            if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
            refreshTimeoutId = setTimeout(checkAndRefresh, delay);
            console.log(`[auto-refresh] Scheduled next refresh in ${Math.round(delay / 1000)}s`);
        }
    }

    async function performRefresh() {
        try {
            const response = await fetch("/api/v1/auth/refresh", {
                method: "POST",
                credentials: "include", // send httpOnly cookie
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.accessToken) {
                    localStorage.setItem("accessToken", data.accessToken);
                    console.log("[auto-refresh] Access token refreshed successfully.");
                    // Check and schedule next refresh
                    checkAndRefresh();
                    
                    // Dispatch custom event to notify other scripts
                    window.dispatchEvent(new CustomEvent("tokenRefreshed", { detail: { accessToken: data.accessToken } }));
                    return true;
                }
            } else if (response.status === 401 || response.status === 403) {
                console.warn("[auto-refresh] Token refresh unauthorized. Clearing access token.");
                localStorage.removeItem("accessToken");
            }
        } catch (err) {
            console.error("[auto-refresh] Error calling refresh API:", err);
        }
        return false;
    }

    // Expose refreshAccessToken globally as a fallback helper
    window.refreshAccessToken = async function() {
        try {
            const response = await fetch("/api/v1/auth/refresh", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.accessToken) {
                    localStorage.setItem("accessToken", data.accessToken);
                    checkAndRefresh();
                    return data;
                }
            } else if (response.status === 401 || response.status === 403) {
                localStorage.removeItem("accessToken");
            }
        } catch (e) {
            console.error("[auto-refresh] refreshAccessToken helper failed:", e);
        }
        return null;
    };

    // Run check on load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", checkAndRefresh);
    } else {
        checkAndRefresh();
    }
    
    // Check when window gains focus (in case computer went to sleep)
    window.addEventListener("focus", checkAndRefresh);

    window.autoRefreshTokens = checkAndRefresh;
})();
