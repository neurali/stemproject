window.onload = function () {
    //used by observation and sandbox mode (not index.html) 
    function begin() {
        var tokeninput = document.getElementById("participant-token");
        var devicetype = document.getElementById("devicetype");
        var btnTaskA = document.getElementById("btnTaskA");
        var btnTaskB = document.getElementById("btnTaskB");
        var btnTaskC = document.getElementById("btnTaskC");
        var btnTaskD = document.getElementById("btnTaskD");
        var btnTaskE = document.getElementById("btnTaskE");
        var btnTaskF = document.getElementById("btnTaskF");
        var btnSandbox = document.getElementById("btnSandbox");
        btnTaskA.addEventListener("click", function (e) {
            sessionStorage.setItem("token", tokeninput.value);
            sessionStorage.setItem("devicetype", devicetype.value);
            sessionStorage.setItem("taskset", "a");
            location.href = "q1.html";
            return false;
        });
        btnTaskB.addEventListener("click", function (e) {
            sessionStorage.setItem("token", tokeninput.value);
            sessionStorage.setItem("devicetype", devicetype.value);
            sessionStorage.setItem("taskset", "b");
            location.href = "q4.html";
            return false;
        });
        btnTaskC.addEventListener("click", function (e) {
            sessionStorage.setItem("token", tokeninput.value);
            sessionStorage.setItem("devicetype", devicetype.value);
            sessionStorage.setItem("taskset", "c");
            location.href = "q7.html";
            return false;
        });
        btnTaskD.addEventListener("click", function (e) {
            sessionStorage.setItem("token", tokeninput.value);
            sessionStorage.setItem("devicetype", devicetype.value);
            sessionStorage.setItem("taskset", "d");
            location.href = "q10.html";
            return false;
        });
        btnTaskE.addEventListener("click", function (e) {
            sessionStorage.setItem("token", tokeninput.value);
            sessionStorage.setItem("devicetype", devicetype.value);
            sessionStorage.setItem("taskset", "e");
            location.href = "q13.html";
            return false;
        });
        btnTaskF.addEventListener("click", function (e) {
            sessionStorage.setItem("token", tokeninput.value);
            sessionStorage.setItem("devicetype", devicetype.value);
            sessionStorage.setItem("taskset", "f");
            location.href = "q16.html";
            return false;
        });
        btnSandbox.addEventListener("click", function () {
            sessionStorage.setItem("token", tokeninput.value);
            sessionStorage.setItem("devicetype", devicetype.value);
            sessionStorage.setItem("taskset", "b");
            sessionStorage.removeItem("observation");
            location.href = "sandbox.html";
            return false;
        });
        //this javascript is used on the observation.html page (used for observed studies)
        sessionStorage.setItem("sandbox", "pass");
        var path = window.location.pathname;
        var page = path.split("/").pop();
        console.log(page);
        if (page == "observation.html") {
            sessionStorage.setItem("observation", "true");
        }
    }
    begin();
};
//# sourceMappingURL=landingpage.js.map
//# sourceMappingURL=landingpage.js.map