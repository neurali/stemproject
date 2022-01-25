class Toolbox {

    // undo,redo,copy,paste,clear
    btnUndo: HTMLElement; btnRedo: HTMLElement; btnCopy: HTMLElement; btnPaste: HTMLElement; btnClear: HTMLElement;
    // draw,erase,select,text,line,rectangle
    btnDraw: HTMLElement; btnErase: HTMLElement; btnSelect: HTMLElement; btnText: HTMLElement; btnLine: HTMLElement; btnRectangle: HTMLElement; btnCircle: HTMLElement;
    // size,colour...
    btnSize1:HTMLElement; btnSize2:HTMLElement; btnSize3:HTMLElement; btnSize4:HTMLElement; btnSize5:HTMLElement;
    
    btnColGreen: HTMLElement; btnColBlack: HTMLElement; btnColRed: HTMLElement; btnColBlue: HTMLElement; btnColPurple: HTMLElement; btnColOrange: HTMLElement;
    // save,next
    btnSave: HTMLElement; btnNext: HTMLElement;
    //toolgroups
    drawtools: HTMLCollectionOf<Element>; 
    colourtools: HTMLCollectionOf<Element>;
    sizetools: HTMLCollectionOf<Element>;
    //management variables:
    private previoustool:string;
    selectedtool:string;

    selectedDrawSize:number;
    selectedColour:string = "Black";

    //sentinel which tracks the start and endpoint of a draw stroke
    isDrawingObject:boolean = false;

    constructor(eventel:HTMLElement){

        console.log("init drawing tools");
        this.assignelements();
    
        //drawtools
        for (let i = 0; i < this.drawtools.length; i++) {
            let cur = this.drawtools[i] as HTMLElement;
            cur.addEventListener("click", (e) => {    
                //remove darken from all the tools
                for (let i = 0; i < this.drawtools.length; i++) {
                    this.drawtools[i].classList.remove("darken-3");;
                }                
                //add darken to the clicked button
                cur.classList.add("darken-3");
                let innertext = cur.innerText;
                let split = innertext.split(/\r?\n/);
                //get text of selected
                let selectedtooltext = split[split.length-1];
                
                //detect if tool has actually changed
                this.previoustool = this.selectedtool;
                if(this.previoustool != selectedtooltext)
                {
                    this.selectedtool = selectedtooltext;
                    eventel.dispatchEvent(new Event(toolboxevents.toolchanged));
                }
            });
        }

        //colourtools
        for(let i = 0; i < this.colourtools.length; i++)
        {
            let cur = this.colourtools[i] as HTMLElement;
            cur.addEventListener("click", (e)=>{
                for (let i = 0; i < this.colourtools.length; i++) {
                    this.colourtools[i].classList.remove("z-depth-3");;
                } 
                cur.classList.add("z-depth-3")
                let temp = cur.id.slice(6);

                if(temp == "Red")
                {
                    this.selectedColour = "#E53935";
                }
                else if(temp == "Green")
                {
                    this.selectedColour = "#388E3C";
                }
                else if(temp == "Blue")
                {
                    this.selectedColour = "#1976D2";
                }
                else if(temp == "Purple")
                {
                    this.selectedColour = "#7b1fa2";
                }
                else if(temp == "Orange")
                {
                    this.selectedColour = "#ff9800";
                }
                else
                {
                    this.selectedColour = "Black";
                }
                

            })
 
        }

        //sizetools
        for(let i = 0; i < this.sizetools.length; i++)
        {
            let cur = this.sizetools[i] as HTMLElement;
            cur.addEventListener("click", (e)=>{
                for (let i = 0; i < this.sizetools.length; i++) {
                    this.sizetools[i].classList.remove("z-depth-2");
                    this.sizetools[i].classList.remove("darken-4");
                } 
                cur.classList.add("z-depth-2")
                cur.classList.add("darken-4")

                let selectedsize = parseInt(cur.id.slice(-1)); 
                
                switch(selectedsize)
                {
                    case 1:  
                    this.selectedDrawSize = 4;                  
                    break;
                    case 2:  
                    this.selectedDrawSize = 7;                  
                    break;
                    case 3:  
                    this.selectedDrawSize = 10;                   
                    break;
                    case 4:    
                    this.selectedDrawSize = 14;                 
                    break;
                    case 5: 
                    this.selectedDrawSize = 17;                    
                    break;
                }

            })
        }

    }


    on(){
    }
    dispatch()
    {}

    assignelements(){
        this.btnUndo = document.getElementById("btnUndo");
        this.btnRedo = document.getElementById("btnRedo");
        this.btnCopy = document.getElementById("btnCopy");
        this.btnPaste = document.getElementById("btnPaste");
        this.btnClear = document.getElementById("btnClear");
    
        this.btnDraw = document.getElementById("btnDraw");
        this.btnErase = document.getElementById("btnErase");
        this.btnSelect = document.getElementById("btnSelect");
        this.btnText = document.getElementById("btnText");
        this.btnLine = document.getElementById("btnLine");
        this.btnRectangle = document.getElementById("btnRectangle");
        this.btnCircle = document.getElementById("btnCircle");
    
        this.btnSize1 = document.getElementById("btnSize1");//
        this.btnSize2 = document.getElementById("btnSize2");
        this.btnSize3 = document.getElementById("btnSize3");
        this.btnSize4 = document.getElementById("btnSize4");
        this.btnSize5 = document.getElementById("btnSize5");

    
        this.btnColGreen = document.getElementById("btnColGreen");
        this.btnColBlack = document.getElementById("btnColBlack");
        this.btnColRed = document.getElementById("btnColRed");
        this.btnColBlue = document.getElementById("btnColBlue");
        this.btnColPurple = document.getElementById("btnColPurple");
        this.btnColOrange = document.getElementById("btnColOrange");
    
        this.btnSave = document.getElementById("btnSave");
        this.btnNext = document.getElementById("btnNext");
    
        this.drawtools = document.getElementsByClassName("tool");
        this.colourtools = document.getElementsByClassName("palette");
        this.sizetools = document.getElementsByClassName("sizebtn")


    }
    
}