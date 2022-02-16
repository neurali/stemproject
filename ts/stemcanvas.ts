class Stemcanvas {

    drawingdata: Array<Stemstroke>;

    undoActions: Array<UndoAction>; //holds things that can be undone
    redoActions: Array<UndoAction>; //holds things that can be redone

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
    participant:string;
    taskset:string;
    task: string;
    devicetype:string;

    //session info for file download:
    //session start time clock
    starttimeclock: string = "";
    //session start time performance
    starttimeperf: string = "";
    //session end time clock
    endtimeclock: string = "";

    constructor(id: string) {

        //load the session details:   
        this.participant = sessionStorage.getItem("token");
        this.taskset = sessionStorage.getItem("taskset");
        this.devicetype = sessionStorage.getItem("devicetype");

        let sessioninfo = document.getElementById("sessioninfo") as HTMLElement;
        let attTasknumber = sessioninfo.attributes.getNamedItem("data-tasknumber");
        this.task = attTasknumber.value;

        if (this.taskset == "a") {
            if (this.task == "q3") {
                document.getElementById("btnNext").classList.add("hide");
            }
        }
        else if (this.taskset == "b") {
            if (this.task == "q6") {
                document.getElementById("btnNext").classList.add("hide");
            }
        }



        this.menuImage.src = "media/cursors/c_Menu.png"
        this.drawingdata = new Array<Stemstroke>();
        this.undoActions = new Array<UndoAction>();
        this.redoActions = new Array<UndoAction>();

        this.debug = document.getElementById("debug") as HTMLParagraphElement;

        this.canvasbackground = document.getElementById("canvasbackground") as HTMLDivElement;
        this.canvascontainer = document.getElementById("canvas-scroll-container");
        this.drawingcanvas = document.getElementById(id) as HTMLCanvasElement;
        this.selectioncanvas = document.getElementById("selectioncanvas") as HTMLCanvasElement;
        this.cursorcanvas = document.getElementById("cursorcanvas") as HTMLCanvasElement;
        this.interfacecanvas = document.getElementById("interfacecanvas") as HTMLCanvasElement;
        this.debugcanvas = document.getElementById("debugcanvas") as HTMLCanvasElement;

        this.initialisecanvas();
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

        //prep drawing canvas
        //  this.contextDrawing.fillStyle = "white";
        //  this.contextDrawing.fillRect(0, 0, this.drawingcanvas.width, this.drawingcanvas.height);

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
        });
        this.toolbox.selectedtool = "DRAW";
        this.toolbox.selectedDrawSize = 5;



        //canvas interaction events
        this.drawingcanvas.addEventListener("pointerenter", this.PointerEnterEvent.bind(this));
        this.drawingcanvas.addEventListener("pointermove", this.PointerMoveEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerdown", this.PointerDownEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerup", this.PointerUpEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerleave", this.PointerLeaveEvent.bind(this));

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

        document.getElementById("btnSave").addEventListener("click",()=>{
            this.saveDataLocally();
        })


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
        this.undoActions = new Array();
        this.redoActions = new Array();
        this.selectionManager.FlushSelection();
        this.selectionManager = new SelectionManager(this.drawingdata, this.contextDebug);
        this.updateDrawing();
    }
    undo() {

        if (this.undoActions.length < 1) {
            if (this.drawingdata.length > 0) {
                //pop last drawing object into the redo stack
                let lastDrawnObject = this.drawingdata.pop();
                this.redoActions.push(new UndoUndoObject(lastDrawnObject));
            }


        }
        else {
            let lastactionundone = this.undoActions[this.undoActions.length - 1];
            if (lastactionundone.actiontype == "MOVE") {
                let lastmove = lastactionundone as UndoMoveAction; //now we need the move data
                let objecttomove: Stemstroke;
                this.drawingdata.forEach(s => {
                    if (s.strokeid == lastmove.id) {
                        objecttomove = s;
                    }
                });
                for (let i = 0; i < objecttomove.points.length; i++) {
                    let p = objecttomove.points[i];
                    p.x -= lastmove.vector.x;
                    p.y -= lastmove.vector.y;
                }
            }
            else if (lastactionundone.actiontype == "RESIZE") {
                let lastresize = lastactionundone as UndoResizeAction;
                let objecttoresize: Stemstroke;
                this.drawingdata.forEach(s => {
                    if (s.strokeid == lastresize.id) {
                        objecttoresize = s;
                    }
                });

                let invertedvector = new Vector(-lastresize.vector.x, -lastresize.vector.y);
                let tempresizefromundo = this.resizeStroke(objecttoresize, invertedvector, lastresize.direction);
                for (let i = 0; i < tempresizefromundo.points.length; i++) {
                    let point = tempresizefromundo.points[i];
                    objecttoresize.points[i].x = point.x;
                    objecttoresize.points[i].y = point.y;
                }
            }
            else if (lastactionundone.actiontype == "ERASE") {
                let lasterase = lastactionundone as UndoEraseAction;
                this.drawingdata.push(lasterase.thestroke);
            }

            //now pop the action off the undo stack to the redo stack
            this.redoActions.push(this.undoActions.pop());


        }
        this.updateDrawing();

        console.log(`redo stack length: ${this.redoActions.length}`);
        console.log(`undo stack length: ${this.undoActions.length}`);
        console.log(`drawing data length: ${this.drawingdata.length}`);


    }
    redo() {
        if (this.redoActions.length > 0) {
            let lastaction = this.redoActions[this.redoActions.length - 1];
            if (lastaction.actiontype == "ERASE") {
                let eraseaction = lastaction as UndoEraseAction;
                this.drawingdata.push(eraseaction.thestroke);
            }
            else if (lastaction.actiontype == "MOVE") {
                let lastmove = lastaction as UndoMoveAction;

                //
                let objecttomove: Stemstroke;
                this.drawingdata.forEach(s => {
                    if (s.strokeid == lastmove.id) {
                        objecttomove = s;
                    }
                });
                for (let i = 0; i < objecttomove.points.length; i++) {
                    let p = objecttomove.points[i];
                    p.x += lastmove.vector.x;
                    p.y += lastmove.vector.y;
                }
                //
            }
            else if (lastaction.actiontype == "RESIZE") {
                let resizeaction = lastaction as UndoResizeAction;

                //let lastresize = lastactionundone as UndoResizeAction;
                let objecttoresize: Stemstroke;
                this.drawingdata.forEach(s => {
                    if (s.strokeid == resizeaction.id) {
                        objecttoresize = s;
                    }
                });

                let tempresizefromundo = this.resizeStroke(objecttoresize, resizeaction.vector, resizeaction.direction);
                for (let i = 0; i < tempresizefromundo.points.length; i++) {
                    let point = tempresizefromundo.points[i];
                    objecttoresize.points[i].x = point.x;
                    objecttoresize.points[i].y = point.y;
                }


                //
            }
            else if (lastaction.actiontype == "UNDO") {
                //here we are adding the 'undone' object back to the drawing
                //this doesnt need to get pushed into the redo stack (that would be undoing an undo of an undo? jeez this is doing my head in) but now we have an issue where if the user draws a stroke halfway
                //in the undo stack, it doesnt get undone. maybe we should do away with (undoing strokes) and just have 'actions' that can be undone
                let redoundo = lastaction as UndoUndoObject;
                this.drawingdata.push(redoundo.thestroke);
                this.redoActions.pop();

            }

            if (lastaction.actiontype != "UNDO") {
                this.undoActions.push(this.redoActions.pop());
            }



            this.updateDrawing();
        }
        else {
            //do nothing
        }
        console.log(`redo stack length: ${this.redoActions.length}`);
        console.log(`undo stack length: ${this.undoActions.length}`);
        console.log(`drawing data length: ${this.drawingdata.length}`);

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
        this.debugtext(this.drawingdata.length);

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
        this.drawContextMenu()
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
                //this.contextSelection.stroke();
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
                //this.contextSelection.stroke();
                this.stroke("selection");
                //this.contextSelection.closePath();


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
                                        //this.contextSelection.stroke();
                                        this.stroke("selection");
                                        //this.contextSelection.closePath();
                                    }
                                    else if (this.selectionManager.currentlySelected.objecttype == "LINE") {
                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(previewstroke.points[0].x, previewstroke.points[0].y);
                                        this.contextSelection.lineTo(previewstroke.points[previewstroke.points.length - 1].x, previewstroke.points[previewstroke.points.length - 1].y);
                                        //this.contextSelection.stroke();
                                        this.stroke("selection");
                                        //this.contextSelection.closePath();
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
                                    //this.contextSelection.stroke();
                                    //this.contextSelection.closePath();
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
                                        //this.contextSelection.stroke();
                                        this.stroke("selection");
                                        //this.contextSelection.closePath();
                                    }

                                }
                                else if (selectedtype == "LINE") {
                                    if (previewstroke.points.length > 1) {

                                        let first = previewstroke.points[0];
                                        let last = previewstroke.points[previewstroke.points.length - 1];

                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(first.x, first.y);
                                        this.contextSelection.lineTo(last.x, last.y)
                                        //this.contextSelection.stroke();
                                        this.stroke("selection");
                                        //this.contextSelection.closePath();
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
                                        //this.contextSelection.stroke();
                                        //this.contextSelection.closePath();


                                        //this.contextSelection.stroke();
                                        //this.contextSelection.closePath();
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

                    let minx = 99999999999;
                    let miny = 99999999999;
                    let maxx = -99999999999;
                    let maxy = -99999999999;

                    this.selectionManager.currentlySelectedMulti.forEach(s => {
                        let first = s.getFirstPoint();
                        let last = s.getLastPoint();

                        let lowestx = Math.min(first.x, last.x);
                        let lowesty = Math.min(first.y, last.y);
                        let heighestx = Math.max(first.x, last.x);
                        let heighesty = Math.max(first.y, last.y);

                        if (lowestx < minx) {
                            minx = lowestx;
                        }
                        if (lowesty < miny) {
                            miny = lowesty;
                        }
                        if (heighestx > maxx) {
                            maxx = heighestx;
                        }
                        if (heighesty > maxy) {
                            maxy = heighesty;
                        }

                    });

                    this.contextSelection.setLineDash([0]);
                    this.contextSelection.beginPath();
                    this.contextSelection.moveTo(minx, miny); //start at topleft
                    this.contextSelection.lineTo(maxx, miny);
                    this.contextSelection.lineTo(maxx, maxy);
                    this.contextSelection.lineTo(minx, maxy);
                    this.contextSelection.lineTo(minx, miny);
                    this.stroke("selection");

                    //now draw the dotted white line on top:
                    this.contextSelection.setLineDash([9]);
                    this.contextSelection.strokeStyle = "white";
                    this.contextSelection.beginPath();
                    this.contextSelection.moveTo(minx, miny); //start at topleft
                    this.contextSelection.lineTo(maxx, miny);
                    this.contextSelection.lineTo(maxx, maxy);
                    this.contextSelection.lineTo(minx, maxy);
                    this.contextSelection.lineTo(minx, miny);
                    this.stroke("selection");
                    this.contextSelection.strokeStyle = "black";
                    this.contextSelection.closePath();
                    this.selectionManager.multifresh = true;

                    this.contextSelection.fillStyle = "white"
                    this.contextSelection.strokeStyle = "black";

                    this.contextSelection.setLineDash([0]);

                    this.contextSelection.fillRect(minx - 5, miny - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);
                    this.contextSelection.strokeRect(minx - 5, miny - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);

                    this.contextSelection.fillRect(maxx - 5, miny - 5, 10, 10);
                    this.contextSelection.strokeRect(maxx - 5, miny - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);

                    this.contextSelection.fillRect(maxx - 5, maxy - 5, 10, 10);
                    this.contextSelection.strokeRect(maxx - 5, maxy - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);

                    this.contextSelection.fillRect(minx - 5, maxy - 5, 10, 10);
                    this.contextSelection.strokeRect(minx - 5, maxy - 5, Canvasconstants.cornersize, Canvasconstants.cornersize);


                    //now check if interacting and render the move preview etc:

                    /////////////////////////////////////////////////////////////

                    if (this.pen.onCanvas && this.pen.penDown) {
                        if (this.cursor.interacting) {
                            //now render move or resize previews
                            if (this.toolbox.selectedtool == "SELECT") {

                                if (this.cursor.selectmodifier == "MOVE") {

                                    //calc and affect move vector to selected object points
                                    let vector = this.getCurrentStrokeVector();

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


        e.preventDefault();

        if (e.pointerType == "touch") {
            this.touchcount--;
            this.debugtext(this.touchcount);
        }
        // this.crystaliseDrawing();
        this.pen.penDown = false;

        // this.pendetails.penDown = false;
        // //push current stroke to the whole drawing
        // //render background canvas (async if we can?)
        // this.UpdateCurrentStrokeDataDynamics();
        if (this.toolbox.selectedtool == "DRAW") {
            this.currentstroke.UpdateBoundingBox("PointerUpEvent 'DRAW'");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;

            this.drawingdata.push(this.currentstroke);
        }
        else if (this.toolbox.selectedtool == "SELECT") {
            console.log("stop");
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

                            let undomoveaction = new UndoMoveAction(new Vector(x, y), this.selectionManager.currentSelectionID + "");
                            this.undoActions.push(undomoveaction);
                            this.selectionManager.currentlySelected.UpdateBoundingBox("");
                            this.selectionManager.fresh = false;
                            this.updateDrawing();
                        }
                        else {
                            this.selectionManager.selectObjectAtPoint(this.pen.X, this.pen.Y);
                        }

                    }
                    else {

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
                        let resizeundo = new UndoResizeAction(resizevector, this.selectionManager.currentSelectionID + "", this.cursor.selectmodifier);
                        this.undoActions.push(resizeundo);

                        this.selectionManager.currentlySelected.UpdateBoundingBox("");
                        this.selectionManager.fresh = false;
                        this.updateDrawing();


                        ///////////////


                    }
                }
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
                    if (this.cursor.selectmodifier == "MOVE") {
                    }
                    else
                    {
                        if(this.cursor.selectmodifier.length == 2)
                        {
                            //resize command
                        }
                    }
                }
                else
                {
                    this.selectionManager.selectObjectAtPoint(this.pen.X, this.pen.Y);
                }
            }

            if(this.selectionManager.currentlySelected == null && this.selectionManager.currentlySelectedMulti == null)
            {
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
                    this.selectionManager.selectObjectAtPoint(this.pen.X, this.pen.Y);
                }
            }     
            else
            {

            }      
            

            this.currentstroke = null;
        }
        else if (this.toolbox.selectedtool == "ERASE") {
            //is the stroke a line or a point
            if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {
                //line erase
            }
            else {
                //point
                let underpointerid = this.selectionManager.IDObjectAtPoint(this.currentstroke.points[this.currentstroke.points.length - 1].x, this.currentstroke.points[this.currentstroke.points.length - 1].y);
                //
                let indexunderpointer = this.selectionManager.indexAtID(underpointerid);
                if (indexunderpointer == null) {
                    return;
                }
                this.undoActions.push(new UndoEraseAction(this.drawingdata[indexunderpointer]));
                this.drawingdata.splice(indexunderpointer, 1); //remove the entry from the array
                this.updateDrawing();

            }
        }
        else if (this.toolbox.selectedtool == "LINE") {
            this.currentstroke.UpdateBoundingBox("");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            this.drawingdata.push(this.currentstroke);
            this.updateDrawing();
            this.currentstroke = null;

        }
        else if (this.toolbox.selectedtool == "RECTANGLE") {
            this.currentstroke.UpdateBoundingBox("");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            this.drawingdata.push(this.currentstroke);
            this.updateDrawing();
            this.currentstroke = null;
        }
        else if (this.toolbox.selectedtool == "CIRCLE") {
            this.currentstroke.UpdateBoundingBox("");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            this.drawingdata.push(this.currentstroke);
            this.updateDrawing();
            this.currentstroke = null;
        }
        this.currentstroke = null;
        this.cursor.interacting = false;
        this.toolbox.isDrawingObject = false;

        // else if (this.selectedTool == "TEXT") {
        //     //show text entry pop over 
        //     let customcontainer = document.getElementById("canvas-scroll-container");
        //     // let popupdiv = document.createElement()
        //     let textinputdiv = document.getElementById("text-input-modal");
        //     textinputdiv.classList.remove("hide");
        //     let canvasposition = this.canvas.getBoundingClientRect();
        //     let inputbox = document.getElementById("text-input-box");
        //     inputbox.style.left = (this.pendetails.X + 5 - this.pendetails.scrollx).toString() + "px";
        //     inputbox.style.top = (canvasposition.top + this.pendetails.Y - 45).toString() + "px";

        // }
        // else if (this.selectedTool == "RECTANGLE") {
        //     if (this.currentRectangle != null) {
        //         this.currentRectangle.strokecolour = this.currentStrokeData.strokecolour;
        //         this.currentRectangle.strokewidth = this.currentStrokeData.strokewidth;
        //         this.currentRectangle.isFilled = this.currentStrokeData.isFilled;
        //         this.drawing.push(this.currentRectangle);
        //     }
        //     this.selectedDrawnObject = this.currentRectangle;
        //     this.currentRectangle = null;
        // }
        // else if (this.selectedTool == "CIRCLE") {
        //     if (this.currentCircle != null) {
        //         this.currentCircle.strokecolour = this.currentStrokeData.strokecolour;
        //         this.currentCircle.strokewidth = this.currentStrokeData.strokewidth;
        //         this.currentCircle.isFilled = this.currentStrokeData.isFilled;
        //         this.drawing.push(this.currentCircle);
        //         this.selectedDrawnObject = this.currentCircle;
        //     }
        //     this.currentCircle = null;

        // }
        // else if (this.selectedTool == "SELECT") {
        //     if (this.ismovingobject) {

        //         this.currentMove.startPoint = this.currentStrokeData.points[0];
        //         this.currentMove.endPoint = this.currentStrokeData.points[this.currentStrokeData.points.length - 1];
        //         //now find the stored stroke, and move all its points
        //         let xvector = this.currentMove.endPoint.x - this.currentMove.startPoint.x;
        //         let yvector = this.currentMove.endPoint.y - this.currentMove.startPoint.y;


        //         if(this.selectedMultiDrawnObjects!= null && this.selectedDrawnObject == null) //if there are multiobjects selected
        //         {
        //             this.drawing.forEach(maindrawingitem => {
        //                 this.selectedMultiDrawnObjects.drawingdata.forEach(selecteditem => {
        //                     if(selecteditem.strokeid == maindrawingitem.strokeid)
        //                     {
        //                         maindrawingitem.points.forEach(p => {
        //                             p.x += xvector;
        //                             p.y += yvector;
        //                         });
        //                     }
        //                 });
        //             });
        //         }                


        //         if(this.selectedDrawnObject != null && this.selectedMultiDrawnObjects == null) 
        //         {
        //         // this.selectedDrawnObject?.strokeid
        //         //loop through drawing to find the right object
        //         this.drawing.forEach(stemobj => {
        //             if (stemobj.strokeid == this.selectedDrawnObject.strokeid) //affect only the selected object
        //             {
        //                 stemobj.points.forEach(p => {
        //                     p.x += xvector;
        //                     p.y += yvector;
        //                 });
        //                 //because the textobject bounding box is created at mouse up, we also need to translate that too
        //                 if (stemobj.objecttype == "TEXT") {
        //                     stemobj.cachedBoundingBox.originx += xvector;
        //                     stemobj.cachedBoundingBox.originy += yvector;
        //                     stemobj.cachedBoundingBox.maxX += xvector;
        //                     stemobj.cachedBoundingBox.maxY += yvector;
        //                 }
        //             }


        //         });
        //         }



        //         this.currentMove = null;
        //     }

        //     else if (this.isresizingobject) {
        //         this.selectedDrawnObject.UpdateBoundingBox("renderObjectResizePreview");
        //         let strokebox = this.selectedDrawnObject.getCachedBoundingBox();
        //         let strokewidth = (strokebox.maxX - strokebox.originx);
        //         let strokeheight = (strokebox.maxY - strokebox.originy);
        //         let first = this.currentStrokeData.points[0];
        //         let last = this.currentStrokeData.points[this.currentStrokeData.points.length - 1];
        //         let resizewidth = ((last.x) - (first.x));
        //         let resizeheight = ((last.y) - (first.y));

        //         let xfactor = 1 + (resizewidth / strokewidth);//remove padding
        //         let yfactor = 1 + (resizeheight / strokeheight);

        //         if (this.selectedDrawnObject.objecttype == "DRAW" || this.selectedDrawnObject.objecttype == "RECTANGLE") {
        //             this.selectedDrawnObject.UpdateBoundingBox("PointerUpEvent 'SELECT'");
        //             let selectedstrokebox = this.selectedDrawnObject.getCachedBoundingBox();
        //             let selectedstrokewidth = selectedstrokebox.maxX - selectedstrokebox.originx;
        //             let selectedstrokeheight = selectedstrokebox.maxY - selectedstrokebox.originy;

        //             let first = this.currentStrokeData.points[0];
        //             let last = this.currentStrokeData.points[this.currentStrokeData.points.length - 1];

        //             let resizewidth = last.x - first.x;
        //             let resizeheight = last.y - first.y;

        //             if (this.hoveredSelectionPoint == "NE") {
        //                 resizeheight = resizeheight * -1;
        //             }
        //             if (this.hoveredSelectionPoint == "SW") {
        //                 resizewidth = resizewidth * -1;
        //             }
        //             if (this.hoveredSelectionPoint == "NW") {
        //                 resizewidth = resizewidth * -1;
        //                 resizeheight = resizeheight * -1;
        //             }

        //             let xfactor = 1 + (resizewidth / selectedstrokewidth);
        //             let yfactor = 1 + (resizeheight / selectedstrokeheight);

        //             //sanity check
        //             if (this.currentStrokeData == null) {
        //                 return;
        //             }

        //             let relocatex = 0;
        //             let relocatey = 0;

        //             if (this.hoveredSelectionPoint == "NE") {
        //                 relocatey = resizeheight;
        //             }
        //             if (this.hoveredSelectionPoint == "SW") {
        //                 relocatex = resizewidth;
        //             }
        //             if (this.hoveredSelectionPoint == "NW") {
        //                 relocatey = resizeheight;
        //                 relocatex = resizewidth;
        //             }



        //             for (let i = 0; i < this.selectedDrawnObject.points.length; i++) {

        //                 let currentpoint = this.selectedDrawnObject.points[i];

        //                 let transformedpoint = this.TransformPoint(currentpoint.x - selectedstrokebox.originx, currentpoint.y - selectedstrokebox.originy, xfactor, 0, 0, yfactor, 0, 0);

        //                 let currentactualpoint = this.selectedDrawnObject.points[i];
        //                 currentactualpoint.x = transformedpoint.x + selectedstrokebox.originx - relocatex;
        //                 currentactualpoint.y = transformedpoint.y + selectedstrokebox.originy - relocatey;
        //             }

        //         }
        //         else if (this.selectedDrawnObject.objecttype == "CIRCLE") {
        //             let firstpoint = this.selectedDrawnObject.points[0];
        //             let lastpoint = this.selectedDrawnObject.points[this.selectedDrawnObject.points.length - 1];

        //             strokewidth = Math.abs(firstpoint.x - lastpoint.x);
        //             strokeheight = Math.abs(firstpoint.y - lastpoint.y);

        //             if (this.hoveredSelectionPoint == "P") {
        //                 resizeheight = resizeheight * -1; //invert y                
        //             }

        //             let circlexfactor = 1 + (resizewidth / strokewidth);//remove padding
        //             let circleyfactor = 1 + (resizeheight / strokeheight);

        //             this.ccontext.beginPath();

        //             let newfinal = this.TransformPoint(lastpoint.x - (firstpoint.x), lastpoint.y - (firstpoint.y), circlexfactor, 0, 0, circleyfactor, 0, 0);
        //             newfinal.x = newfinal.x + firstpoint.x;
        //             newfinal.y = newfinal.y + firstpoint.y;

        //             let newwidth = Math.abs(newfinal.x - firstpoint.x);
        //             let newheight = Math.abs(newfinal.y - firstpoint.y);


        //             for (let i = 0; i < this.selectedDrawnObject.points.length; i++) {
        //                 if (this.hoveredSelectionPoint == "P") {
        //                     let currentpoint = this.selectedDrawnObject.points[i];
        //                     let transformedpoint = this.TransformPoint(currentpoint.x - (firstpoint.x), currentpoint.y - (firstpoint.y), circlexfactor, 0, 0, circleyfactor, 0, 0);
        //                     currentpoint.x = transformedpoint.x + firstpoint.x;
        //                     currentpoint.y = transformedpoint.y + firstpoint.y;
        //                     //this.ccontext.lineTo(transformedpoint.x + (firstpoint.x),transformedpoint.y + (firstpoint.y));
        //                 }

        //             }

        //         }

        //     }



        //     else {

        //         this.selectedMultiDrawnObjects = null;
        //         this.selectedDrawnObject = null;
        //         if (this.currentStrokeData.length() < this.multiselectionMinimumLength) {
        //             //cursor position in canvas:
        //             let x = e.pageX - this.canvas.offsetLeft + this.pendetails.scrollx;
        //             let y = e.pageY - this.canvas.offsetTop + this.pendetails.scrolly;
        //             //get all strokes etc that are near the cursor

        //             this.selectedMultiDrawnObjects = null;
        //             this.SelectDrawnObjectAtPoint(x, y)
        //             this.currentStrokeData = null;
        //         }
        //         else {

        //             this.currentStrokeData.UpdateBoundingBox("doesnt matter");
        //             let bounds = this.currentStrokeData.getCachedBoundingBox();

        //             this.SelectDrawnObjectsInsideBounds(bounds);
        //             this.currentStrokeData = null;
        //             this.selectedDrawnObject = null;

        //         }

        //     }

        //     this.ismovingobject = false;
        //     //this.selectedMultiDrawnObjects = null; //todo, deslecting multidrawnobjects to fix bug, needs work


        // }




        // if (this.selectedTool == "TEXT") {
        //     //dont clear stroke if entering text
        // }
        // else {

        // }

        // //since the user has drawn a new object, we can clear the redo stack
        // this.isresizingobject = false;
        // this.ccontext.closePath();
        // this.currentStrokeData = null;
        // ("about to update background render");
        // this.UpdateBackgroundRender();


        // //this.redoStack = []; //todo redo stack needs ordering after undoing and then adding more content

    }
    PointerDownEvent(e: PointerEvent) {




        if (e.pointerType == "touch") {

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

































        // this.currentStrokeData = new StemStroke();
        // this.currentStrokeData.isFilled = this.fillShapeSelected;
        // this.pendetails.X = e.pageX - this.canvas.offsetLeft + this.pendetails.scrollx;
        // this.pendetails.Y = e.pageY - this.canvas.offsetTop + this.pendetails.scrolly;
        // this.pendetails.penDown = true;
        // this.currentStrokeData.strokecolour = this.SelectedColour;
        // this.currentStrokeData.strokewidth = this.drawsize.toString();
        // this.pendetails.pressure = e.pressure;
        // this.currentStrokeData.points.push(new Stempoint(this.pendetails.X, this.pendetails.Y));

        // if (this.selectedTool == "DRAW") {

        // }
        // else if (this.selectedTool == "TEXT") {
        //     this.currentText = new StemText();
        //     this.isEnteringText = true;
        // }
        // else if (this.selectedTool == "RECTANGLE") {
        // }
        // else if (this.selectedTool == "CIRCLE") {
        // }
        // else if (this.selectedTool == "SELECT") {

        //     //check if pointer down event is coming from touch or not
        //     if (e.pointerType == "touch") {
        //         //now check if an object is already selected
        //         if (this.selectedDrawnObject != null) {
        //             //now we need to check if they are current touching a 'control point'

        //         }
        //     }
        //     else {

        //     }
        //     this.ismovingobject = false; //reset

        //     if (this.hoveredSelectionPoint == "C") {
        //         this.ismovingobject = true;
        //         // if(this.selectedMultiDrawnObjects!=null)
        //         // {
        //         //     this.ismovingmultiobject = true;
        //         //     this.ismovingobject = false;
        //         // }
        //         this.currentMove = new StemMove();
        //         //start and end are the same the moment the user clicks            
        //         //user is moving selected object, so we need to apply the translation to all the points
        //     }
        //     else if (this.hoveredSelectionPoint == "NE") {
        //         this.ismovingobject = false;
        //         this.isresizingobject = true;
        //         //user is now resizeing current selected object
        //         this.currentResize = new StemResize();
        //     }
        //     else if (this.hoveredSelectionPoint == "SE") {
        //         this.ismovingobject = false;
        //         this.isresizingobject = true;
        //         //user is now resizeing current selected object
        //         this.currentResize = new StemResize();
        //     }
        //     else if (this.hoveredSelectionPoint == "SW") {
        //         this.ismovingobject = false;
        //         this.isresizingobject = true;
        //         //user is now resizeing current selected object
        //         this.currentResize = new StemResize();
        //     }
        //     else if (this.hoveredSelectionPoint == "NW") {
        //         this.ismovingobject = false;
        //         this.isresizingobject = true;
        //         //user is now resizeing current selected object
        //         this.currentResize = new StemResize();
        //     }
        //     else if (this.hoveredSelectionPoint == "P") //circle perimeter
        //     {
        //         this.ismovingobject = false;
        //         this.isresizingobject = true;
        //         //user is now resizeing current selected object
        //         this.currentResize = new StemResize();
        //     }

        // }
        // else if (this.selectedTool == "ERASE") {
        //     // this.currentErase = new StemErasure();
        // }
        // else if (this.selectedTool == "LINE") {

        // }


        //todo set colour and width        
    }
    PointerLeaveEvent(e: PointerEvent) {
        this.pen.onCanvas = false;
    }



    crystaliseDrawing() {
        createImageBitmap(this.drawingcanvas).then((bmp) => { this.flatimage = bmp });
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

            timertext.innerText = `${hours}h  ${minutes}m  ${seconds}s`;
        }
            , 2000);


    }

    saveDataLocally(){
            let participantDeviceTask = `${this.participant} - ${this.devicetype} - ${this.task}`;

            //download canvas, 
            //this.selectedDrawnObject = null;
            this.updateDrawing();
            let image = this.drawingcanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            var anchor = document.createElement('a');
            anchor.setAttribute('download', `canvas - .png`);
            anchor.setAttribute('href', image);
            anchor.click();
            //drawing data json, 

            //Export JSON
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.drawingdata));
            anchor = document.createElement('a');
            anchor.setAttribute("href", dataStr);
            anchor.setAttribute("download", `${participantDeviceTask} - drawingdata.json`);
            anchor.click();

            //and session information
            let session = new Sessioninfo();
            session.start = this.starttimeclock
            session.end = new Date().toLocaleString();
            session.startperf = this.starttimeperf;
            session.devicetype = this.devicetype;
            session.task = this.task;
            session.participanttoken = this.participant;

            let sessionoutputstring = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session));
            anchor = document.createElement('a');
            anchor.setAttribute("href", sessionoutputstring);
            anchor.setAttribute("download", `${participantDeviceTask} - sessioninfo.json`);
            anchor.click();
    }



    debugtext(input: any) {
        this.debug.innerText = input;
    }
    // Smoothstroke(inputstroke:Stemstroke){


    //     for(let i = 1; i < inputstroke.points.length -1; i++)
    //     {
    //         let previous = inputstroke.points[i-1];
    //         let next = inputstroke.points[i + 1];

    //         let midpoint = new Vector((previous.x + next.x) /2,(previous.y + next.y)/2);

    //         let smoothingfactor = 0.5; //0 means no change, 1 means fully the midpoint
    //         let differencefactor = 1-smoothingfactor;

    //         inputstroke.points[i].x = (inputstroke.points[i].x * differencefactor) + (midpoint.x * differencefactor);
    //         inputstroke.points[i].y = (inputstroke.points[i].y * differencefactor) + (midpoint.y * differencefactor);


    //         //smoothing factor (percentage of how much blending?)

    //     }


    // }


    stroke(context: string) {

        //     contextDrawing: CanvasRenderingContext2D;
        // contextSelection: CanvasRenderingContext2D;
        // contextCursor: CanvasRenderingContext2D;
        // contextInterface: CanvasRenderingContext2D;
        // contextDebug: CanvasRenderingContext2D;

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

/////////////////////////////////////////


class Vector {
    x: number;
    y: number;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
class UndoAction {
    actiontype: string
    constructor(actiontype: string) {
        this.actiontype = actiontype;
    }
    //when an object is moved, we 

}
class UndoMoveAction extends UndoAction {
    vector: Vector;
    id: string;
    constructor(moveVector: Vector, strokeid: string) {
        super("MOVE");
        this.vector = moveVector;
        this.id = strokeid;
    }
}
class UndoResizeAction extends UndoAction {
    vector: Vector;
    id: string;
    direction: string;

    constructor(resizeVector: Vector, strokeid: string, direction: string) {
        super("RESIZE");
        this.vector = resizeVector;
        this.id = strokeid;
        this.direction = direction;
    }
}
class UndoEraseAction extends UndoAction {
    thestroke: Stemstroke;
    constructor(strokeobject: Stemstroke) {
        super("ERASE");
        this.thestroke = strokeobject;
    }
}
class UndoUndoObject extends UndoAction { //this object is used to redo objects that have been removed via undo (as opossed to erase)
    thestroke: Stemstroke;
    constructor(strokeobject: Stemstroke) {
        super("UNDO");
        this.thestroke = strokeobject;
    }
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
    currentSelectionID: String;
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
class Sessioninfo{

    public Sessioninfo(){

    }
    public participanttoken:string;
    public devicetype:string;
    public task:string;
    
    public start:string;
    public startperf:string;
    public end:string;

}



