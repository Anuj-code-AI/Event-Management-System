const params = new URLSearchParams(window.location.search);

const access = params.get("access");
const refresh = params.get("refresh");

if (access && refresh) {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    console.log(access);
    console.log(refresh);
    window.location.href = "/";
}