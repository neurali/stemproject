class Stemcanvas {

    drawingdata: Array<Stemstroke>;
    undodata: Array<Stemstroke>;
    redodata: Array<Stemstroke>;

    canvasbackground: HTMLDivElement;
    drawingcanvas: HTMLCanvasElement;
    selectioncanvas: HTMLCanvasElement;
    cursorcanvas: HTMLCanvasElement;
    interfacecanvas: HTMLCanvasElement;

    contextDrawing: CanvasRenderingContext2D;
    contextSelection: CanvasRenderingContext2D;
    contextCursor: CanvasRenderingContext2D;
    contextInterface: CanvasRenderingContext2D;

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

    constructor(id: string) {

        this.drawingdata = new Array<Stemstroke>();
        this.undodata = new Array<Stemstroke>();
        this.redodata = new Array<Stemstroke>();

        this.canvasbackground = document.getElementById("canvasbackground") as HTMLDivElement;
        this.canvascontainer = document.getElementById("canvas-scroll-container");
        this.drawingcanvas = document.getElementById(id) as HTMLCanvasElement;
        this.selectioncanvas = document.getElementById("selectioncanvas") as HTMLCanvasElement;
        this.cursorcanvas = document.getElementById("cursorcanvas") as HTMLCanvasElement;
        this.interfacecanvas = document.getElementById("interfacecanvas") as HTMLCanvasElement;

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

        //init pen
        this.pen = new Pen(this.eventel);

        //init drawing contexts
        this.contextDrawing = this.drawingcanvas.getContext("2d");
        this.contextSelection = this.selectioncanvas.getContext("2d");
        this.contextCursor = this.cursorcanvas.getContext("2d");
        this.contextInterface = this.interfacecanvas.getContext("2d");

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
            this.selectionManager.fresh = false;
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

        this.cursor = new cursor(this.contextCursor, this.pen);
        this.cursor.currentTool = "DRAW";

        this.selectionManager = new SelectionManager(this.drawingdata);
        this.contextSelection.strokeStyle = "black";
        this.contextSelection.lineWidth = 1;
        this.contextSelection.setLineDash([5]);


        

        
        this.canvascontainer.scrollLeft = (( Canvasconstants.width - this.canvascontainer.clientWidth) / 2);
    
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
        if(this.pen.penDown)
        {
            if (this.toolbox.selectedtool == "DRAW") {
                this.drawCurrentStroke();
            }
            else if(this.toolbox.selectedtool == "LINE")
            {
                this.drawCurrentLine();
            }
        }
        
    }
    drawloopSelection() {
        //draws the static marquee around a selected object
        //dirty the selection if the pen is down and interacting with an object:
        if (this.pen.onCanvas && this.pen.penDown && this.cursor.interacting) {
            this.selectionManager.fresh = false;
        }
            
            

        if (this.selectionManager.fresh == false) {
            this.contextSelection.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            if (this.selectionManager.currentlySelected != null) {
                let box = this.selectionManager.currentlySelected.getCachedBoundingBox();
                this.contextSelection.setLineDash([0]);
                this.contextSelection.beginPath();
                this.contextSelection.moveTo(box.originx, box.originy); //start at topleft
                this.contextSelection.lineTo(box.maxX, box.originy);
                this.contextSelection.lineTo(box.maxX, box.maxY);
                this.contextSelection.lineTo(box.originx, box.maxY);
                this.contextSelection.lineTo(box.originx, box.originy);
                this.contextSelection.stroke();
                this.contextSelection.closePath();

                this.contextSelection.setLineDash([9]);
                this.contextSelection.strokeStyle = "white";
                this.contextSelection.beginPath();
                this.contextSelection.moveTo(box.originx, box.originy); //start at topleft
                this.contextSelection.lineTo(box.maxX, box.originy);
                this.contextSelection.lineTo(box.maxX, box.maxY);
                this.contextSelection.lineTo(box.originx, box.maxY);
                this.contextSelection.lineTo(box.originx, box.originy);
                this.contextSelection.stroke();
                this.contextSelection.closePath();


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
                                let vector = this.getCurrentStrokeVector();
                                let previewstroke = new Stemstroke();
                                this.selectionManager.currentlySelected.points.forEach(p => {
                                    previewstroke.points.push(new Stempoint(p.x + vector.x,p.y + vector.y));
                                });

                                this.contextSelection.beginPath();
                                this.contextSelection.moveTo(previewstroke.points[0].x,previewstroke.points[0].y);
                                previewstroke.points.forEach(p => {
                                    this.contextSelection.lineTo(p.x,p.y);
                                });
                                this.contextSelection.stroke();
                                this.contextSelection.closePath();
                            }
                            else if(this.cursor.selectmodifier == "NW")
                            {

                            }
                            else if(this.cursor.selectmodifier == "NE")
                            {

                            }

                        }
                    }
                }



                //draw the selection
                this.selectionManager.fresh = true;
            }
            else {

            }
        }
        //check if there is a currentselection
        //now check if its 'fresh'
        //now check if it has already been drawn
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
            this.contextDrawing.stroke();
            //now dump the buffer
            this.currentstrokebuffer.points = [];
        }
        this.contextDrawing.closePath();


        ///////////////
    }
    drawCurrentLine(){
        //uses the cursor layer coz its needs to preview
        if(this.currentstroke.points.length >1)
        {   
            this.contextInterface.clearRect(0,0,Canvasconstants.width,Canvasconstants.height);
            this.contextInterface.beginPath();
            this.contextInterface.moveTo(this.currentstroke.points[0].x,this.currentstroke.points[0].y);
            this.contextInterface.lineTo(this.currentstroke.points[this.currentstroke.points.length -1].x,this.currentstroke.points[this.currentstroke.points.length -1].y)
                     
            this.contextInterface.stroke();
            this.contextInterface.closePath();
        }
    }
    //when the user drag selects
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

        if (this.selectionManager.currentlySelected != null) //item is currently selected
        {
            if (this.pen.penDown) { //pen is down

                let p = new Stempoint(this.pen.X, this.pen.Y);
                p.timestamp = performance.now();
                p.press = this.pen.pressure;
                this.currentstrokebuffer.points.push(p); //strokes get pushed into buffer, and popped as they are rendered 

                this.currentstroke.points.push(p);
            }
            else {
                this.selectionManager.currentlySelected.UpdateBoundingBox("");
                let box = this.selectionManager.currentlySelected.getCachedBoundingBox();
                if (box.Intersects(this.pen.X, this.pen.Y)) {
                    //now check if its in one of the corners
                    this.cursor.selectmodifier = box.IntersectsCorner(this.pen.X, this.pen.Y);
                }
                else {
                    this.cursor.selectmodifier = "";
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
                if(this.toolbox.selectedtool == "ERASE")
                {
                    this.currentstroke.points.push(p);
                }
                if(this.toolbox.selectedtool == "LINE")
                {
                    this.currentstroke.points.push(p);
                   console.log(this.currentstroke.objecttype);
                   
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

            //check if there is already a selected object
            if (this.selectionManager.currentlySelected == null) {
                if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {
                    //todo multiselect
                }
                else {
                    this.selectionManager.selectObjectAtPoint(this.pen.X, this.pen.Y);
                }

            }
            else {
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

                            this.selectionManager.currentlySelected.UpdateBoundingBox("");
                            this.selectionManager.fresh = false;
                            this.updateDrawing();
                        }
                        else {
                            this.selectionManager.selectObjectAtPoint(this.pen.X, this.pen.Y);
                        }

                    }
                    else {

                    }
                }
                else {
                    if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {
                        //todo multiselect
                    }
                    else {
                        this.selectionManager.selectObjectAtPoint(this.pen.X, this.pen.Y);
                        
                    }
                }
            }
            this.currentstroke = null;
        }
        else if(this.toolbox.selectedtool == "ERASE"){            
            //is the stroke a line or a point
            if(this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength)
            {
                console.log("erase stroke");
                //line
            }
            else
            {
                //point
                let underpointerid = this.selectionManager.IDObjectAtPoint(this.currentstroke.points[this.currentstroke.points.length-1].x,this.currentstroke.points[this.currentstroke.points.length-1].y);
                //
                let indexunderpointer = this.selectionManager.indexAtID(underpointerid);
                this.undodata.push(this.drawingdata[indexunderpointer]);
                this.drawingdata.splice(indexunderpointer,1); //remove the entry from the array
                this.updateDrawing();
        
            }
        }
        else if(this.toolbox.selectedtool == "LINE")
        {
            this.currentstroke.UpdateBoundingBox("");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            
            this.drawingdata.push(this.currentstroke);
            
            this.updateDrawing();
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
        else if(this.toolbox.selectedtool == "ERASE"){
            this.toolbox.isDrawingObject = false;
            this.currentstroke = new Stemstroke();
            this.currentstrokebuffer = new Stemstroke();
            this.currentstroke.objecttype = this.toolbox.selectedtool;
            this.currentstroke.points.push(currentpoint); //select doesnt use buffer
        }
        else if(this.toolbox.selectedtool == "LINE")
        {
            this.toolbox.isDrawingObject = true;
            this.currentstroke = new Stemstroke();
            this.currentstrokebuffer = new Stemstroke();
            this.currentstroke.objecttype = this.toolbox.selectedtool;
            console.log(this.toolbox.selectedtool);
            console.log(this.currentstroke.objecttype);
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

        this.drawingdata.forEach(stroke => {
            if(stroke.objecttype == "DRAW")
            {
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
            else if(stroke.objecttype == "LINE")
            {
                this.contextDrawing.beginPath();
                this.contextDrawing.strokeStyle = stroke.strokecolour;
                this.contextDrawing.lineWidth = stroke.strokewidth;
                this.contextDrawing.moveTo(stroke.points[0].x,stroke.points[0].y);
                let lastpoint = stroke.points.length -1;
                this.contextDrawing.lineTo(stroke.points[lastpoint].x,stroke.points[lastpoint].y);
                this.contextDrawing.stroke();
                this.contextDrawing.closePath();
            }
           
        });
    }
    getCurrentStrokeVector(){        
        let output = new Vector();
        output.x = this.currentstroke.points[this.currentstroke.points.length -1].x - this.currentstroke.points[0].x;
        output.y = this.currentstroke.points[this.currentstroke.points.length -1].y - this.currentstroke.points[0].y;
        return output;
    }







}

/////////////////////////////////////////


class Vector{
    x:number;
    y:number;
}

class Canvasconstants {
    static width: number = 1500;
    static height: number = 1000;
    static multiselectMinimumLength: number = 20; //minimum length for a multiselection box to appear when dragging with the select tool
    static cornersize: number = 10;
}

class SelectionManager {
    currentSelectionID: String;
    currentlySelected: StemDrawnObject;
    currentlySelectedMulti: StemDrawnObject[];
    fresh: boolean;
    drawingData: StemDrawnObject[];
    //holds the currently selected drawnobject or multidrawnobject
    //keeps track of freshness    

    constructor(drawingData: StemDrawnObject[]) {
        this.drawingData = drawingData;
        this.currentlySelected = null;
        this.currentlySelectedMulti = null;
        this.fresh = false;
    }

    IDObjectAtPoint(x:number, y:number){
       
        let boxintersected: Array<StemDrawnObject> = new Array();
        this.drawingData.forEach(el => {

            debugger;
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
            // else if (el.objecttype == "RECTANGLE")//find all rectangles
            // {
            //     //get closest cardinal line N,S,E,W. Distance to that line
            //     let rectangle = el as StemRectangle;
            //     let distance = rectangle.MeasureDistanceToPoint(x, y);
            //     if (distance < closenessvalue) {
            //         indexofClosest = index;
            //         closenessvalue = distance;
            //     }

            // }
            // else if (el.objecttype == "CIRCLE")//find all circles  
            // {

            //     let circle = el as StemCircle;
            //     let distance = circle.MeasureDistanceToPoint(x, y);
            //     if (distance < closenessvalue) {
            //         closenessvalue = distance;
            //         indexofClosest = index;
            //     }
            // }
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
            else if(el.objecttype == "LINE")
            {
                console.log('stop');
                debugger;
                let  a_to_p = new Vector();
                let a_to_b = new Vector();

                //   a_to_p = [P.x - A.x, P.y - A.y]     # Storing vector A->P
                a_to_p.x = x - el.points[0].x;
                a_to_p.y = y - el.points[0].y

                                
                //   a_to_b = [B.x - A.x, B.y - A.y]     # Storing vector A->B
                a_to_b.x = el.points[el.points.length - 1].x;
                a_to_b.y = el.points[el.points.length - 1].y;

                //   atb2 = a_to_b[0]**2 + a_to_b[1]**2  # **2 means "squared"
                //                                       #   Basically finding the squared magnitude
                //                                       #   of a_to_b
                let atb2 = Math.pow(a_to_b.x,2) + Math.pow(a_to_b.y,2);

                //   atp_dot_atb = a_to_p[0]*a_to_b[0] + a_to_p[1]*a_to_b[1]
                //# The dot product of a_to_p and a_to_b
                let atp_dot_atb = Math.pow(a_to_b.x,2) + Math.pow(a_to_p.y,2);

                //   t = atp_dot_atb / atb2              # The normalized "distance" from a to
                //                                       #   your closest point
                let t = atp_dot_atb / atb2;
                
                let distance = t;
                if(distance < closenessvalue)
                {
                    closenessvalue = distance;
                    indexofClosest = index;
                }

                








//   return Point.new( :x => A.x + a_to_b[0]*t,
//                     :y => A.y + a_to_b[1]*t )
//                                       # Add the distance to A, moving
//                                       #   towards B

// end
            }
            index++;
        });

        if (closenessvalue < 99999999999999999) //check that it actually found something
        {
            return boxintersected[indexofClosest].strokeid;
        }
        else {
            return null;            
        }  
    }

    indexAtID(id:string)
    {
        for(let i = 0; i < this.drawingData.length; i++)
        {
            if(this.drawingData[i].strokeid == id)
            {
                return i;
            }
        }
        return null;
    }

    selectObjectAtPoint(x: number, y: number) {

        this.currentlySelectedMulti = null;
        let idofselected = this.IDObjectAtPoint(x,y);
        console.log(idofselected);
        let indexofid = -1;

        for(let i = 0; i < this.drawingData.length; i++)
        {
            if(this.drawingData[i].strokeid == idofselected)
            {
                indexofid = i;
            }
        }
            
        
        if(indexofid != -1)
        {
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
        else
        { //nothing was selected
            this.currentlySelected = null;
            this.currentSelectionID = "";
            this.fresh = false;
        }


    }
    selectMultiObject(strokedata: Stemstroke) {
        this.currentlySelected = null;
    }



}




