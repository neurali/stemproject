window.onload = () => {
    //const addDiagramButtons = document.getElementsByClassName("add-diagram"); //this wont change once page loads
    //let btn = addDiagramButtons.item[0]; //TESTING get the first add diagram button
    //btn.addEventListener
//@ts-ignore 
M.AutoInit(); //load materialize 
var tooltippedelements = document.getElementsByClassName("tooltipped");
let options = { enterDelay: 900 };
    //@ts-ignore
var instances = M.Tooltip.init(tooltippedelements, options);

let drawingcanvas = new Stemcanvas("canvasdrawing")



}


