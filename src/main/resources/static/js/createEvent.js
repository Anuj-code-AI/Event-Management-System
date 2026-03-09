document.addEventListener("DOMContentLoaded", async () => {

    const token = localStorage.getItem("accessToken");

    if (!token) {
        window.location.href = "/login";
        return;
    }

    try {

        const res = await fetch("/api/v1/auth/me", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (!res.ok) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.location.href = "/login";
        }

    } catch (e) {
        window.location.href = "/login";
    }

});

