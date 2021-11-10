window.onload = function () {
    function begin() {
        var tokeninput = document.getElementById("participant-token");
        var devicetype = document.getElementById("devicetype");
        var btnTaskA = document.getElementById("btnTaskA");
        var btnTaskB = document.getElementById("btnTaskB");
        sessionStorage.setItem("token", tokeninput.value);
        sessionStorage.setItem("devicetype", devicetype.value);
        btnTaskA.addEventListener("click", function (e) {
            sessionStorage.setItem("taskset", "a");
            location.href = "q1.html";
            return false;
        });
        btnTaskB.addEventListener("click", function (e) {
            sessionStorage.setItem("taskset", "b");
            location.href = "q4.html";
            return false;
        });
    }
    begin();
};
//# sourceMappingURL=landingpage.js.map