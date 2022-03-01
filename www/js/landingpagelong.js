window.onload = function () {
    function begin() {
        var tokeninput = document.getElementById("participant-token");
        // var devicetype = document.getElementById("devicetype");
        var btnTaskA = document.getElementById("btnTaskA");
        var btnTaskB = document.getElementById("btnTaskB");
        sessionStorage.removeItem("observation");
        sessionStorage.removeItem("sandbox");
        sessionStorage.removeItem("taskset");
        tokeninput.addEventListener("change", function (e) {
            sessionStorage.setItem("token", tokeninput.value);
        });
        //get parameters:
        var querystring = window.location.search;
        var params = new URLSearchParams(querystring);
        var q = params.get("q");
        if (q == "missingtoken") {
            alert("please enter a valid token");
        }
        else if (q == "nextquestion") {
            alert("question submitted");
        }
    }
    begin();
};
//# sourceMappingURL=landingpage.js.map
//# sourceMappingURL=landingpagelong.js.map