window.onload = function () {
    function begin() {
        var tokeninput = document.getElementById("participant-token");
        var submit = document.getElementById("btnBegin");
        submit.addEventListener("click", function (e) {
            sessionStorage.setItem("token", tokeninput.value);
            location.href = "q1.html";
            return false;
        });
    }
    begin();
};
//# sourceMappingURL=landingpage.js.map