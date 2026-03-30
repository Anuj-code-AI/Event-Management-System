document.addEventListener("DOMContentLoaded", loadProfile);

async function loadProfile(){

    const token = localStorage.getItem("accessToken");

    if(!token){
        window.location.href = "/login";
        return;
    }

    try{

        const res = await fetch("/api/v1/auth/me",{
            headers:{
                "Authorization":"Bearer "+token
            }
        });

        if(res.status === 401){
            logout();
            return;
        }

        if(!res.ok){
            console.error("Profile load failed:", res.status);
            return;
        }

        const user = await res.json();

        renderProfile(user);

    }catch(err){
        console.error("Network error:", err);
    }
}

function renderProfile(user){

    // hero section
    document.getElementById("userName").textContent = user.name;
    document.getElementById("userEmail").textContent = user.email;

    // avatar initial
    document.getElementById("avatarInitial").textContent =
        user.name.charAt(0).toUpperCase();

    // split name
    const names = user.name.split(" ");

    document.getElementById("firstName").value = names[0] || "";
    document.getElementById("lastName").value  = names[1] || "";

    // other fields
    document.getElementById("email").value = user.email;

    if(user.phone)
        document.getElementById("phone").value = user.phone;

    if(user.city)
        document.getElementById("city").value = user.city;
}

function showGuest(){
    document.getElementById("guestActions").style.display = "block";
    document.getElementById("userActions").style.display = "none";
}

function clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
}

function logout(){
    clearTokens();
    window.location.href="/login"
}

async function deleteAccount(){
    const token = localStorage.getItem("accessToken");

        if(!token){
            window.location.href = "/login";
            return;
        }

        try{

            const res = await fetch("/api/v1/auth/deleteAccount",{
                method: "DELETE",
                headers:{
                    "Authorization":"Bearer "+token
                }
            });

            if(!res.ok){
                alert("Can't delete account right now. Try again later")
                return;
            }
            logout();

        }catch(err){
            console.error(err);
        }
}

document.getElementById("changeName-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const name = firstName.concat(" ",lastName);
    const token = localStorage.getItem("accessToken");
    try {

        const response = await fetch("/api/v1/auth/update/me", {
            method: "PATCH",
            headers: {
                "Authorization":"Bearer "+token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name
            })
        });

        if (!response.ok) {
            throw new Error("Error while changing name");
        }

        const data = await response.json();
        alert("Profil updated successfully");
        loadProfile();

    } catch (err) {

        alert("Error while changing name");

    }
});
document.getElementById("pwForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    // client side validation
    if (newPassword !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }
    const token = localStorage.getItem("accessToken");
    try {

        const response = await fetch("/api/v1/auth/update/me", {
            method: "PATCH",
            headers: {
                "Authorization":"Bearer "+token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                password: newPassword
            })
        });

        if (!response.ok) {
            throw new Error("Error while changing password");
        }

        const data = await response.json();
        alert("Password updated successfully!")
        loadProfile();

    } catch (err) {

        alert("Error while changing password");

    }
});

document.getElementById("deleteAccount").addEventListener("click", deleteAccount);
document.getElementById("logoutBtn").addEventListener("click", logout);
