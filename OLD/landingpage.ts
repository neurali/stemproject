window.onload =()=>{
    
    function begin(){

        let tokeninput = document.getElementById("participant-token") as HTMLInputElement;
        let devicetype = document.getElementById("devicetype") as HTMLInputElement;

        let btnTaskA = document.getElementById("btnTaskA") as HTMLElement;
        let btnTaskB = document.getElementById("btnTaskB") as HTMLElement;

        

        btnTaskA.addEventListener("click",(e)=>{  
            sessionStorage.setItem("token",tokeninput.value);    
            sessionStorage.setItem("devicetype",devicetype.value);
            sessionStorage.setItem("taskset","a")
            location.href = "q1.html";
            return false;            
        });

        btnTaskB.addEventListener("click",(e)=>{           
            sessionStorage.setItem("token",tokeninput.value);    
            sessionStorage.setItem("devicetype",devicetype.value);
            sessionStorage.setItem("taskset","b")
            location.href = "q4.html";
            return false;            
        });


        
    }

    begin();
}
    