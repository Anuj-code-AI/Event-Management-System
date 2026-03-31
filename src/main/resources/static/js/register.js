document.getElementById("registerForm").addEventListener("submit", async function(e) {

    e.preventDefault();

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const name = firstName.concat(" ",lastName);
    // client side validation
    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }

    try {

        const response = await fetch("/api/v1/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                confirmPassword: confirmPassword
            })
        });

        if (!response.ok) {
            throw new Error("Registration failed");
        }

        const data = await response.json();

        // store tokens
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);

        // redirect after registration
        window.location.href = "/";

    } catch (err) {

        alert("Registration failed. Try again.");

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