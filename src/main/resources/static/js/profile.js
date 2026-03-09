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

        if(!res.ok){
            logout();
            return;
        }

        const user = await res.json();

        renderProfile(user);

    }catch(err){
        console.error(err);
        logout();
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

function logout(){
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");

    window.location.href="/login";
}