document.getElementById("loginForm").addEventListener("submit", async function(e) {

    e.preventDefault(); // stop normal form submit

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {

        const response = await fetch("/api/v1/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        if (!response.ok) {
            throw new Error("Invalid credentials");
        }

        const data = await response.json();

        // store tokens
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        // redirect after login
        window.location.href = "/";

    } catch (error) {

        alert("Login failed. Please check your credentials.");

    }

});

document.addEventListener("DOMContentLoaded", async () => {

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    try {
            const res = await fetch("/api/v1/auth/me", {
                headers: {
                    "Authorization": "Bearer " + token
                }
            });

            if (res.ok) {
                window.location.href = "/";
            }

        } catch (e) {
            console.log("Token validation failed");
        }
});

function redirectOAuth(provider) {
    if (provider === "google") {
        window.location.href = "/oauth2/authorization/google";
    } else if (provider === "github") {
        window.location.href = "/oauth2/authorization/github";
    }
}
