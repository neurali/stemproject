window.onload = function () {
    function begin() {
        var tokeninput = document.getElementById("participant-token") as HTMLInputElement;
        // var devicetype = document.getElementById("devicetype");
        var btnTaskA = document.getElementById("btnTaskA");
        var btnTaskB = document.getElementById("btnTaskB"); 

        sessionStorage.removeItem("observation");
        sessionStorage.removeItem("sandbox");
        sessionStorage.removeItem("taskset");
        

        
        
        tokeninput.addEventListener("change",(e)=>{
            sessionStorage.setItem("token", tokeninput.value);
        });

        
        //get parameters:
        let querystring = window.location.search;
        let params = new URLSearchParams(querystring);
        let q = params.get("q");

        if(q == "missingtoken")
        {
            alert("please enter a valid token");
        }
        else if(q == "nextquestion")
        {
            alert("question submitted");
        }

    }
    begin();
};
//# sourceMappingURL=landingpage.js.map