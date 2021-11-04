window.onload =()=>{
    
    function begin(){

        let tokeninput = document.getElementById("participant-token") as HTMLInputElement;
        let submit = document.getElementById("btnBegin") as HTMLElement;

        submit.addEventListener("click",(e)=>{

            sessionStorage.setItem("token",tokeninput.value);           
           
            location.href = "q1.html";
            return false;
            
        });
        
    }

    begin();
}
    