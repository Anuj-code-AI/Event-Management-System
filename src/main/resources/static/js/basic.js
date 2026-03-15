function saveTokens(access, refresh) {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
}

function getAccessToken() {
    return localStorage.getItem("accessToken");
}

function getRefreshToken() {
    return localStorage.getItem("refreshToken");
}

function clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
}

async function checkAuth() {

    const token = getAccessToken();

    if (!token) {
        showGuest();
        return;
    }

    try {

        const res = await fetch("/api/v1/auth/me", {
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (res.ok) {
            showUser();
        } else {
            logout();
        }

    } catch {
        logout();
    }
}

function showUser(){
    document.getElementById("guestActions").style.display = "none";
    document.getElementById("userActions").style.display = "block";
}

function showGuest(){
    document.getElementById("guestActions").style.display = "block";
    document.getElementById("userActions").style.display = "none";
}

function logout(){
    clearTokens();
    showGuest();
}




document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
});

