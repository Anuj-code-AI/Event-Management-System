document.addEventListener("DOMContentLoaded", checkLogin);

async function checkLogin(){

    const token = localStorage.getItem("accessToken");
    if(!token){
        window.location.href="/register";
        return;
    }

}

document.getElementById("organiserForm").addEventListener("submit", async function(e) {

    e.preventDefault();

    const collegeEmail = document.getElementById("collegeEmail").value;
    const phone = document.getElementById("phone").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    // client side validation
    if (password !== confirmPassword) {
        alert("Passwords do not match");
        return;
    }
    const token = localStorage.getItem("accessToken");
    try {

        const response = await fetch("/api/host/apply", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                collegeEmail: collegeEmail,
                phone: phone,
            })
        });

        if (!response.ok) {
            throw new Error("Request failed! Try again later");
        }

        window.location.href = "/"


    } catch (err) {

        alert("Request failed! Try again later here");

    }

});
