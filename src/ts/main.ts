window.onload =()=>{
    //const addDiagramButtons = document.getElementsByClassName("add-diagram"); //this wont change once page loads
    //let btn = addDiagramButtons.item[0]; //TESTING get the first add diagram button
    //btn.addEventListener
    let canvasq1 = new Stemcanvas("canvasq1")
    

   

    //@ts-ignore 
    M.AutoInit();

    var tooltippedelements = document.getElementsByClassName("tooltipped");

    let options = {enterDelay:900};
    //@ts-ignore
    var instances = M.Tooltip.init(tooltippedelements, options);
    
}