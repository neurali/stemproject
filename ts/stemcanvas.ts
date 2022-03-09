class Stemcanvas {

    isios: boolean;
    drawingdata: Array<Stemstroke>;


    undoredo:StateManager;
    //undoActions: Array<UndoAction>; //holds things that can be undone
    //redoActions: Array<UndoAction>; //holds things that can be redone

    canvasbackground: HTMLDivElement;
    drawingcanvas: HTMLCanvasElement;
    selectioncanvas: HTMLCanvasElement;
    cursorcanvas: HTMLCanvasElement;
    interfacecanvas: HTMLCanvasElement;
    debugcanvas: HTMLCanvasElement;

    contextDrawing: CanvasRenderingContext2D;
    contextSelection: CanvasRenderingContext2D;
    contextCursor: CanvasRenderingContext2D;
    contextInterface: CanvasRenderingContext2D;
    contextDebug: CanvasRenderingContext2D;

    toolbox: Toolbox //holds all the user controls with management
    pen: Pen
    cursor: cursor;

    eventel: HTMLElement; //this element dispatches events

    canvasscrollx: number = 0;
    canvascrolly: number = 0;
    canvascontainer: HTMLElement;
    currentstroke: Stemstroke;
    currentstrokebuffer: Stemstroke;

    //holds the flattend image when crystalised
    flatimage: ImageBitmap;

    selectionManager: SelectionManager;
    menuImage = new Image();

    touchcount: number = 0;
    touchscrolltracker: Stemstroke;//keeps track when touch users are using two fingers to pan
    debug: HTMLParagraphElement;

    //session info
    participant: string;
    taskset: string;
    task: string;
    devicetype: string;
    observation: string = "false";//this will get set if the question starts from the observation page

    //session info for file download:
    //session start time clock
    starttimeclock: string = "";
    //session start time performance
    starttimeperf: string = "";
    //session end time clock
    endtimeclock: string = "";

    constructor(id: string) {



        var isIOS = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
        if (isIOS) {
            this.isios = true;
        }
        else {
            this.isios = false;
        }

        //load the session details:   
        this.participant = sessionStorage.getItem("token");
        this.taskset = sessionStorage.getItem("taskset");
        this.devicetype = sessionStorage.getItem("devicetype");

        this.observation = sessionStorage.getItem("observation");

        let regex = /[a-zA-Z][0-9]+_[a-zA-Z][a-zA-Z]/i;
        this.participant = sessionStorage.getItem("token");
        if (regex.test(this.participant)) {
            //get values from the participant token
            this.taskset = "longitudinal";
            let split = this.participant.charAt(2); //A == Apple W== Wacom
            if (split == "A") {
                this.devicetype = "iPad";
            }
            else if (split == "W") {
                this.devicetype = "Wacom";
            }
            else {
                this.devicetype = "unknowntoken";
            }
        }
        else {

            let lethrough = sessionStorage.getItem("sandbox");
            if (lethrough == "pass") {

            }
            else//else they are accessing from the longitudinal without a token
            {
                //so send them back to the index page with get parameter to display a message "Please enter a valid token to continue"
                window.location.href = "index.html?q=missingtoken";
            }






        }

        let sessioninfo = document.getElementById("sessioninfo") as HTMLElement;
        let attTasknumber = sessioninfo.attributes.getNamedItem("data-tasknumber");
        this.task = attTasknumber.value;

        if (this.taskset == "a") {
            if (this.task == "q3") {
                document.getElementById("btnNext").classList.add("hidden");
            }
        }
        else if (this.taskset == "b") {
            if (this.task == "q6") {
                document.getElementById("btnNext").classList.add("hidden");
            }
        }

        this.menuImage.src = "media/cursors/c_Menu.png"
        this.drawingdata = new Array<Stemstroke>();      


        this.canvasbackground = document.getElementById("canvasbackground") as HTMLDivElement;
        this.canvascontainer = document.getElementById("canvas-scroll-container");
        this.drawingcanvas = document.getElementById(id) as HTMLCanvasElement;
        this.selectioncanvas = document.getElementById("selectioncanvas") as HTMLCanvasElement;
        this.cursorcanvas = document.getElementById("cursorcanvas") as HTMLCanvasElement;
        this.interfacecanvas = document.getElementById("interfacecanvas") as HTMLCanvasElement;
        this.debugcanvas = document.getElementById("debugcanvas") as HTMLCanvasElement;
        this.debug = document.getElementById("debug") as HTMLParagraphElement;

        this.initialisecanvas();
        this.undoredo = new StateManager(this.drawingdata);
        this.startTimer();
        requestAnimationFrame(this.mainloop.bind(this));

    }

    initialisecanvas() {
       
        this.canvasbackground.style.minHeight = Canvasconstants.height + "px";
        this.canvasbackground.style.minWidth = Canvasconstants.width + "px";

        //initialise
        this.drawingcanvas.width = Canvasconstants.width;
        this.drawingcanvas.height = Canvasconstants.height;

        //now align the othercanvases
        this.selectioncanvas.width = Canvasconstants.width;
        this.selectioncanvas.height = Canvasconstants.height;

        this.cursorcanvas.width = Canvasconstants.width;
        this.cursorcanvas.height = Canvasconstants.height;

        this.interfacecanvas.width = Canvasconstants.width;
        this.interfacecanvas.height = Canvasconstants.height;

        this.debugcanvas.width = Canvasconstants.width;
        this.debugcanvas.height = Canvasconstants.height;

        //init pen
        this.pen = new Pen(this.eventel);

        //init drawing contexts
        this.contextDrawing = this.drawingcanvas.getContext("2d");
        this.contextSelection = this.selectioncanvas.getContext("2d");
        this.contextCursor = this.cursorcanvas.getContext("2d");
        this.contextInterface = this.interfacecanvas.getContext("2d");
        this.contextDebug = this.debugcanvas.getContext("2d");

        this.contextCursor.fillStyle = "black";

        //create event element
        this.eventel = document.createElement("a");
        this.eventel.setAttribute("type", "hidden");
        this.eventel.id = "eventel";
        this.drawingcanvas.appendChild(this.eventel);
        this.toolbox = new Toolbox(this.eventel);
        this.eventel.addEventListener(toolboxevents.toolchanged, () => {
            this.cursor.currentTool = this.toolbox.selectedtool;
            this.selectionManager.currentSelectionID = "";
            this.selectionManager.currentlySelected = null;
            this.selectionManager.FlushSelection();
            this.selectionManager.fresh = false;
            this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            this.touchcount = 0; //reset touch count (as a quick fix)
        });
        this.eventel.addEventListener(toolboxevents.sizechanged,()=>{
            let size = this.toolbox.selectedDrawSize;
            if(this.selectionManager.currentlySelected != null)
            {
                this.selectionManager.currentlySelected.strokewidth = size;
                
            }
            else if(this.selectionManager.currentlySelectedMulti != null)
            {
                for(let i = 0; i < this.selectionManager.currentlySelectedMulti.length; i++)
                {
                    this.selectionManager.currentlySelectedMulti[i].strokewidth = this.toolbox.selectedDrawSize;
                }
            }
            this.updateDrawing();
        })
        this.eventel.addEventListener(toolboxevents.colourchanged,()=>{
            if(this.selectionManager.currentlySelected != null)
            {
                this.selectionManager.currentlySelected.strokecolour = this.toolbox.selectedColour;
            }
            else if(this.selectionManager.currentlySelectedMulti != null)
            {
                for(let i = 0; i < this.selectionManager.currentlySelectedMulti.length; i++)
                {
                    this.selectionManager.currentlySelectedMulti[i].strokecolour = this.toolbox.selectedColour;
                }
            }
            this.updateDrawing();

        });
        this.toolbox.selectedtool = "DRAW";
        this.toolbox.selectedDrawSize = 5;



        //canvas interaction events
        this.drawingcanvas.addEventListener("pointerenter", this.PointerEnterEvent.bind(this));
        this.drawingcanvas.addEventListener("pointermove", this.PointerMoveEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerdown", this.PointerDownEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerup", this.PointerUpEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerleave", this.PointerLeaveEvent.bind(this));
        this.drawingcanvas.addEventListener("touchstart", (e) => { e.preventDefault() });

        this.canvascontainer.addEventListener('scroll', (e) => {
            this.canvascrolly = this.canvascontainer.scrollTop;
            this.canvasscrollx = this.canvascontainer.scrollLeft;

        });

        document.getElementById("btnConfirmClear").addEventListener("click", () => {
            this.clearcanvas();
        });

        document.getElementById("btnUndo").addEventListener("click", () => {
            this.undo();

        })
        document.getElementById("btnRedo").addEventListener("click", () => {
            this.redo();
        })
        document.getElementById("btnCopy").addEventListener("click", () => {

            this.copy();
        })
        document.getElementById("btnPaste").addEventListener("click", () => {
            this.paste();
        })
        //

        // 
        document.getElementById("btnGrid").addEventListener("click", () => {
            console.log("btnclicked");
            this.canvasBackgroundSwitch("grid");
        })
        document.getElementById("btnLines").addEventListener("click", () => {
            console.log("btnclicked");
            this.canvasBackgroundSwitch("lines");
        })
        document.getElementById("btnBlank").addEventListener("click", () => {
            console.log("btnclicked");
            this.canvasBackgroundSwitch("blank");
        })

        document.getElementById("btnSave").addEventListener("click", () => {
            this.uploadData();
        })
        if (this.observation == "true") {
            document.getElementById("btnNext").addEventListener("click", () => {
                this.NextAndUpload();
            })
        }

        var showingmore = true;

        document.getElementById("showmore").addEventListener("click", () => {
            let questiontext = document.getElementById("questiontext") as HTMLElement;
            let questioncontainer = document.getElementById("questioncontainer") as HTMLElement;
            let viewportheight = window.innerHeight;
            let canvascontainer = document.getElementById("canvas-scroll-container");
            let showmorelabel = document.getElementById("showmore") as HTMLElement;

            if (showingmore == false) {
                //remove max-height from question text
                showingmore = true;
                // questiontext.classList.remove("truncate");
                questiontext.classList.remove("line-clamp");
                //get height of question row
                let questioncontainerbounds = questioncontainer.getBoundingClientRect();
                let bottom = questioncontainerbounds.bottom;
                let remainingspace = viewportheight - bottom;
                console.log(remainingspace);
                canvascontainer.style.height = "" + (remainingspace - 20) + "px";
                showmorelabel.innerText = "-";
                //now set max height of the canvas container to the remaining space on screen

            }
            else {
                //set it maxheigh back again
                showingmore = false;
                //questiontext.classList.add("truncate");
                questiontext.classList.add("line-clamp");
                //get height of question row
                let questioncontainerbounds = questioncontainer.getBoundingClientRect();
                let bottom = questioncontainerbounds.bottom;
                let remainingspace = viewportheight - bottom;
                console.log(remainingspace);
                canvascontainer.style.height = "" + (remainingspace - 20) + "px";
                showmorelabel.innerText = "+";

            }
        });

        this.cursor = new cursor(this.contextCursor, this.pen);
        this.cursor.currentTool = "DRAW";

        this.selectionManager = new SelectionManager(this.drawingdata, this.contextDebug);
        this.contextSelection.strokeStyle = "black";
        this.contextSelection.lineWidth = 1;
        this.contextSelection.setLineDash([5]);

        this.canvascontainer.scrollLeft = ((Canvasconstants.width - this.canvascontainer.clientWidth) / 2);

        

    }

    cursPointer: any;
    cursMove: any;
    cursNE: any;
    cursNW: any;
    cursCircle: any;
    cursErase: any;
    cursRect: any;
    cursDraw: any;
    cursType: any;

    canvasBackgroundSwitch(s: string) {

        console.log(s);
        let canvasbackground = document.getElementById("canvasbackground") as HTMLDivElement;


        if (s == "blank") {

            canvasbackground.style.backgroundImage = "url(./media/canvasBG/blank.png)"
        }
        else if (s == "grid") {
            canvasbackground.style.backgroundImage = "url(./media/canvasBG/bg.png)"
        }
        else if (s == "lines") {
            canvasbackground.style.backgroundImage = "url(./media/canvasBG/lines.png)"
        }

    }
    clearcanvas() {
        this.drawingdata = new Array();
        this.undoredo.clear();
        this.selectionManager.FlushSelection();
        this.selectionManager = new SelectionManager(this.drawingdata, this.contextDebug);
        this.updateDrawing();
    }
    undo() {

        this.undoredo.undo();
        this.updateDrawing();
        
    }
    redo() {
        this.undoredo.redo();
        this.updateDrawing();
    }
    copy() {

        if (this.selectionManager.currentlySelected != null) {
            this.selectionManager.copySelected();
            //@ts-ignore 
            M.toast({ html: 'Copied' });
        }
        else {

            //@ts-ignore 
            M.toast({ html: 'Select object first' });
        }



    }
    paste() {

        this.selectionManager.pasteFromClipboard();

        this.updateDrawing();

    }
    //gets called by animation updates:
    mainloop() {
        this.calculationloop();
        this.drawloop(); //draws to canvas
        requestAnimationFrame(this.mainloop.bind(this));
    }
    //handles object detection when using select tool
    calculationloop() {

        if (this.toolbox.selectedtool == "SELECT") {
            if (this.pen.onCanvas) {

            }
        }
    }
    drawloop() {

        this.drawloopStroke();
        this.drawloopSelection();
        // this.drawContextMenu()
        this.drawloopCursor();
    }
    drawloopCursor() {
        //cursor drawing
        if (this.pen.onCanvas) {
            this.cursor.render();

            if (this.toolbox.selectedtool == "SELECT" && this.currentstroke != null) {
                this.currentstroke.UpdateBoundingBox("");
                if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {
                    if (!this.cursor.interacting) {
                        this.renderSelectionMarquee();
                    }

                }
            }


        }
        else {
            this.contextCursor.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
        }







    }
    drawloopStroke() {
        //stroke drawing
        if (this.pen.penDown) {
            if (this.toolbox.selectedtool == "DRAW") {
                this.drawCurrentStroke();
            }
            else if (this.toolbox.selectedtool == "LINE") {
                this.drawCurrentLine();
            }
            else if (this.toolbox.selectedtool == "RECTANGLE") {
                this.drawCurrentRectangle();
            }
            else if (this.toolbox.selectedtool == "CIRCLE") {
                this.drawCurrentCircle();
            }

        }
        else {
            if (this.toolbox.selectedtool == "LINE" || this.toolbox.selectedtool == "RECTANGLE" || this.toolbox.selectedtool == "CIRCLE") {
                if (!this.selectionManager.fresh) {
                    this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);

                }
            }
        }


    }
    drawloopSelection() {
        //draws the static marquee around a selected object
        //dirty the selection if the pen is down and interacting with an object:
        if (this.pen.onCanvas && this.pen.penDown && this.cursor.interacting) {
            this.selectionManager.fresh = false;
        }

        if (this.selectionManager.fresh == false || this.selectionManager.multifresh == false) {
            this.contextSelection.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            if (this.selectionManager.currentlySelected != null) {
                //draw the selected object bounds - black and white lines   
                this.selectionManager.currentlySelected.UpdateBoundingBox("");
                let box = this.selectionManager.currentlySelected.getCachedBoundingBox();
                this.contextSelection.setLineDash([0]);
                this.contextSelection.beginPath();
                this.contextSelection.moveTo(box.originx, box.originy); //start at topleft
                this.contextSelection.lineTo(box.maxX, box.originy);
                this.contextSelection.lineTo(box.maxX, box.maxY);
                this.contextSelection.lineTo(box.originx, box.maxY);
                this.contextSelection.lineTo(box.originx, box.originy);
                this.stroke("selection");
                //this.contextSelection.closePath();

                this.contextSelection.setLineDash([9]);
                this.contextSelection.strokeStyle = "white";
                this.contextSelection.beginPath();
                this.contextSelection.moveTo(box.originx, box.originy); //start at topleft
                this.contextSelection.lineTo(box.maxX, box.originy);
                this.contextSelection.lineTo(box.maxX, box.maxY);
                this.contextSelection.lineTo(box.originx, box.maxY);
                this.contextSelection.lineTo(box.originx, box.originy);
                this.stroke("selection");


                //now draw the interactionboxes
                this.contextSelection.fillStyle = "white"
                this.contextSelection.strokeStyle = "black";

                this.contextSelection.setLineDash([0]);

                this.contextSelection.fillRect(box.originx - 5, box.originy - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);
                this.contextSelection.strokeRect(box.originx - 5, box.originy - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);

                this.contextSelection.fillRect(box.maxX - 5, box.originy - 5, 10, 10);
                this.contextSelection.strokeRect(box.maxX - 5, box.originy - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);

                this.contextSelection.fillRect(box.maxX - 5, box.maxY - 5, 10, 10);
                this.contextSelection.strokeRect(box.maxX - 5, box.maxY - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);

                this.contextSelection.fillRect(box.originx - 5, box.maxY - 5, 10, 10);
                this.contextSelection.strokeRect(box.originx - 5, box.maxY - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);


                if (this.pen.onCanvas && this.pen.penDown) {
                    if (this.cursor.interacting) {
                        //now render move or resize previews
                        if (this.toolbox.selectedtool == "SELECT") {

                            if (this.cursor.selectmodifier == "MOVE") {

                                //calc and affect move vector to selected object points
                                let vector = this.getCurrentStrokeVector();
                                let previewstroke = new Stemstroke();

                                if (this.selectionManager.currentlySelected != null) {
                                    console.log("currently selected is not null");
                                    this.selectionManager.currentlySelected.points.forEach(p => {
                                        previewstroke.points.push(new Stempoint(p.x + vector.x, p.y + vector.y));
                                    });

                                    if (this.selectionManager.currentlySelected.objecttype == "DRAW") {
                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(previewstroke.points[0].x, previewstroke.points[0].y);
                                        previewstroke.points.forEach(p => {
                                            this.contextSelection.lineTo(p.x, p.y);
                                        });
                                        this.stroke("selection");
                                    }
                                    else if (this.selectionManager.currentlySelected.objecttype == "LINE") {
                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(previewstroke.points[0].x, previewstroke.points[0].y);
                                        this.contextSelection.lineTo(previewstroke.points[previewstroke.points.length - 1].x, previewstroke.points[previewstroke.points.length - 1].y);
                                        this.stroke("selection");
                                    }
                                    else if (this.selectionManager.currentlySelected.objecttype == "RECTANGLE") {

                                        previewstroke.objecttype = "RECTANGLE";
                                        previewstroke.UpdateBoundingBox("");
                                        let previewbox = previewstroke.getCachedBoundingBox();

                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(previewbox.originx, previewbox.originy);
                                        this.contextSelection.lineTo(previewbox.maxX, previewbox.originy);
                                        this.contextSelection.lineTo(previewbox.maxX, previewbox.maxY);
                                        this.contextSelection.lineTo(previewbox.originx, previewbox.maxY);
                                        this.contextSelection.lineTo(previewbox.originx, previewbox.originy);
                                        this.contextSelection.stroke();
                                        this.contextSelection.closePath();

                                    }
                                    else if (this.selectionManager.currentlySelected.objecttype == "CIRCLE") {
                                        previewstroke.objecttype = "CIRCLE";
                                        previewstroke.UpdateBoundingBox("");
                                        let previewbox = previewstroke.getCachedBoundingBox();
                                        this.contextSelection.beginPath();

                                        //

                                        let radius = previewstroke.getPixelLength();
                                        let midx = (previewbox.maxX + previewbox.originx) / 2;
                                        let midy = (previewbox.maxY + previewbox.originy) / 2;


                                        this.contextSelection.arc(midx, midy, radius, 0, 3.16 * 2);
                                        //this.contextSelection.stroke();
                                        this.stroke("selection");
                                        //this.contextSelection.closePath();
                                        //
                                    }
                                }



                            }
                            else if (this.cursor.selectmodifier.length == 2) //check if its any of the resize modifiers (NE,NW,SW,SE)
                            {
                                let resizevector = this.getCurrentStrokeVector();
                                let previewstroke = new Stemstroke();
                                previewstroke = this.resizeStroke(this.selectionManager.currentlySelected, resizevector, this.cursor.selectmodifier);
                                let selectedtype = this.selectionManager.currentlySelected.objecttype;
                                if (selectedtype == "DRAW") {

                                    this.contextSelection.beginPath();
                                    this.contextSelection.moveTo(previewstroke.points[0].x, previewstroke.points[0].y);
                                    previewstroke.points.forEach(p => {
                                        this.contextSelection.lineTo(p.x, p.y);
                                    });
                                    this.stroke("selection");
                                }
                                else if (selectedtype == "CIRCLE") {
                                    if (previewstroke.points.length > 1) {

                                        previewstroke.objecttype = "CIRCLE";
                                        previewstroke.UpdateBoundingBox("");
                                        let previewbox = previewstroke.getCachedBoundingBox();

                                        this.contextSelection.beginPath();


                                        let radius = previewstroke.getPixelLength();
                                        let midx = (previewbox.maxX + previewbox.originx) / 2;
                                        let midy = (previewbox.maxY + previewbox.originy) / 2;
                                        this.contextSelection.arc(midx, midy, radius, 0, 3.16 * 2);
                                        this.stroke("selection");
                                    }

                                }
                                else if (selectedtype == "LINE") {
                                    if (previewstroke.points.length > 1) {

                                        let first = previewstroke.points[0];
                                        let last = previewstroke.points[previewstroke.points.length - 1];

                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(first.x, first.y);
                                        this.contextSelection.lineTo(last.x, last.y)
                                        this.stroke("selection");
                                    }

                                }
                                else if (selectedtype == "RECTANGLE") {

                                    if (previewstroke.points.length > 1) {


                                        previewstroke.UpdateBoundingBox("");
                                        let first = previewstroke.points[0];
                                        let last = previewstroke.points[previewstroke.points.length - 1];

                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(first.x, first.y);
                                        this.contextSelection.lineTo(last.x, first.y);
                                        this.contextSelection.lineTo(last.x, last.y);
                                        this.contextSelection.lineTo(first.x, last.y);
                                        this.contextSelection.lineTo(first.x, first.y);
                                        this.stroke("selection");
              
                                    }
                                }
                            }



                        }
                    }
                }



                //draw the selection
                this.selectionManager.fresh = true;
            }
            //if(single object is not selected)
            //else ->
            else {

                if (this.selectionManager.currentlySelectedMulti != null) {

                    let boundingbox = this.selectionManager.getGroupBoundingBox();

                    this.contextSelection.setLineDash([0]);
                    this.contextSelection.beginPath();
                    this.contextSelection.moveTo(boundingbox.originx, boundingbox.originy); //start at topleft
                    this.contextSelection.lineTo(boundingbox.maxX, boundingbox.originy);
                    this.contextSelection.lineTo(boundingbox.maxX, boundingbox.maxY);
                    this.contextSelection.lineTo(boundingbox.originx, boundingbox.maxY);
                    this.contextSelection.lineTo(boundingbox.originx, boundingbox.originy);
                    this.stroke("selection");

                    //now draw the dotted white line on top:
                    this.contextSelection.setLineDash([9]);
                    this.contextSelection.strokeStyle = "white";
                    this.contextSelection.beginPath();
                    this.contextSelection.moveTo(boundingbox.originx, boundingbox.originy); //start at topleft
                    this.contextSelection.lineTo(boundingbox.maxX, boundingbox.originy);
                    this.contextSelection.lineTo(boundingbox.maxX, boundingbox.maxY);
                    this.contextSelection.lineTo(boundingbox.originx, boundingbox.maxY);
                    this.contextSelection.lineTo(boundingbox.originx, boundingbox.originy);
                    this.stroke("selection");
                    this.contextSelection.strokeStyle = "black";
                    this.contextSelection.closePath();
                    this.selectionManager.multifresh = true;

                    this.contextSelection.fillStyle = "white"
                    this.contextSelection.strokeStyle = "black";

                    this.contextSelection.setLineDash([0]);

                    this.contextSelection.fillRect(boundingbox.originx - 5, boundingbox.originy - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);
                    this.contextSelection.strokeRect(boundingbox.originx - 5, boundingbox.originy - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);

                    this.contextSelection.fillRect(boundingbox.maxX - 5, boundingbox.originy - 5, 10, 10);
                    this.contextSelection.strokeRect(boundingbox.maxX - 5, boundingbox.originy - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);

                    this.contextSelection.fillRect(boundingbox.maxX - 5, boundingbox.maxY - 5, 10, 10);
                    this.contextSelection.strokeRect(boundingbox.maxX - 5, boundingbox.maxY - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);

                    this.contextSelection.fillRect(boundingbox.originx - 5, boundingbox.maxY - 5, 10, 10);
                    this.contextSelection.strokeRect(boundingbox.originx - 5, boundingbox.maxY - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);


                    //now check if interacting and render the move preview etc:

                    /////////////////////////////////////////////////////////////

                    if (this.pen.onCanvas && this.pen.penDown) {
                        if (this.cursor.interacting) {
                            //now render move or resize previews
                            if (this.toolbox.selectedtool == "SELECT") {

                                let vector = this.getCurrentStrokeVector();
                                if (this.cursor.selectmodifier == "MOVE") {

                                    //calc and affect move vector to selected object points


                                    console.log("currently multi selected");
                                    this.selectionManager.currentlySelectedMulti.forEach(s => {
                                        let tempstroke = new Stemstroke();

                                        s.points.forEach(p => {
                                            tempstroke.points.push(new Stempoint(p.x + vector.x, p.y + vector.y));
                                        });

                                        ////////////////////////////////////////////////////
                                        if (s.objecttype == "DRAW") {
                                            this.contextSelection.beginPath();
                                            this.contextSelection.moveTo(tempstroke.points[0].x, tempstroke.points[0].y);
                                            tempstroke.points.forEach(p => {
                                                this.contextSelection.lineTo(p.x, p.y);
                                            });
                                            //this.contextSelection.stroke();
                                            this.stroke("selection");
                                            //this.contextSelection.closePath();
                                        }
                                        else if (s.objecttype == "LINE") {
                                            this.contextSelection.beginPath();
                                            this.contextSelection.moveTo(tempstroke.points[0].x, tempstroke.points[0].y);
                                            this.contextSelection.lineTo(tempstroke.points[tempstroke.points.length - 1].x, tempstroke.points[tempstroke.points.length - 1].y);
                                            //this.contextSelection.stroke();
                                            this.stroke("selection");
                                            //this.contextSelection.closePath();
                                        }
                                        else if (s.objecttype == "RECTANGLE") {

                                            tempstroke.objecttype = "RECTANGLE";
                                            tempstroke.UpdateBoundingBox("");
                                            let previewbox = tempstroke.getCachedBoundingBox();

                                            this.contextSelection.beginPath();
                                            this.contextSelection.moveTo(previewbox.originx, previewbox.originy);
                                            this.contextSelection.lineTo(previewbox.maxX, previewbox.originy);
                                            this.contextSelection.lineTo(previewbox.maxX, previewbox.maxY);
                                            this.contextSelection.lineTo(previewbox.originx, previewbox.maxY);
                                            this.contextSelection.lineTo(previewbox.originx, previewbox.originy);
                                            this.contextSelection.stroke();
                                            this.contextSelection.closePath();

                                        }
                                        else if (s.objecttype == "CIRCLE") {
                                            tempstroke.objecttype = "CIRCLE";
                                            tempstroke.UpdateBoundingBox("");
                                            let previewbox = tempstroke.getCachedBoundingBox();
                                            this.contextSelection.beginPath();

                                            //

                                            let radius = tempstroke.getPixelLength();
                                            let midx = (previewbox.maxX + previewbox.originx) / 2;
                                            let midy = (previewbox.maxY + previewbox.originy) / 2;


                                            this.contextSelection.arc(midx, midy, radius, 0, 3.16 * 2);
                                            //this.contextSelection.stroke();
                                            this.stroke("selection");
                                            //this.contextSelection.closePath();
                                            //
                                        }

                                        ////////////////////////////////////////////////////


                                    });
                                }
                                else if (this.cursor.selectmodifier.length == 2) {
                                    //now for the last part, if its a resize stroke, do that business
                                    let bounds = this.selectionManager.getGroupBoundingBox();
                                    let resizepreview = this.resizeMulti(this.selectionManager.currentlySelectedMulti, bounds, vector, this.cursor.selectmodifier);

                                    resizepreview.forEach(s => {
                                        let selectedtype = s.objecttype
                                        
                                         if (selectedtype == "DRAW") {
                                            
                                             this.contextSelection.beginPath();
                                            // this.contextSelection.moveTo(s.points[0].x, s.points[0].y);
                                                s.points.forEach(p => {
                                                    this.contextSelection.lineTo(p.x, p.y);
                                                });
                                                this.stroke("selection");
                                            
                                         }
                                         else if (selectedtype == "CIRCLE") {
                                               
                                                s.UpdateBoundingBox("");
                                                let previewbox = s.getCachedBoundingBox();
        
                                                this.contextSelection.beginPath();
        
        
                                                let radius = s.getPixelLength();
                                                let midx = (previewbox.maxX + previewbox.originx) / 2;
                                                let midy = (previewbox.maxY + previewbox.originy) / 2;
                                                this.contextSelection.arc(midx, midy, radius, 0, 3.16 * 2);
                                                this.stroke("selection");
                                            
        
                                        }
                                        else if (selectedtype == "LINE") {
                                            
        
                                                let first = s.points[0];
                                                let last = s.points[s.points.length - 1];
        
                                                this.contextSelection.beginPath();
                                                this.contextSelection.moveTo(first.x, first.y);
                                                this.contextSelection.lineTo(last.x, last.y)
                                                this.stroke("selection");
                                            
        
                                        }
                                        else if (selectedtype == "RECTANGLE") {
        
        
                                                s.UpdateBoundingBox("");
                                                let first = s.points[0];
                                                let last = s.points[s.points.length - 1];
        
                                                this.contextSelection.beginPath();
                                                this.contextSelection.moveTo(first.x, first.y);
                                                this.contextSelection.lineTo(last.x, first.y);
                                                this.contextSelection.lineTo(last.x, last.y);
                                                this.contextSelection.lineTo(first.x, last.y);
                                                this.contextSelection.lineTo(first.x, first.y);
                                                this.stroke("selection");
                                                
                                            
                                        }
                                         

                                    });

                                }
                            }
                        }
                    }

                    //////////////////////////////////////////////////////////////
                }
            }
        }
    }
    drawCurrentStroke() {
        //draw only the buffer, as the last part will still be on the canvas
        ///////////////
        // this.ccontext.moveTo(this.currentStrokeData.points[0].x, this.currentStrokeData.points[0].y);

        //render current stroke:
        //if the pen is down, only add the next part of the stroke, dont render the whole thing.
        //once the user pens off, the stroke gets burnt into the canvas

        if (this.currentstrokebuffer.points != null && this.currentstrokebuffer.points.length > 1) {
            this.contextDrawing.beginPath();
            if (this.currentstroke.points.length > 0) {
                this.contextDrawing.moveTo(this.currentstroke.points[this.currentstroke.points.length - 1].x, this.currentstroke.points[this.currentstroke.points.length - 1].y);

            }
            for (let i = 0; i < this.currentstrokebuffer.points.length; i++) {
                this.contextDrawing.lineTo(this.currentstrokebuffer.points[i].x, this.currentstrokebuffer.points[i].y);
                this.currentstroke.points.push(this.currentstrokebuffer.points[i]);
            }

            this.contextDrawing.stroke(); //this one buffers so not a good idea to pass this one off to manager
            //now dump the buffer
            this.currentstrokebuffer.points = [];
        }
        this.contextDrawing.closePath();


        ///////////////
    }
    drawCurrentLine() {
        // uses the context layer to preview
        if (this.currentstroke.points.length > 1) {
            if (!this.cursor.interacting) {
                this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
                this.contextInterface.beginPath();
                this.contextInterface.moveTo(this.currentstroke.points[0].x, this.currentstroke.points[0].y);
                this.contextInterface.lineTo(this.currentstroke.points[this.currentstroke.points.length - 1].x, this.currentstroke.points[this.currentstroke.points.length - 1].y)
                this.contextInterface.stroke();
                this.contextInterface.closePath();
            }

        }
    }
    drawCurrentRectangle() {
        // uses the context layer to preview
        if (this.currentstroke.points.length > 1) {
            this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            this.contextInterface.beginPath();

            this.currentstroke.UpdateBoundingBox("");
            let box = this.currentstroke.getCachedBoundingBox();

            this.contextInterface.moveTo(box.originx, box.originy);
            this.contextInterface.lineTo(box.maxX, box.originy);
            this.contextInterface.lineTo(box.maxX, box.maxY);
            this.contextInterface.lineTo(box.originx, box.maxY);
            this.contextInterface.lineTo(box.originx, box.originy);
            this.contextInterface.stroke();
            this.contextInterface.closePath();
        }
    }
    drawCurrentCircle() {

        if (this.currentstroke.points.length > 1) {
            this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            this.contextInterface.beginPath();
            this.currentstroke.UpdateBoundingBox("");
            let box = this.currentstroke.getCachedBoundingBox();

            let radius = this.currentstroke.getPixelLength();
            let midx = (box.maxX + box.originx) / 2;
            let midy = (box.maxY + box.originy) / 2;


            this.contextInterface.arc(midx, midy, radius, 0, 3.16 * 2);
            this.contextInterface.stroke();
            this.contextInterface.closePath();
        }

    }
    drawContextMenu() {

        if (this.selectionManager.currentlySelected != null) {
            let box = this.selectionManager.currentlySelected.cachedBoundingBox;
            this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            this.contextInterface.drawImage(this.menuImage, ((box.originx + box.maxX) / 2) - (Canvasconstants.cursorsize / 2), box.originy - Canvasconstants.cursorsize, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
            if (this.selectionManager.showFullContextMenu == true) {
                this.drawFullContextMenu();
            }
            else {
                this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            }

        }
        else {
            if (this.selectionManager.contextfresh == false) {
                this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
                this.selectionManager.contextfresh = true;
            }
        }

    }
    drawFullContextMenu() {

    }
    //when the user drag selects (live while selecting)
    renderSelectionMarquee() {
        let first = this.currentstroke.points[0];
        let last = this.currentstroke.points[this.currentstroke.points.length - 1];


        this.contextCursor.setLineDash([9]);
        this.contextCursor.strokeStyle = "black";
        this.contextCursor.beginPath();
        this.contextCursor.moveTo(first.x, first.y); //start at topleft
        this.contextCursor.lineTo(last.x, first.y);
        this.contextCursor.lineTo(last.x, last.y);
        this.contextCursor.lineTo(first.x, last.y);
        this.contextCursor.lineTo(first.x, first.y);
        this.contextCursor.stroke();
        this.contextCursor.closePath();

    }


    //canvas interaction events
    PointerEnterEvent(e: PointerEvent) {        
        e.preventDefault();
        this.pen.onCanvas = true;
        
        // this.pen.X = e.pageX - this.drawingcanvas.offsetLeft + scrollX
        // this.pen.pressure = e.pressure;

        // this.pendetails.X = e.pageX - this.canvas.offsetLeft + this.pendetails.scrollx;
        // this.pendetails.Y = e.pageY - this.canvas.offsetTop + this.pendetails.scrolly;
        // this.pendetails.pressure = e.pressure;
        // this.cursonOnCanvas = true;

        //todo handle clickdragging off the canvas and then returning in an unclicking state        
    }
    PointerMoveEvent(e: PointerEvent) {

        e.preventDefault();
        this.pen.X = e.pageX - (this.canvascontainer.offsetLeft) + this.canvasscrollx;
        this.pen.Y = e.pageY - (this.canvascontainer.offsetTop) + this.canvascrolly;
        this.pen.pressure = e.pressure;

        if (this.touchcount == 2) {
            this.touchscrolltracker.points.push(new Stempoint(this.pen.X, this.pen.Y));

            let movement = new Vector(
                this.touchscrolltracker.points[this.touchscrolltracker.points.length - 1].x - this.touchscrolltracker.points[0].x,
                this.touchscrolltracker.points[this.touchscrolltracker.points.length - 1].y - this.touchscrolltracker.points[0].y
            );

            if (Math.abs(movement.x) > 5) {
                this.canvascontainer.scrollLeft += (movement.x * -0.05);
            }
            if (Math.abs(movement.y) > 5) {
                this.canvascontainer.scrollTop += (movement.y * -0.05);

            }

            // this.canvascontainer.scrollLeft += movement.x;
            // this.canvascontainer.scrollTop += movement.y;

        }


        //this.selectionManager.debugCanvasPoint(this.pen.X,this.pen.Y);

        if (this.selectionManager.currentlySelected != null) //item is currently selected
        {
            if (this.pen.penDown) { //pen is down               

                //draw points are buffered into stroke to improve perf
                let p = new Stempoint(this.pen.X, this.pen.Y);
                p.timestamp = performance.now();
                p.press = this.pen.pressure;
                this.currentstrokebuffer.points.push(p); //strokes get pushed into buffer, and popped as they are rendered 

                if (this.cursor.interacting) {
                    this.currentstroke.points.push(p);
                }


            }
            else {
                //check if cursor is intersecting any selected objects
                this.selectionManager.currentlySelected.UpdateBoundingBox("");
                let box = this.selectionManager.currentlySelected.getCachedBoundingBox();
                if (box.Intersects(this.pen.X, this.pen.Y)) {
                    //now check if its in one of the corners
                    this.cursor.selectmodifier = box.IntersectsCorner(this.pen.X, this.pen.Y);
                }
                else {
                    this.cursor.selectmodifier = "";
                }

                //now check if the box intersects the context menu (need to think about how it will stop the selection process if touch)

                let contextmenubox = new StemstrokeBox();

                contextmenubox.originx = ((box.originx + box.maxX) / 2) - (Canvasconstants.cursorsize / 2);
                contextmenubox.maxX = contextmenubox.originx + Canvasconstants.cursorsize;
                contextmenubox.originy = box.originy - Canvasconstants.cursorsize;
                contextmenubox.maxY = contextmenubox.originy + Canvasconstants.cursorsize;


                if (contextmenubox.Intersects(this.pen.X, this.pen.Y, 0)) {
                    //this.selectionManager.debugCanvasRectangle(contextmenubox.originx, contextmenubox.originy, contextmenubox.maxX, contextmenubox.maxY);
                }

            }
        }
        else if (this.selectionManager.currentlySelectedMulti != null) {
            if (this.pen.penDown) {
                let p = new Stempoint(this.pen.X, this.pen.Y);
                p.timestamp = performance.now();
                p.press = this.pen.pressure;
                this.currentstrokebuffer.points.push(p); //strokes get pushed into buffer, and popped as they are rendered 

                if (this.cursor.interacting) {
                    this.currentstroke.points.push(p);
                }
            }
            else {

                //check if cursor is intersecting any selected objects
                console.log("checking group selection modifier");
                let box = this.selectionManager.getGroupBoundingBox();
                if (box.Intersects(this.pen.X, this.pen.Y)) {
                    //now check if its in one of the corners
                    this.cursor.selectmodifier = box.IntersectsCorner(this.pen.X, this.pen.Y);
                }
                else {
                    this.cursor.selectmodifier = "";
                }

                //now check if the box intersects the context menu (need to think about how it will stop the selection process if touch)

                let contextmenubox = new StemstrokeBox();

                contextmenubox.originx = ((box.originx + box.maxX) / 2) - (Canvasconstants.cursorsize / 2);
                contextmenubox.maxX = contextmenubox.originx + Canvasconstants.cursorsize;
                contextmenubox.originy = box.originy - Canvasconstants.cursorsize;
                contextmenubox.maxY = contextmenubox.originy + Canvasconstants.cursorsize;


                if (contextmenubox.Intersects(this.pen.X, this.pen.Y, 0)) {

                }

            }
        }
        else {
            if (this.pen.penDown) {
                let p = new Stempoint(this.pen.X, this.pen.Y);
                p.timestamp = performance.now();
                p.press = this.pen.pressure;
                this.currentstrokebuffer.points.push(p); //strokes get pushed into buffer, and popped as they are rendered 

                if (this.toolbox.selectedtool == "SELECT") {
                    this.currentstroke.points.push(p);
                }
                if (this.toolbox.selectedtool == "ERASE") {
                    this.currentstroke.points.push(p);
                }
                if (this.toolbox.selectedtool == "LINE") {
                    this.currentstroke.points.push(p);

                }
                if (this.toolbox.selectedtool == "RECTANGLE") {
                    this.currentstroke.points.push(p);

                }
                if (this.toolbox.selectedtool == "CIRCLE") {
                    this.currentstroke.points.push(p);
                }



            }
        }

        //now we need to check for scribble erase

        if (this.toolbox.selectedtool == "ERASE") {
            if (this.pen.penDown) {
                let erasestrokelength = this.currentstroke.getPixelLength();
                // if (erasestrokelength > Canvasconstants.multiselectMinimumLength) {
                //     let strokestodelete: Array<number>;
                //     let strokeindex = 0;
                //     this.drawingdata.forEach(s => {
                //         s.UpdateBoundingBox("");
                //         let box = s.getCachedBoundingBox();
                //         let lastpointinstroke = this.currentstroke.points[this.currentstroke.points.length - 1];
                //         if (box.Intersects(lastpointinstroke.x, lastpointinstroke.y)) {
                //             console.log("intersecting with a stroke");
                //             s.points.forEach(p => {
                //                 if (this.selectionManager.getDistanceBetweenTwoPoints(new Vector(p.x, p.y), new Vector(lastpointinstroke.x, lastpointinstroke.y)) > Canvasconstants.multiselectMinimumLength) {

                //                     //so the stroke is close enough to the erase stroke, lets move it into the undo stack
                //                     this.undoActions.push(new UndoEraseAction(this.drawingdata[strokeindex]));
                //                     this.redoActions = [];
                //                     this.drawingdata.splice(strokeindex, 1); //remove the entry from the array
                //                     this.updateDrawing();
                //                 }
                //             });
                //         }
                //         strokeindex++;
                //     });
                // }
            }

        }




        // //now check if the cursor is over a selection-hover-point
        // if (this.selectedDrawnObject != null) {
        //     if (this.pendetails.penDown) {
        //         return;
        //     }
        //     let box = this.selectedDrawnObject.getCachedBoundingBox();

        //     //check if pen is near the selected object:

        //     //it does, so now check if the cursor is actuall on top of one of the interaction elements:
        //     //get center point of box:
        //     let centerx = (box.maxX + box.originx) / 2;
        //     let centery = (box.maxY + box.originy) / 2;

        //     if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, box.originx, box.originy, this.selectionHoverBoxSize)) {
        //         this.hoveredSelectionPoint = "NW";
        //     }
        //     else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, box.maxX, box.originy, this.selectionHoverBoxSize)) {
        //         this.hoveredSelectionPoint = "NE"; //not near any selection points
        //     }
        //     else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, box.maxX, box.maxY, this.selectionHoverBoxSize)) {
        //         this.hoveredSelectionPoint = "SE"; //not near any selection points
        //     }
        //     else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, box.originx, box.maxY, this.selectionHoverBoxSize)) {
        //         this.hoveredSelectionPoint = "SW";
        //     }
        //     else if (box.DoesIntersect(this.pendetails.X, this.pendetails.Y)) {
        //         this.hoveredSelectionPoint = "C";
        //     }
        //     else {
        //         this.hoveredSelectionPoint = "";
        //     }

        //     if (this.selectedDrawnObject.objecttype == "CIRCLE") {
        //         let lastpoint = this.selectedDrawnObject.points[this.selectedDrawnObject.points.length - 1];
        //         if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, lastpoint.x, lastpoint.y, 16)) {
        //             this.hoveredSelectionPoint = "P"; //not near any selection points                        
        //         }
        //         else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, centerx, centery, this.selectionHoverBoxSize)) {
        //             this.hoveredSelectionPoint = "C";
        //         }
        //         else { this.hoveredSelectionPoint = ""; }

        //     }

        //     if (this.ismovingobject) {
        //         let endpoint = new Stempoint(this.pendetails.X, this.pendetails.Y);
        //         this.currentMove.endPoint = endpoint;
        //     }
        //     if (this.isresizingobject) {
        //         let endpoint = new Stempoint(this.pendetails.X, this.pendetails.Y);
        //         this.currentResize.endPoint = endpoint;
        //     }
        // }
        // if (this.selectedMultiDrawnObjects != null) {

        //     if (this.selectedMultiDrawnObjects.doesIntersect(this.pendetails.X, this.pendetails.Y)) {
        //         this.hoveredSelectionPoint = "C";
        //     }
        //     else {
        //         this.hoveredSelectionPoint = "";
        //     }
        //     if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, this.selectedMultiDrawnObjects.minx, this.selectedMultiDrawnObjects.miny, this.selectionHoverBoxSize)) {
        //         this.hoveredSelectionPoint = "NW";
        //     }
        //     else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, this.selectedMultiDrawnObjects.maxx, this.selectedMultiDrawnObjects.miny, this.selectionHoverBoxSize)) {
        //         this.hoveredSelectionPoint = "NE"; //not near any selection points
        //     }
        //     else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, this.selectedMultiDrawnObjects.maxx, this.selectedMultiDrawnObjects.maxy, this.selectionHoverBoxSize)) {
        //         this.hoveredSelectionPoint = "SE"; //not near any selection points
        //     }
        //     else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, this.selectedMultiDrawnObjects.minx, this.selectedMultiDrawnObjects.maxy, this.selectionHoverBoxSize)) {
        //         this.hoveredSelectionPoint = "SW"; //not near any selection points
        //     }
        // }
    }
    PointerUpEvent(e: PointerEvent) {

        console.log("up");
        console.log(this.toolbox.selectedtool);
        e.preventDefault();

        if (e.pointerType == "touch" || e.pointerType == "pen") {
            this.touchcount--;
            this.debugtext(this.touchcount);
        }
        this.pen.penDown = false;

        if (this.toolbox.selectedtool == "DRAW") {
            this.currentstroke.UpdateBoundingBox("PointerUpEvent 'DRAW'");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            this.drawingdata.push(this.currentstroke);
            let action = new UndoAction(UndoActionTypes.newdraw);
            action.setNewDrawnObject(this.currentstroke,this.toolbox.selectedtool);                  
            this.undoredo.save(action);            
        }
        else if (this.toolbox.selectedtool == "SELECT") {

            console.log("selecting");
            //check if there is already a selected object
            if (this.selectionManager.currentlySelected != null) {

                if (this.cursor.interacting) {
                    if (this.cursor.selectmodifier == "MOVE") {
                        if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {

                            //get movement vector:
                            let x = this.currentstroke.points[this.currentstroke.points.length - 1].x - this.currentstroke.points[0].x;
                            let y = this.currentstroke.points[this.currentstroke.points.length - 1].y - this.currentstroke.points[0].y;

                            this.currentstroke.UpdateBoundingBox("");

                            //move all points in stroke:
                            this.selectionManager.currentlySelected.points.forEach(p => {
                                p.x += x;
                                p.y += y;
                            });

                            //let undomoveaction = new UndoMoveAction(new Vector(x, y), this.selectionManager.currentSelectionID + "");
                            let undomoveaction = new UndoAction(UndoActionTypes.movesingle)
                            undomoveaction.setMoveSingle(this.selectionManager.currentlySelected,new Vector(x,y));                            
                            this.undoredo.save(undomoveaction);                            
                          
                            this.selectionManager.currentlySelected.UpdateBoundingBox("");
                            this.selectionManager.fresh = false;
                            this.updateDrawing();
                        }
                        else {
                            this.selectionManager.selectObjectAtPoint(this.pen.X, this.pen.Y);
                        }

                    }
                    else {

                        //modifiers with 2 characters are for resize. this is the resize functionality
                        if (this.cursor.selectmodifier.length == 2) {

                        }
                        let resizevector = this.getCurrentStrokeVector();
                        let previewstroke = new Stemstroke();

                        previewstroke = this.resizeStroke(this.selectionManager.currentlySelected, resizevector, this.cursor.selectmodifier);

                        for (let i = 0; i < this.selectionManager.currentlySelected.points.length; i++) {
                            this.selectionManager.currentlySelected.points[i].x = previewstroke.points[i].x;
                            this.selectionManager.currentlySelected.points[i].y = previewstroke.points[i].y;
                        }
                        //stupid hack coz data type is String not string
                        // let resizeundo = new UndoResizeAction(resizevector, this.selectionManager.currentSelectionID + "", this.cursor.selectmodifier);
                        // this.undoActions.push(resizeundo);
                        // this.redoActions = [];
                        this.selectionManager.currentlySelected.UpdateBoundingBox("");
                        this.selectionManager.fresh = false;
                        this.updateDrawing();


                        ///////////////


                    }
                }
                //cursor isnt interacting so we need are doing a normal selection
                else {
                    if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {

                        this.currentstroke.UpdateBoundingBox("");
                        let box = this.currentstroke.getCachedBoundingBox();
                        console.log(this.currentstroke);
                        console.log(box);
                        this.selectionManager.selectInsideBox(box);
                    }
                    else {
                        this.selectionManager.selectObjectAtPoint(this.pen.X, this.pen.Y);

                    }
                }

            }
            else if (this.selectionManager.currentlySelectedMulti != null) {
                //first check if its a drag stroke (T)D)

                if (this.cursor.interacting) {
                    //get move/resize vector
                    let vector = this.getCurrentStrokeVector();

                    if (this.cursor.selectmodifier == "MOVE") {

                        let multimoveaction = new UndoAction(UndoActionTypes.movemulti);
                        multimoveaction.setMoveMulti(this.selectionManager.currentlySelectedMulti,vector);
                        this.undoredo.save(multimoveaction);
                        //move all the objects in that are currently selected
                        this.selectionManager.currentlySelectedMulti.forEach(s => {
                            s.points.forEach(p => {
                                p.x += vector.x;
                                p.y += vector.y;
                            });
                        });
                        this.updateDrawing();
                    }
                    else {
                        if (this.cursor.selectmodifier.length == 2) {
                            let bounds = this.selectionManager.getGroupBoundingBox();
                            let resizepreview = this.resizeMulti(this.selectionManager.currentlySelectedMulti, bounds, vector, this.cursor.selectmodifier);

                            for(let i = 0; i < resizepreview.length; i++)
                            {         
                                let strokeobj = this.selectionManager.currentlySelectedMulti[i];
                                let changedstroke = resizepreview[i];

                                for(let y= 0; y < changedstroke.points.length; y++)
                                {
                                    strokeobj.points[y].x = changedstroke.points[y].x;
                                    strokeobj.points[y].y = changedstroke.points[y].y;
                                }                           

                            }

                            this.updateDrawing();

                            
                               


                            
                            this.updateDrawing();

                        }
                    }
                }
                else {
                    this.selectionManager.selectObjectAtPoint(this.pen.X, this.pen.Y);
                }
            }

            if (this.selectionManager.currentlySelected == null && this.selectionManager.currentlySelectedMulti == null) {
                if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {
                    this.currentstroke.UpdateBoundingBox("");
                    let selectionbox: StemstrokeBox = new StemstrokeBox();

                    let firstpoint = this.currentstroke.getFirstPoint();
                    let lastpoint = this.currentstroke.getLastPoint();

                    selectionbox.originx = Math.min(firstpoint.x, lastpoint.x);
                    selectionbox.originy = Math.min(firstpoint.y, lastpoint.y);
                    selectionbox.maxX = Math.max(firstpoint.x, lastpoint.x);
                    selectionbox.maxY = Math.max(firstpoint.y, lastpoint.y);

                    this.selectionManager.selectInsideBox(selectionbox);
                }
                else {
                    console.log("selecting object at point");
                    this.selectionManager.selectObjectAtPoint(this.pen.X, this.pen.Y);
                }
            }



            this.currentstroke = null;
        }
        else if (this.toolbox.selectedtool == "ERASE") {
            //is the stroke a line or a point
            if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {
                //see move event (coz it strokes will be erased 'live' while the user is interacting)
            }
            else {
                //point
                let underpointerid = this.selectionManager.IDObjectAtPoint(this.currentstroke.points[this.currentstroke.points.length - 1].x, this.currentstroke.points[this.currentstroke.points.length - 1].y);
                //
                let indexunderpointer = this.selectionManager.indexAtID(underpointerid);
                if (indexunderpointer == null) {
                    return;
                }
                // this.undoActions.push(new UndoEraseAction(this.drawingdata[indexunderpointer]));
                // this.redoActions = [];
                this.drawingdata.splice(indexunderpointer, 1); //remove the entry from the array
                this.updateDrawing();

            }
        }
        else if (this.toolbox.selectedtool == "LINE") {
            this.currentstroke.UpdateBoundingBox("");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            this.drawingdata.push(this.currentstroke);
            let undo = new UndoAction(UndoActionTypes.newdraw);
            undo.stroke = this.currentstroke;
            undo.drawtype = this.toolbox.selectedtool;        
            this.undoredo.save(undo);
            this.updateDrawing();
            this.currentstroke = null;


        }
        else if (this.toolbox.selectedtool == "RECTANGLE") {
            this.currentstroke.UpdateBoundingBox("");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            this.drawingdata.push(this.currentstroke);
            let undo = new UndoAction(UndoActionTypes.newdraw);
            undo.stroke = this.currentstroke;
            undo.drawtype = this.toolbox.selectedtool;        
            this.undoredo.save(undo);
            this.updateDrawing();
            this.currentstroke = null;
        }
        else if (this.toolbox.selectedtool == "CIRCLE") {
            this.currentstroke.UpdateBoundingBox("");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            this.drawingdata.push(this.currentstroke);
            let undo = new UndoAction(UndoActionTypes.newdraw);
            undo.stroke = this.currentstroke;
            undo.drawtype = this.toolbox.selectedtool;        
            this.undoredo.save(undo);
            this.updateDrawing();
            this.currentstroke = null;
        }
        this.currentstroke = null;
        this.cursor.interacting = false;
        this.toolbox.isDrawingObject = false;
        this.cursor.selectmodifier = "";

    }
    PointerDownEvent(e: PointerEvent) {

        e.preventDefault();
        this.pen.X = e.pageX - (this.canvascontainer.offsetLeft) + this.canvasscrollx;
        this.pen.Y = e.pageY - (this.canvascontainer.offsetTop) + this.canvascrolly;



        console.log(e.pointerType);
        if (e.pointerType == "touch" || e.pointerType == "pen") {


            this.touchcount++;
            this.debugtext(this.touchcount);
            //set position of cursor right now, (also need to check for interaction points)
            this.pen.X = e.pageX - (this.canvascontainer.offsetLeft) + this.canvasscrollx;
            this.pen.Y = e.pageY - (this.canvascontainer.offsetTop) + this.canvascrolly;

            if (this.touchcount > 1) {
                this.pen.penDown = false;
                this.currentstroke = null;
                this.updateDrawing();
                this.touchscrolltracker = new Stemstroke();

                this.touchscrolltracker.points.push(new Stempoint(this.pen.X, this.pen.Y));
                return;

                //now we need to start moving the scrollbars around
            }
            else {

                if (this.toolbox.selectedtool == "SELECT") {
                    console.log("checking for intersects from touch");
                    //now need to check if intersecting with any objects

                    if (this.selectionManager.currentlySelected != null) {
                        //checking if intersecting single selected item
                        console.log("single check intersect")
                        this.selectionManager.currentlySelected.UpdateBoundingBox("");
                        let box = this.selectionManager.currentlySelected.getCachedBoundingBox();
                        if (box.Intersects(this.pen.X, this.pen.Y)) {
                            //now check if its in one of the corners
                            this.cursor.selectmodifier = box.IntersectsCorner(this.pen.X, this.pen.Y);
                        }
                    }
                    //we need to do both checks so no else here please :D
                    else if (this.selectionManager.currentlySelectedMulti != null) {
                        //checking if intersecting a group selection
                        console.log("group check intersect")

                        let box = this.selectionManager.getGroupBoundingBox();
                        if (box.Intersects(this.pen.X, this.pen.Y)) {
                            //now check if its in one of the corners
                            this.cursor.selectmodifier = box.IntersectsCorner(this.pen.X, this.pen.Y);
                        }
                        else {
                            this.cursor.selectmodifier = "";
                        }
                    }
                    //now if anything is selected, we check if they are 'deselecting' by tapping off the object


                }


            }
        }

        this.pen.penDown = true;
        if (this.cursor.selectmodifier != "") {
            this.cursor.interacting = true;
        }

        this.contextDrawing.lineCap = "round";
        this.contextDrawing.lineJoin = "round";
        this.contextDrawing.lineWidth = this.toolbox.selectedDrawSize;
        this.contextDrawing.strokeStyle = this.toolbox.selectedColour;

        //setup cursor context too
        this.contextInterface.lineCap = "round";
        this.contextInterface.lineJoin = "round";
        this.contextInterface.lineWidth = this.toolbox.selectedDrawSize;
        this.contextInterface.strokeStyle = this.toolbox.selectedColour;

        let currentpoint = new Stempoint(this.pen.X, this.pen.Y);
        currentpoint.press = this.pen.pressure;

        if (this.toolbox.selectedtool == "DRAW") {
            this.toolbox.isDrawingObject = true;
            this.currentstroke = new Stemstroke();
            this.currentstrokebuffer = new Stemstroke();
            this.currentstroke.objecttype = this.toolbox.selectedtool;
            this.currentstrokebuffer.points.push(currentpoint);

        }
        else if (this.toolbox.selectedtool == "SELECT") {
            this.toolbox.isDrawingObject = false;
            this.currentstroke = new Stemstroke();
            this.currentstrokebuffer = new Stemstroke();
            this.currentstroke.objecttype = this.toolbox.selectedtool;
            this.currentstroke.points.push(currentpoint); //select doesnt use buffer
        }
        else if (this.toolbox.selectedtool == "ERASE") {
            this.toolbox.isDrawingObject = false;
            this.currentstroke = new Stemstroke();
            this.currentstrokebuffer = new Stemstroke();
            this.currentstroke.objecttype = this.toolbox.selectedtool;
            this.currentstroke.points.push(currentpoint); //select doesnt use buffer
        }
        else if (this.toolbox.selectedtool == "LINE") {
            this.toolbox.isDrawingObject = true;
            this.currentstroke = new Stemstroke();
            this.currentstrokebuffer = new Stemstroke();
            this.currentstroke.objecttype = this.toolbox.selectedtool;
            this.currentstroke.points.push(currentpoint);
        }
        else if (this.toolbox.selectedtool == "RECTANGLE") {
            this.toolbox.isDrawingObject = true;
            this.currentstroke = new Stemstroke();
            this.currentstrokebuffer = new Stemstroke();
            this.currentstroke.objecttype = this.toolbox.selectedtool;
            this.currentstroke.points.push(currentpoint);
        }
        else if (this.toolbox.selectedtool == "CIRCLE") {
            this.toolbox.isDrawingObject = true;
            this.currentstroke = new Stemstroke();
            this.currentstrokebuffer = new Stemstroke();
            this.currentstroke.objecttype = this.toolbox.selectedtool;
            this.currentstroke.points.push(currentpoint);
        }

    }
    PointerLeaveEvent(e: PointerEvent) {
        e.preventDefault();
        this.pen.onCanvas = false;
    }
    updateDrawing() {
        //clear drawingcanvas:
        
        this.contextDrawing.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
        this.selectionManager.fresh = false;
        if (this.drawingdata.length < 1) {
            return;
        }

        for (let i = 0; i < this.drawingdata.length - 1; i++) {
            if (this.drawingdata[i].points.length < 2) {
                this.drawingdata.splice(i, 1); //remove the entry from the array
            }
        }
        this.drawingdata.forEach(stroke => {
            if (stroke.objecttype == "DRAW") {
                this.contextDrawing.beginPath();
                this.contextDrawing.strokeStyle = stroke.strokecolour;
                this.contextDrawing.lineWidth = stroke.strokewidth;
                this.contextDrawing.moveTo(stroke.points[0].x, stroke.points[0].y);
                stroke.points.forEach(p => {
                    this.contextDrawing.lineTo(p.x, p.y)
                });
                this.contextDrawing.stroke();
                this.contextDrawing.closePath();
            }
            else if (stroke.objecttype == "LINE") {
                this.contextDrawing.beginPath();
                this.contextDrawing.strokeStyle = stroke.strokecolour;
                this.contextDrawing.lineWidth = stroke.strokewidth;
                this.contextDrawing.moveTo(stroke.points[0].x, stroke.points[0].y);
                let lastpoint = stroke.points.length - 1;
                this.contextDrawing.lineTo(stroke.points[lastpoint].x, stroke.points[lastpoint].y);
                this.contextDrawing.stroke();
                this.contextDrawing.closePath();
            }
            else if (stroke.objecttype == "RECTANGLE") {

                stroke.UpdateBoundingBox("");
                let box = stroke.getCachedBoundingBox();
                this.contextDrawing.beginPath();
                this.contextDrawing.strokeStyle = stroke.strokecolour;
                this.contextDrawing.lineWidth = stroke.strokewidth;

                this.contextDrawing.moveTo(box.originx, box.originy);
                this.contextDrawing.lineTo(box.maxX, box.originy);
                this.contextDrawing.lineTo(box.maxX, box.maxY);
                this.contextDrawing.lineTo(box.originx, box.maxY);
                this.contextDrawing.lineTo(box.originx, box.originy);

                this.contextDrawing.stroke();
                this.contextDrawing.closePath();
            }
            else if (stroke.objecttype == "CIRCLE") {

                stroke.UpdateBoundingBox("");

                let box = stroke.getCachedBoundingBox();
                this.contextDrawing.beginPath();
                this.contextDrawing.strokeStyle = stroke.strokecolour;
                this.contextDrawing.lineWidth = stroke.strokewidth;



                let radius = stroke.getPixelLength();
                let midx = (box.maxX + box.originx) / 2;
                let midy = (box.maxY + box.originy) / 2;


                this.contextDrawing.arc(midx, midy, radius, 0, 3.16 * 2);
                this.contextDrawing.stroke();
                this.contextDrawing.closePath();
            }

        });
    }
    getCurrentStrokeVector() {
        let output = new Vector(
            this.currentstroke.points[this.currentstroke.points.length - 1].x - this.currentstroke.points[0].x,
            this.currentstroke.points[this.currentstroke.points.length - 1].y - this.currentstroke.points[0].y
        );
        return output;
    }
    resizePoint(inputx, inputy, a, b, c, d) {
        // how to use: currentpoint.x - (strokebox.originx), currentpoint.y - (strokebox.originy), xfactor, 0, 0, yfactor, 0, 0
        // will resize based from origin

        let outputx = ((a * inputx) + (b * inputx));
        let outputy = ((c * inputy) + (d * inputy));

        return new Stempoint(outputx, outputy);
    }
    resizeStroke(inputstroke: Stemstroke, resizevector: Vector, modifier: string) {

        console.log(modifier);
        inputstroke.UpdateBoundingBox("");
        let strokebox = inputstroke.getCachedBoundingBox();

        //takes input stroke and return
        let outputstroke = new Stemstroke();


        if (modifier == "NW") {
            let resizefactor = new Vector(
                1 + ((resizevector.x / (strokebox.maxX - strokebox.originx)) * -1),
                1 + ((resizevector.y / (strokebox.maxY - strokebox.originy)) * -1));

            inputstroke.points.forEach(p => {
                let resizedpoint = this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor.x, 0, 0, resizefactor.y)
                resizedpoint.x += strokebox.originx + resizevector.x;
                resizedpoint.y += strokebox.originy + resizevector.y;
                outputstroke.points.push(resizedpoint);
            });
        }
        else if (modifier == "NE") {
            let resizefactor = new Vector(
                1 + (resizevector.x / (strokebox.maxX - strokebox.originx)),
                1 + ((resizevector.y / (strokebox.maxY - strokebox.originy)) * -1));

            inputstroke.points.forEach(p => {
                let resizedpoint = this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor.x, 0, 0, resizefactor.y)
                resizedpoint.x += strokebox.originx;
                resizedpoint.y += strokebox.originy + resizevector.y;
                outputstroke.points.push(resizedpoint);
            });
        }
        else if (modifier == "SE") {
            let resizefactor = new Vector(
                1 + (resizevector.x / (strokebox.maxX - strokebox.originx)),
                1 + (resizevector.y / (strokebox.maxY - strokebox.originy)));

            inputstroke.points.forEach(p => {
                let resizedpoint = this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor.x, 0, 0, resizefactor.y)
                resizedpoint.x += strokebox.originx;
                resizedpoint.y += strokebox.originy;
                outputstroke.points.push(resizedpoint);
            });
        }
        else if (modifier == "SW") {
            let resizefactor = new Vector(
                1 + ((resizevector.x / (strokebox.maxX - strokebox.originx)) * -1),
                1 + (resizevector.y / (strokebox.maxY - strokebox.originy)));

            inputstroke.points.forEach(p => {
                let resizedpoint = this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor.x, 0, 0, resizefactor.y)
                resizedpoint.x += strokebox.originx + resizevector.x;
                resizedpoint.y += strokebox.originy;
                outputstroke.points.push(resizedpoint);
            });
        }

        return outputstroke;
    }
    resizeMulti(inputstrokes: Stemstroke[], boundingbox: StemstrokeBox, resizevector: Vector, modifier: string) {

        let output: Stemstroke[] = new Array<Stemstroke>();
        inputstrokes.forEach(inputstroke => {
            let outputstroke = new Stemstroke();
            outputstroke.objecttype = inputstroke.objecttype;

            if (modifier == "NW") {
                let resizefactor = new Vector(
                    1 + ((resizevector.x / (boundingbox.maxX - boundingbox.originx)) * -1),
                    1 + ((resizevector.y / (boundingbox.maxY - boundingbox.originy)) * -1));

                inputstroke.points.forEach(p => {
                    let resizedpoint = this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor.x, 0, 0, resizefactor.y)
                    resizedpoint.x += boundingbox.originx + resizevector.x;
                    resizedpoint.y += boundingbox.originy + resizevector.y;
                    outputstroke.points.push(resizedpoint);
                });
            }
            else if (modifier == "NE") {
                let resizefactor = new Vector(
                    1 + (resizevector.x / (boundingbox.maxX - boundingbox.originx)),
                    1 + ((resizevector.y / (boundingbox.maxY - boundingbox.originy)) * -1));

                inputstroke.points.forEach(p => {
                    let resizedpoint = this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor.x, 0, 0, resizefactor.y)
                    resizedpoint.x += boundingbox.originx;
                    resizedpoint.y += boundingbox.originy + resizevector.y;
                    outputstroke.points.push(resizedpoint);
                });
            }
            else if (modifier == "SE") {
                let resizefactor = new Vector(
                    1 + (resizevector.x / (boundingbox.maxX - boundingbox.originx)),
                    1 + (resizevector.y / (boundingbox.maxY - boundingbox.originy)));

                inputstroke.points.forEach(p => {
                    let resizedpoint = this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor.x, 0, 0, resizefactor.y)
                    resizedpoint.x += boundingbox.originx;
                    resizedpoint.y += boundingbox.originy;
                    outputstroke.points.push(resizedpoint);
                });
            }
            else if (modifier == "SW") {
                let resizefactor = new Vector(
                    1 + ((resizevector.x / (boundingbox.maxX - boundingbox.originx)) * -1),
                    1 + (resizevector.y / (boundingbox.maxY - boundingbox.originy)));

                inputstroke.points.forEach(p => {
                    let resizedpoint = this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor.x, 0, 0, resizefactor.y)
                    resizedpoint.x += boundingbox.originx + resizevector.x;
                    resizedpoint.y += boundingbox.originy;
                    outputstroke.points.push(resizedpoint);
                });
            }
            output.push(outputstroke);
        });

        return output;


    }
    startTimer() {

        let timertext = document.getElementById("questiontimer") as HTMLHeadingElement;

        let startsynctime = performance.now();
        let startClockTime = new Date().getTime();

        this.starttimeclock = new Date().toLocaleString();
        this.starttimeperf = startsynctime.toString();

        let x = setInterval(function () {

            let currentTime = new Date().getTime();
            var distance = currentTime - startClockTime;
            var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);

            //timertext.innerText = `${hours}h  ${minutes}m  ${seconds}s`;
        }
            , 2000);


    }
    uploadData() {

        let participantDeviceTask = `${this.participant} - ${this.devicetype} - ${this.task}`;
        this.updateDrawing();

        // if (this.isios)


        // SAVE PNG IMAGE FILE (will download as unknown - needs to be sent via email or something)
        let image = this.drawingcanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");  //this is dirty, but it works for now                      
        //window.open(image);


        // SAVE THE SESSION INFO FILE
        let session = new Sessioninfo();
        session.start = this.starttimeclock
        session.end = new Date().toLocaleString();
        session.startperf = this.starttimeperf;
        session.devicetype = this.devicetype;
        session.task = this.task;
        session.participanttoken = this.participant;
        //let sessionoutputstring = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session));


        //////////////////// SAVE THE DRAWING DATA FILE
        let packageoutput = new FileOutputPackage(); //we package the session info in so we can buddy up the files later on (just in case right. coz all the files will be named unknown!)

        packageoutput.drawingdata = this.drawingdata;
        packageoutput.sessioninfo = session;
        packageoutput.imagefile = image;

        // let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(packageoutput));
        let dataStr = JSON.stringify(packageoutput);
        console.log(dataStr);
        //window.open(dataStr);

        // var anchor = document.createElement('a');
        // anchor.setAttribute("href", dataStr);
        // anchor.setAttribute("download", `${participantDeviceTask} - packagedSession.json`);
        // anchor.click();
        //create post request to send the data to the server:
        let xhr = new XMLHttpRequest();
        var url = "../upload.php";
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {

                if(xhr.responseText == "Success")
                {
                    //@ts-ignore 
                    M.toast({ html: 'Drawing submitted' });
                }
                console.log(xhr.responseText);
            }
        };

        xhr.send(dataStr);
        if (this.observation) {
            //for now, nothing happens window remains open

        }
        else {
            window.location.href = "index.html?q=nextquestion";
        }
        // console.log(xhr.response);


        // else {
        //     //build image into a json uri
        //     let image = this.drawingcanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        //     var anchor = document.createElement('a');
        //     anchor.setAttribute('download', `canvas - .png`);
        //     anchor.setAttribute('href', image);
        //     anchor.click();
        //     //Export JSON
        //     var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.drawingdata));
        //     anchor = document.createElement('a');
        //     anchor.setAttribute("href", dataStr);
        //     anchor.setAttribute("download", `${participantDeviceTask} - drawingdata.json`);
        //     anchor.click();
        //     //and session information
        //     let session = new Sessioninfo();
        //     session.start = this.starttimeclock
        //     session.end = new Date().toLocaleString();
        //     session.startperf = this.starttimeperf;
        //     session.devicetype = this.devicetype;
        //     session.task = this.task;
        //     session.participanttoken = this.participant;

        //     let sessionoutputstring = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session));
        //     anchor = document.createElement('a');
        //     anchor.setAttribute("href", sessionoutputstring);
        //     anchor.setAttribute("download", `${participantDeviceTask} - sessioninfo.json`);
        //     anchor.click();
        // }




    }
    NextAndUpload() {
        // let participantDeviceTask = `${this.participant} - ${this.devicetype} - ${this.task}`;



        let currentquestionarray = this.task.split('q');
        let currentquestion = parseInt(currentquestionarray[1]);
        let nextquestion = "q" + (currentquestion + 1) + ".html";
        //document.location.href = (nextquestion);
        window.open(nextquestion);


        this.uploadData()
    }
    debugtext(input: any) {
        this.debug.innerText = input;
    }    
    stroke(context: string) {

        if (context == "draw") {
            this.contextDrawing.stroke();
            this.contextDrawing.closePath();
        }
        else if (context == "selection") {
            this.contextSelection.stroke();
            this.contextSelection.closePath();
        }
        else if (context == "cursor") {
            this.contextCursor.stroke();
            this.contextCursor.closePath();
        }
        else if (context == "interface") {
            this.contextInterface.stroke();
            this.contextInterface.closePath();
        }
        else if (context == "debug") {
            this.contextDebug.stroke();
            this.contextDebug.closePath();
        }
    }    

}



class Vector {
    x: number;
    y: number;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
class UndoAction {
    actiontype: UndoActionTypes;    
    drawtype:string;  
    stroke:Stemstroke;
    multistrokes:Stemstroke[]
    vector:Vector;
    direction:string;
    previouscolour:string;
    newcolour:string;
    previouswidth:string;
    newwidth:string;
    

    constructor(actiontype: UndoActionTypes) {
        this.actiontype = actiontype; //only actiontype is required, all other parameters are filled post construction
                
    } 

    setNewDrawnObject(stroke:Stemstroke,type:string){
        this.stroke = stroke;
        this.drawtype = type;

    }
    setMoveSingle(stroke:Stemstroke,vector:Vector){
        this.stroke = stroke;
        this.vector = vector;
    }
    setMoveMulti(strokes:Stemstroke[],vector:Vector){
        this.multistrokes = strokes;
        this.vector = vector;
    }
    setResizeSingle(stroke:Stemstroke,vector:Vector,direction:string){

    }
    setResizeMulti(strokes:Stemstroke[], vector:Vector, direction:string){

    }
    setColourSingle(stroke:Stemstroke, previouscolour:string, newcolour:string){

    }
    setColourMulti(strokes:Stemstroke[], previouscolours:string[], newcolours:string[]){

    }
    setErase(stroke:Stemstroke){

    }
    setWidthSingle(stroke:Stemstroke, previouswidth:string, newwidth:string){

    }
    setWidthMulti(strokes:Stemstroke[], previouswidths:string[], newwidths:string[]){

    }
    

    


}
// class UndoMoveAction extends UndoAction {
//     vector: Vector;
//     id: string;
//     constructor(moveVector: Vector, strokeid: string) {
//         super("MOVE");
//         this.vector = moveVector;
//         this.id = strokeid;
//     }
// }
// class UndoResizeAction extends UndoAction {
//     vector: Vector;
//     id: string;
//     direction: string;

//     constructor(resizeVector: Vector, strokeid: string, direction: string) {
//         super("RESIZE");
//         this.vector = resizeVector;
//         this.id = strokeid;
//         this.direction = direction;
//     }
// }
// class UndoEraseAction extends UndoAction {
//     thestroke: Stemstroke;
//     constructor(strokeobject: Stemstroke) {
//         super("ERASE");
//         this.thestroke = strokeobject;
//     }
// }
// class UndoUndoObject extends UndoAction { 
//     thestroke: Stemstroke;
//     constructor(strokeobject: Stemstroke) {
//         super("UNDO");
//         this.thestroke = strokeobject;
//     }
// }
class StateManager{

    data:Stemstroke[];
    undostack: UndoAction[];
    redostack: UndoAction[]; 
  

    constructor(drawing:Stemstroke[]){
        this.data = drawing;
        this.undostack = [];
        this.redostack = [];
    }
    save(action:UndoAction){

        this.undostack.push(action);
        this.redostack = [];
    }   

    undo(){

        if(this.undostack.length < 1)
        {
            return;
        }

        let lastaction = this.undostack[this.undostack.length - 1];
        if(lastaction.actiontype == UndoActionTypes.newdraw)
        {
            this.data.pop(); //pop off drawing
            let action = this.undostack.pop();
            this.redostack.push(action); //pop undo action off the undo stack into the redo stack
        }
        else if(lastaction.actiontype == UndoActionTypes.colourmulti)
        {

        }
        else if(lastaction.actiontype == UndoActionTypes.coloursingle)
        {

        }
        else if(lastaction.actiontype == UndoActionTypes.erase)
        {

        }
        else if(lastaction.actiontype == UndoActionTypes.movemulti)
        {
            let action = this.undostack.pop();
            action.multistrokes.forEach(s=>{
                s.points.forEach(p=>{
                    p.x -= action.vector.x;
                    p.y -= action.vector.y;

                })
            })
            this.redostack.push(action);

        }
        else if(lastaction.actiontype == UndoActionTypes.movesingle)
        {
            let action = this.undostack.pop();
            action.stroke.points.forEach(p=>{
                p.x -= action.vector.x;
                p.y -= action.vector.y;
            });
            this.redostack.push(action);
        }
        else if(lastaction.actiontype == UndoActionTypes.resizemulti)
        {

        }
        else if(lastaction.actiontype == UndoActionTypes.resizesingle)
        {

        }
        else if(lastaction.actiontype == UndoActionTypes.widthmulti)
        {

        }
        else if(lastaction.actiontype == UndoActionTypes.widthsingle)
        {

        }

   
   

}

    redo(){    
        
        if(this.redostack.length < 1)
        {
            return;            
        }

        let lastaction = this.redostack[this.redostack.length - 1];
        if(lastaction.actiontype == UndoActionTypes.newdraw)
        {
            this.data.push(lastaction.stroke); //pop off drawing
            
        }  
        else if(lastaction.actiontype == UndoActionTypes.movesingle)
        {
            lastaction.stroke.points.forEach(s=>{
                s.x += lastaction.vector.x;
                s.y += lastaction.vector.y;
            })
        }
        else if(lastaction.actiontype == UndoActionTypes.movemulti)
        {
            console.log("redo move multi");
            lastaction.multistrokes.forEach(s=>{
                s.points.forEach(p=>{
                    p.x += lastaction.vector.x;
                    p.y += lastaction.vector.y;
                })
            })
        }


        this.undostack.push(this.redostack.pop()); //pop undo action off the undo stack into the redo stack

    }


    clear(){
        this.undostack = [];
        this.redostack = [];
    }
}
enum UndoActionTypes {
    movesingle, movemulti, resizesingle, resizemulti, coloursingle, colourmulti, newdraw, erase,
    widthsingle,widthmulti
}
class Canvasconstants {
    static width: number = 1500;
    static height: number = 1000;
    static multiselectMinimumLength: number = 20; //minimum length for a multiselection box to appear when dragging with the select tool
    static cornersize: number = 10;
    static cursorsize: number = 38;
}
class SelectionManager {
    debug: CanvasRenderingContext2D;
    currentSelectionID: string;
    currentlySelected: StemDrawnObject;
    clipboard: StemDrawnObject;

    currentlySelectedMulti: StemDrawnObject[];
    multiBoundingBox: StemstrokeBox;
    multifresh: boolean = false;

    fresh: boolean;
    contextfresh: boolean = true;
    showFullContextMenu: boolean = false;
    drawingData: StemDrawnObject[];
    //holds the currently selected drawnobject or multidrawnobject
    //keeps track of freshness    

    constructor(drawingData: StemDrawnObject[], debug: CanvasRenderingContext2D) {
        this.drawingData = drawingData;
        this.currentlySelected = null;
        this.currentlySelectedMulti = null;
        this.fresh = false;
        this.debug = debug;
    }
    FlushSelection() {
        this.currentSelectionID = null;
        this.currentlySelected = null;
        this.clipboard = null;
        this.currentlySelectedMulti = null;
        this.fresh = false;
        this.contextfresh = false;
        this.showFullContextMenu = false;
    }

    IDObjectAtPoint(x: number, y: number) {

        let boxintersected: Array<StemDrawnObject> = new Array();
        this.drawingData.forEach(el => {


            el.UpdateBoundingBox("");
            if (el.getCachedBoundingBox().Intersects(x, y)) {
                boxintersected.push(el);
            }
        });
        if (boxintersected.length == 0) {
            this.currentlySelected = null;
            this.fresh = false; //selected nothing
        }
        let indexofClosest = 0;
        let closenessvalue = 99999999999999999;
        let index = 0;

        //consider doing this from top to bottom?
        boxintersected.forEach(el => {

            if (el.objecttype == "DRAW") //todo what are we checking for here agaain? does js have enums?
            {
                //search all points, distance to nearest point (could maybe skip every second point to speed up?)
                el.points.forEach(point => {
                    let distance = Math.sqrt(Math.pow(Math.abs(point.x - x), 2) + Math.pow(Math.abs(point.y - y), 2));
                    if (distance < closenessvalue) {
                        closenessvalue = distance;
                        indexofClosest = index;
                    }
                });
            }
            else if (el.objecttype == "RECTANGLE") {
                let box = el.getCachedBoundingBox();
                let xoriginx = Math.abs(x - box.originx);
                let xmaxx = Math.abs(x - box.maxX);
                let yoriginy = Math.abs(y - box.originy);
                let ymaxx = Math.abs(y - box.maxY);

                let distance = Math.min(xoriginx, xmaxx, yoriginy, ymaxx); //get the closest distance to all 4 walls

                if (distance < closenessvalue) {
                    indexofClosest = index;
                    closenessvalue = distance;
                }
            }
            // else if (el.objecttype == "RECTANGLE")//find all rectangles
            // {
            //     

            // }
            else if (el.objecttype == "CIRCLE")//find all circles  
            {
                let actualdistance = null;
                let box = el.getCachedBoundingBox();
                el.radius = el.getPixelLength();
                let centerx = (box.originx + box.maxX) / 2
                let centery = (box.originy + box.maxY) / 2
                let distancetocenter = this.getDistanceBetweenTwoPoints(new Vector(x, y), new Vector(centerx, centery));
                if (distancetocenter < el.radius) //check if click is inside the circle
                {
                    actualdistance = el.radius - distancetocenter;
                }
                else {
                    actualdistance = distancetocenter - el.radius;
                }



                let distance = actualdistance;
                if (distance < closenessvalue) {
                    closenessvalue = distance;
                    indexofClosest = index;
                }
            }
            // else if (el.objecttype == "TEXT") {
            //     let text = el as StemText;
            //     let distance = 99999999999;
            //     if (text.cachedBoundingBox.DoesIntersect(x, y)) {
            //         distance = 0;
            //     }

            //     if (distance < closenessvalue) {
            //         closenessvalue = distance;
            //         indexofClosest = index;
            //     }

            // }
            else if (el.objecttype == "LINE") {

                let first = el.getFirstPoint();
                let last = el.getLastPoint();

                let a = new Vector(first.x, first.y); //start point of line
                let b = new Vector(last.x, last.y); //end point of line
                let distance = this.getDistanceOfPointToLine(a, b, new Vector(x, y));

                if (distance < closenessvalue) {
                    closenessvalue = distance;
                    indexofClosest = index;
                }
            }
            index++;
        });

        if (closenessvalue < 99999999999999999) //check that it actually found something
        {
            return boxintersected[indexofClosest].strokeid;
        }
        else {
            this.fresh = false;
            return null;


        }
    }

    indexAtID(id: string) {
        for (let i = 0; i < this.drawingData.length; i++) {
            if (this.drawingData[i].strokeid == id) {
                return i;
            }
        }
        return null;
    }

    getGroupBoundingBox()//uses the selectedmulti object
    {
        let lowestx = 999999999999,
            lowesty = 999999999999,
            heighestx = -999999999999,
            heighesty = -999999999999;

        this.currentlySelectedMulti.forEach(s => {
            s.points.forEach(p => {
                if (p.x < lowestx) {
                    lowestx = p.x;
                }
                else if (p.x > heighestx) {
                    heighestx = p.x;
                }

                if (p.y < lowesty) {
                    lowesty = p.y;
                }
                else if (p.y > heighesty) {
                    heighesty = p.y;
                }

            });
        });

        this.multiBoundingBox = new StemstrokeBox();
        this.multiBoundingBox.maxX = heighestx;
        this.multiBoundingBox.maxY = heighesty;
        this.multiBoundingBox.originx = lowestx;
        this.multiBoundingBox.originy = lowesty;


        return this.multiBoundingBox;
    }

    ///A to B is the line, P is the point
    getDistanceOfPointToLine(a: Vector, b: Vector, p: Vector) {
        let x = p.x;
        let y = p.y;
        let x1 = a.x;
        let x2 = b.x;
        let y1 = a.y;
        let y2 = b.y;


        let A = x - x1;
        let B = y - y1;
        let C = x2 - x1;
        let D = y2 - y1;

        var dot = A * C + B * D;
        var len_sq = C * C + D * D;
        var param = -1;
        if (len_sq != 0) //in case of 0 length line
        {
            param = dot / len_sq;
        }


        var xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        }
        else if (param > 1) {
            xx = x2;
            yy = y2;
        }
        else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        var dx = x - xx;
        var dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);

    }

    getDistanceBetweenTwoPoints(first: Vector, second: Vector) {
        let a = first.x - second.x;
        let b = first.y - second.y;

        let distance = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
        return distance;
    }

    selectObjectAtPoint(x: number, y: number) {

        this.currentlySelectedMulti = null;
        let idofselected = this.IDObjectAtPoint(x, y);
        let indexofid = -1;

        for (let i = 0; i < this.drawingData.length; i++) {
            if (this.drawingData[i].strokeid == idofselected) {
                indexofid = i;
            }
        }


        if (indexofid != -1) {
            let selected = this.drawingData[indexofid];
            if (selected.strokeid == this.currentSelectionID) {
                this.fresh = false; //user selected same object
            }
            else {
                this.currentlySelected = selected;
                this.currentSelectionID = this.currentlySelected.strokeid;
                this.fresh = false;
            }
        }
        else { //nothing was selected
            this.currentlySelected = null;
            this.currentSelectionID = "";
            this.fresh = false;
            this.contextfresh = false;
        }


    }
    selectInsideBox(selectionbox: StemstrokeBox) {
        this.currentlySelected = null;

        let selected = new Array<Stemstroke>();
        this.drawingData.forEach(s => {
            let first = s.points[0];
            let last = s.points[s.points.length - 1];

            let firstorlastinside = false
            if (this.PointInsideBoxCheck(first.x, first.y, selectionbox)) {
                firstorlastinside = true;
            }
            if (this.PointInsideBoxCheck(last.x, last.y, selectionbox)) {
                firstorlastinside = true;
            }

            if (firstorlastinside) {
                selected.push(s);
            }

            if (selected.length == 1) {
                this.multiBoundingBox = null;
                //do a normal selection
            }
            else if (selected.length > 1) {
                this.currentlySelectedMulti = selected;
                console.log(this.currentlySelectedMulti);
            }
            else {
                this.multiBoundingBox = null;
                //select nothing
            }
        });


    }
    copySelected() {
        this.clipboard = new StemDrawnObject();
        let copytime = performance.now();

        this.currentlySelected.points.forEach(p => {
            let np = Object.create(new Stempoint(p.x + 20, p.y + 20));
            np.press = p.press;
            np.timestamp = copytime; //
            this.clipboard.points.push(np);
        });
        this.clipboard.objecttype = this.currentlySelected.objecttype;
        this.clipboard.strokecolour = this.currentlySelected.strokecolour;
        this.clipboard.strokewidth = this.currentlySelected.strokewidth;
        this.clipboard.strokeid = helper.getGUID();
        this.clipboard.copyof = this.currentlySelected.strokeid;
    }

    pasteFromClipboard() {

        this.currentlySelected = null;

        if (this.clipboard != null) {
            let indexofcopied = this.clipboard.strokeid;
            //orig
            this.drawingData.push(this.clipboard);

            this.currentlySelected = this.drawingData[this.drawingData.length - 1];

            this.fresh = false
            this.currentSelectionID = this.currentlySelected.strokeid;

            this.clipboard = null; //clear it for now revisit      

        }
        else {
            //@ts-ignore 
            M.toast({ html: 'Copy object first' });
        }
    }

    debugCanvasPoint(x, y) {

        this.debug.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
        this.debug.strokeStyle = "Red";
        this.debug.lineWidth = 4;
        this.debug.beginPath();
        this.debug.moveTo(0, 0);
        this.debug.lineTo(x, y);
        this.debug.stroke();
        this.debug.closePath();
    }

    debugCanvasRectangle(minx, miny, maxx, maxy) {
        this.debug.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
        this.debug.strokeStyle = "Red";
        this.debug.lineWidth = 4;
        this.debug.beginPath();
        this.debug.moveTo(minx, miny);
        this.debug.lineTo(minx, maxy);
        this.debug.lineTo(maxx, maxy);
        this.debug.lineTo(maxx, miny);
        this.debug.lineTo(minx, miny);

        this.debug.stroke();
        this.debug.closePath();
    }


    PointInsideBoxCheck(x, y, box: StemstrokeBox) {
        if (x < box.originx || x > box.maxX) {
            return false;
        }
        if (y < box.originy || y > box.maxY) {
            return false;
        }

        //x and y must be within the bounds of the box now
        return true;

    }






}
class Sessioninfo {

    public Sessioninfo() {

    }
    public participanttoken: string;
    public devicetype: string;
    public task: string;

    public start: string;
    public startperf: string;
    public end: string;

}
class FileOutputPackage {

    public drawingdata: Stemstroke[];
    public sessioninfo: any;
    public imagefile: any;

    constructor() {


    }
}



