var Stemcanvas = /** @class */ (function () {
    function Stemcanvas(id) {
        this.canvasscrollx = 0;
        this.canvascrolly = 0;
        this.menuImage = new Image();
        this.touchcount = 0;
        this.menuImage.src = "media/cursors/c_Menu.png";
        this.drawingdata = new Array();
        this.undodata = new Array();
        this.redodata = new Array();
        this.debug = document.getElementById("debug");
        this.canvasbackground = document.getElementById("canvasbackground");
        this.canvascontainer = document.getElementById("canvas-scroll-container");
        this.drawingcanvas = document.getElementById(id);
        this.selectioncanvas = document.getElementById("selectioncanvas");
        this.cursorcanvas = document.getElementById("cursorcanvas");
        this.interfacecanvas = document.getElementById("interfacecanvas");
        this.debugcanvas = document.getElementById("debugcanvas");
        this.initialisecanvas();
        requestAnimationFrame(this.mainloop.bind(this));
    }
    Stemcanvas.prototype.initialisecanvas = function () {
        var _this = this;
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
        this.eventel.addEventListener(toolboxevents.toolchanged, function () {
            _this.cursor.currentTool = _this.toolbox.selectedtool;
            _this.selectionManager.currentSelectionID = "";
            _this.selectionManager.currentlySelected = null;
            _this.selectionManager.fresh = false;
            _this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
        });
        this.toolbox.selectedtool = "DRAW";
        this.toolbox.selectedDrawSize = 5;
        //canvas interaction events
        this.drawingcanvas.addEventListener("pointerenter", this.PointerEnterEvent.bind(this));
        this.drawingcanvas.addEventListener("pointermove", this.PointerMoveEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerdown", this.PointerDownEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerup", this.PointerUpEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerleave", this.PointerLeaveEvent.bind(this));
        this.canvascontainer.addEventListener('scroll', function (e) {
            _this.canvascrolly = _this.canvascontainer.scrollTop;
            _this.canvasscrollx = _this.canvascontainer.scrollLeft;
        });
        document.getElementById("btnConfirmClear").addEventListener("click", function () {
            _this.clearcanvas();
        });
        document.getElementById("btnUndo").addEventListener("click", function () {
            _this.undo();
        });
        document.getElementById("btnRedo").addEventListener("click", function () {
            _this.redo();
        });
        document.getElementById("btnCopy").addEventListener("click", function () {
            _this.copy();
        });
        document.getElementById("btnPaste").addEventListener("click", function () {
            _this.paste();
        });
        this.cursor = new cursor(this.contextCursor, this.pen);
        this.cursor.currentTool = "DRAW";
        this.selectionManager = new SelectionManager(this.drawingdata, this.contextDebug);
        this.contextSelection.strokeStyle = "black";
        this.contextSelection.lineWidth = 1;
        this.contextSelection.setLineDash([5]);
        this.canvascontainer.scrollLeft = ((Canvasconstants.width - this.canvascontainer.clientWidth) / 2);
    };
    Stemcanvas.prototype.clearcanvas = function () {
        this.drawingdata = new Array();
        this.updateDrawing();
    };
    Stemcanvas.prototype.undo = function () {
    };
    Stemcanvas.prototype.redo = function () {
    };
    Stemcanvas.prototype.copy = function () {
        console.log("copy");
        if (this.selectionManager.currentlySelected != null) {
            this.selectionManager.copySelected();
            //@ts-ignore 
            M.toast({ html: 'Copied' });
        }
        else {
            //@ts-ignore 
            M.toast({ html: 'Select object first' });
        }
    };
    Stemcanvas.prototype.paste = function () {
        this.selectionManager.pasteFromClipboard();
        this.updateDrawing();
        this.debugtext(this.drawingdata.length);
    };
    //gets called by animation updates:
    Stemcanvas.prototype.mainloop = function () {
        this.calculationloop();
        this.drawloop(); //draws to canvas
        requestAnimationFrame(this.mainloop.bind(this));
    };
    //handles object detection when using select tool
    Stemcanvas.prototype.calculationloop = function () {
        if (this.toolbox.selectedtool == "SELECT") {
            if (this.pen.onCanvas) {
            }
        }
    };
    Stemcanvas.prototype.drawloop = function () {
        this.drawloopStroke();
        this.drawloopSelection();
        this.drawContextMenu();
        this.drawloopCursor();
    };
    Stemcanvas.prototype.drawloopCursor = function () {
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
    };
    Stemcanvas.prototype.drawloopStroke = function () {
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
            if (this.toolbox.selectedtool == "LINE") {
                // this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            }
        }
    };
    Stemcanvas.prototype.drawloopSelection = function () {
        var _this = this;
        //draws the static marquee around a selected object
        //dirty the selection if the pen is down and interacting with an object:
        if (this.pen.onCanvas && this.pen.penDown && this.cursor.interacting) {
            this.selectionManager.fresh = false;
        }
        if (this.selectionManager.fresh == false) {
            this.contextSelection.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            if (this.selectionManager.currentlySelected != null) {
                //draw the selected object bounds - black and white lines   
                var box = this.selectionManager.currentlySelected.getCachedBoundingBox();
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
                this.contextSelection.fillStyle = "white";
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
                                var vector_1 = this.getCurrentStrokeVector();
                                var previewstroke_1 = new Stemstroke();
                                this.selectionManager.currentlySelected.points.forEach(function (p) {
                                    previewstroke_1.points.push(new Stempoint(p.x + vector_1.x, p.y + vector_1.y));
                                });
                                if (this.selectionManager.currentlySelected.objecttype == "DRAW") {
                                    this.contextSelection.beginPath();
                                    this.contextSelection.moveTo(previewstroke_1.points[0].x, previewstroke_1.points[0].y);
                                    previewstroke_1.points.forEach(function (p) {
                                        _this.contextSelection.lineTo(p.x, p.y);
                                    });
                                    this.contextSelection.stroke();
                                    this.contextSelection.closePath();
                                }
                                else if (this.selectionManager.currentlySelected.objecttype == "LINE") {
                                    this.contextSelection.beginPath();
                                    this.contextSelection.moveTo(previewstroke_1.points[0].x, previewstroke_1.points[0].y);
                                    this.contextSelection.lineTo(previewstroke_1.points[previewstroke_1.points.length - 1].x, previewstroke_1.points[previewstroke_1.points.length - 1].y);
                                    this.contextSelection.stroke();
                                    this.contextSelection.closePath();
                                }
                                else if (this.selectionManager.currentlySelected.objecttype == "RECTANGLE") {
                                    previewstroke_1.objecttype = "RECTANGLE";
                                    previewstroke_1.UpdateBoundingBox("");
                                    var previewbox = previewstroke_1.getCachedBoundingBox();
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
                                    previewstroke_1.objecttype = "CIRCLE";
                                    previewstroke_1.UpdateBoundingBox("");
                                    var previewbox = previewstroke_1.getCachedBoundingBox();
                                    this.contextSelection.beginPath();
                                    //
                                    var radius = previewstroke_1.getPixelLength();
                                    var midx = (previewbox.maxX + previewbox.originx) / 2;
                                    var midy = (previewbox.maxY + previewbox.originy) / 2;
                                    this.contextSelection.arc(midx, midy, radius, 0, 3.16 * 2);
                                    this.contextSelection.stroke();
                                    this.contextSelection.closePath();
                                    //
                                }
                            }
                            else if (this.cursor.selectmodifier.length == 2) //check if its any of the resize modifiers (NE,NW,SW,SE)
                             {
                                var resizevector = this.getCurrentStrokeVector();
                                var previewstroke = new Stemstroke();
                                previewstroke = this.resizeStroke(this.selectionManager.currentlySelected, resizevector, this.cursor.selectmodifier);
                                var selectedtype = this.selectionManager.currentlySelected.objecttype;
                                if (selectedtype == "DRAW") {
                                    this.contextSelection.beginPath();
                                    this.contextSelection.moveTo(previewstroke.points[0].x, previewstroke.points[0].y);
                                    previewstroke.points.forEach(function (p) {
                                        _this.contextSelection.lineTo(p.x, p.y);
                                    });
                                    this.contextSelection.stroke();
                                    this.contextSelection.closePath();
                                }
                                else if (selectedtype == "CIRCLE") {
                                    if (previewstroke.points.length > 1) {
                                        previewstroke.objecttype = "CIRCLE";
                                        previewstroke.UpdateBoundingBox("");
                                        var previewbox = previewstroke.getCachedBoundingBox();
                                        this.contextSelection.beginPath();
                                        var radius = previewstroke.getPixelLength();
                                        var midx = (previewbox.maxX + previewbox.originx) / 2;
                                        var midy = (previewbox.maxY + previewbox.originy) / 2;
                                        this.contextSelection.arc(midx, midy, radius, 0, 3.16 * 2);
                                        this.contextSelection.stroke();
                                        this.contextSelection.closePath();
                                    }
                                }
                                else if (selectedtype == "LINE") {
                                    if (previewstroke.points.length > 1) {
                                        var first = previewstroke.points[0];
                                        var last = previewstroke.points[previewstroke.points.length - 1];
                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(first.x, first.y);
                                        this.contextSelection.lineTo(last.x, last.y);
                                        this.contextSelection.stroke();
                                        this.contextSelection.closePath();
                                    }
                                }
                                else if (selectedtype == "RECTANGLE") {
                                    if (previewstroke.points.length > 1) {
                                        previewstroke.UpdateBoundingBox("");
                                        var first = previewstroke.points[0];
                                        var last = previewstroke.points[previewstroke.points.length - 1];
                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(first.x, first.y);
                                        this.contextSelection.lineTo(last.x, first.y);
                                        this.contextSelection.lineTo(last.x, last.y);
                                        this.contextSelection.lineTo(first.x, last.y);
                                        this.contextSelection.lineTo(first.x, first.y);
                                        this.contextSelection.stroke();
                                        this.contextSelection.closePath();
                                        this.contextSelection.stroke();
                                        this.contextSelection.closePath();
                                    }
                                }
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
    };
    Stemcanvas.prototype.drawCurrentStroke = function () {
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
            for (var i = 0; i < this.currentstrokebuffer.points.length; i++) {
                this.contextDrawing.lineTo(this.currentstrokebuffer.points[i].x, this.currentstrokebuffer.points[i].y);
                this.currentstroke.points.push(this.currentstrokebuffer.points[i]);
            }
            this.contextDrawing.stroke();
            //now dump the buffer
            this.currentstrokebuffer.points = [];
        }
        this.contextDrawing.closePath();
        ///////////////
    };
    Stemcanvas.prototype.drawCurrentLine = function () {
        // uses the context layer to preview
        if (this.currentstroke.points.length > 1) {
            if (!this.cursor.interacting) {
                this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
                this.contextInterface.beginPath();
                this.contextInterface.moveTo(this.currentstroke.points[0].x, this.currentstroke.points[0].y);
                this.contextInterface.lineTo(this.currentstroke.points[this.currentstroke.points.length - 1].x, this.currentstroke.points[this.currentstroke.points.length - 1].y);
                this.contextInterface.stroke();
                this.contextInterface.closePath();
            }
        }
    };
    Stemcanvas.prototype.drawCurrentRectangle = function () {
        // uses the context layer to preview
        if (this.currentstroke.points.length > 1) {
            this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            this.contextInterface.beginPath();
            this.currentstroke.UpdateBoundingBox("");
            var box = this.currentstroke.getCachedBoundingBox();
            this.contextInterface.moveTo(box.originx, box.originy);
            this.contextInterface.lineTo(box.maxX, box.originy);
            this.contextInterface.lineTo(box.maxX, box.maxY);
            this.contextInterface.lineTo(box.originx, box.maxY);
            this.contextInterface.lineTo(box.originx, box.originy);
            this.contextInterface.stroke();
            this.contextInterface.closePath();
        }
    };
    Stemcanvas.prototype.drawCurrentCircle = function () {
        if (this.currentstroke.points.length > 1) {
            this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            this.contextInterface.beginPath();
            this.currentstroke.UpdateBoundingBox("");
            var box = this.currentstroke.getCachedBoundingBox();
            var radius = this.currentstroke.getPixelLength();
            var midx = (box.maxX + box.originx) / 2;
            var midy = (box.maxY + box.originy) / 2;
            this.contextInterface.arc(midx, midy, radius, 0, 3.16 * 2);
            this.contextInterface.stroke();
            this.contextInterface.closePath();
        }
    };
    Stemcanvas.prototype.drawContextMenu = function () {
        if (this.selectionManager.currentlySelected != null) {
            var box = this.selectionManager.currentlySelected.cachedBoundingBox;
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
    };
    Stemcanvas.prototype.drawFullContextMenu = function () {
    };
    //when the user drag selects (live while selecting)
    Stemcanvas.prototype.renderSelectionMarquee = function () {
        var first = this.currentstroke.points[0];
        var last = this.currentstroke.points[this.currentstroke.points.length - 1];
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
    };
    //canvas interaction events
    Stemcanvas.prototype.PointerEnterEvent = function (e) {
        this.pen.onCanvas = true;
        // this.pen.X = e.pageX - this.drawingcanvas.offsetLeft + scrollX
        // this.pen.pressure = e.pressure;
        // this.pendetails.X = e.pageX - this.canvas.offsetLeft + this.pendetails.scrollx;
        // this.pendetails.Y = e.pageY - this.canvas.offsetTop + this.pendetails.scrolly;
        // this.pendetails.pressure = e.pressure;
        // this.cursonOnCanvas = true;
        //todo handle clickdragging off the canvas and then returning in an unclicking state        
    };
    Stemcanvas.prototype.PointerMoveEvent = function (e) {
        this.pen.X = e.pageX - (this.canvascontainer.offsetLeft) + this.canvasscrollx;
        this.pen.Y = e.pageY - (this.canvascontainer.offsetTop) + this.canvascrolly;
        this.pen.pressure = e.pressure;
        if (this.touchcount == 2) {
            this.touchscrolltracker.points.push(new Stempoint(this.pen.X, this.pen.Y));
            var movement = new Vector(this.touchscrolltracker.points[this.touchscrolltracker.points.length - 1].x - this.touchscrolltracker.points[0].x, this.touchscrolltracker.points[this.touchscrolltracker.points.length - 1].y - this.touchscrolltracker.points[0].y);
            this.debugtext(this.canvascontainer.scrollLeft);
            this.debugtext(movement.x);
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
                var p = new Stempoint(this.pen.X, this.pen.Y);
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
                var box = this.selectionManager.currentlySelected.getCachedBoundingBox();
                if (box.Intersects(this.pen.X, this.pen.Y)) {
                    //now check if its in one of the corners
                    this.cursor.selectmodifier = box.IntersectsCorner(this.pen.X, this.pen.Y);
                    console.log(this.cursor.selectmodifier);
                }
                else {
                    this.cursor.selectmodifier = "";
                }
                //now check if the box intersects the context menu (need to think about how it will stop the selection process if touch)
                var contextmenubox = new StemstrokeBox();
                contextmenubox.originx = ((box.originx + box.maxX) / 2) - (Canvasconstants.cursorsize / 2);
                contextmenubox.maxX = contextmenubox.originx + Canvasconstants.cursorsize;
                contextmenubox.originy = box.originy - Canvasconstants.cursorsize;
                contextmenubox.maxY = contextmenubox.originy + Canvasconstants.cursorsize;
                if (contextmenubox.Intersects(this.pen.X, this.pen.Y, 0)) {
                    //this.selectionManager.debugCanvasRectangle(contextmenubox.originx, contextmenubox.originy, contextmenubox.maxX, contextmenubox.maxY);
                }
            }
        }
        else {
            if (this.pen.penDown) {
                var p = new Stempoint(this.pen.X, this.pen.Y);
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
    };
    Stemcanvas.prototype.PointerUpEvent = function (e) {
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
            //experiment            
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
                            var x_1 = this.currentstroke.points[this.currentstroke.points.length - 1].x - this.currentstroke.points[0].x;
                            var y_1 = this.currentstroke.points[this.currentstroke.points.length - 1].y - this.currentstroke.points[0].y;
                            this.currentstroke.UpdateBoundingBox("");
                            //move all points in stroke:
                            this.selectionManager.currentlySelected.points.forEach(function (p) {
                                p.x += x_1;
                                p.y += y_1;
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
                        if (this.cursor.selectmodifier.length == 2) {
                        }
                        var resizevector = this.getCurrentStrokeVector();
                        var previewstroke = new Stemstroke();
                        previewstroke = this.resizeStroke(this.selectionManager.currentlySelected, resizevector, this.cursor.selectmodifier);
                        this.debugtext("preview length: ".concat(previewstroke.points.length, " \r\n selectedlength: ").concat(this.selectionManager.currentlySelected.points.length));
                        for (var i = 0; i < this.selectionManager.currentlySelected.points.length; i++) {
                            this.selectionManager.currentlySelected.points[i].x = previewstroke.points[i].x;
                            this.selectionManager.currentlySelected.points[i].y = previewstroke.points[i].y;
                        }
                        this.selectionManager.currentlySelected.UpdateBoundingBox("");
                        this.selectionManager.fresh = false;
                        this.updateDrawing();
                        ///////////////
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
        else if (this.toolbox.selectedtool == "ERASE") {
            //is the stroke a line or a point
            if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {
                //line
            }
            else {
                //point
                var underpointerid = this.selectionManager.IDObjectAtPoint(this.currentstroke.points[this.currentstroke.points.length - 1].x, this.currentstroke.points[this.currentstroke.points.length - 1].y);
                //
                var indexunderpointer = this.selectionManager.indexAtID(underpointerid);
                this.undodata.push(this.drawingdata[indexunderpointer]);
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
    };
    Stemcanvas.prototype.PointerDownEvent = function (e) {
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
        var currentpoint = new Stempoint(this.pen.X, this.pen.Y);
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
    };
    Stemcanvas.prototype.PointerLeaveEvent = function (e) {
        this.pen.onCanvas = false;
    };
    Stemcanvas.prototype.crystaliseDrawing = function () {
        var _this = this;
        createImageBitmap(this.drawingcanvas).then(function (bmp) { _this.flatimage = bmp; });
    };
    Stemcanvas.prototype.updateDrawing = function () {
        var _this = this;
        //clear drawingcanvas:
        this.contextDrawing.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
        if (this.drawingdata.length < 1) {
            return;
        }
        for (var i = 0; i < this.drawingdata.length - 1; i++) {
            if (this.drawingdata[i].points.length < 2) {
                this.drawingdata.splice(i, 1); //remove the entry from the array
            }
        }
        this.drawingdata.forEach(function (stroke) {
            if (stroke.objecttype == "DRAW") {
                _this.contextDrawing.beginPath();
                _this.contextDrawing.strokeStyle = stroke.strokecolour;
                _this.contextDrawing.lineWidth = stroke.strokewidth;
                _this.contextDrawing.moveTo(stroke.points[0].x, stroke.points[0].y);
                stroke.points.forEach(function (p) {
                    _this.contextDrawing.lineTo(p.x, p.y);
                });
                _this.contextDrawing.stroke();
                _this.contextDrawing.closePath();
            }
            else if (stroke.objecttype == "LINE") {
                _this.contextDrawing.beginPath();
                _this.contextDrawing.strokeStyle = stroke.strokecolour;
                _this.contextDrawing.lineWidth = stroke.strokewidth;
                _this.contextDrawing.moveTo(stroke.points[0].x, stroke.points[0].y);
                var lastpoint = stroke.points.length - 1;
                _this.contextDrawing.lineTo(stroke.points[lastpoint].x, stroke.points[lastpoint].y);
                _this.contextDrawing.stroke();
                _this.contextDrawing.closePath();
            }
            else if (stroke.objecttype == "RECTANGLE") {
                var box = stroke.getCachedBoundingBox();
                _this.contextDrawing.beginPath();
                _this.contextDrawing.strokeStyle = stroke.strokecolour;
                _this.contextDrawing.lineWidth = stroke.strokewidth;
                _this.contextDrawing.moveTo(box.originx, box.originy);
                _this.contextDrawing.lineTo(box.maxX, box.originy);
                _this.contextDrawing.lineTo(box.maxX, box.maxY);
                _this.contextDrawing.lineTo(box.originx, box.maxY);
                _this.contextDrawing.lineTo(box.originx, box.originy);
                _this.contextDrawing.stroke();
                _this.contextDrawing.closePath();
            }
            else if (stroke.objecttype == "CIRCLE") {
                var box = stroke.getCachedBoundingBox();
                _this.contextDrawing.beginPath();
                _this.contextDrawing.strokeStyle = stroke.strokecolour;
                _this.contextDrawing.lineWidth = stroke.strokewidth;
                var radius = stroke.getPixelLength();
                var midx = (box.maxX + box.originx) / 2;
                var midy = (box.maxY + box.originy) / 2;
                _this.contextDrawing.arc(midx, midy, radius, 0, 3.16 * 2);
                _this.contextDrawing.stroke();
                _this.contextDrawing.closePath();
            }
        });
    };
    Stemcanvas.prototype.getCurrentStrokeVector = function () {
        var output = new Vector(this.currentstroke.points[this.currentstroke.points.length - 1].x - this.currentstroke.points[0].x, this.currentstroke.points[this.currentstroke.points.length - 1].y - this.currentstroke.points[0].y);
        return output;
    };
    Stemcanvas.prototype.resizePoint = function (inputx, inputy, a, b, c, d) {
        // how to use: currentpoint.x - (strokebox.originx), currentpoint.y - (strokebox.originy), xfactor, 0, 0, yfactor, 0, 0
        // will resize based from origin
        var outputx = ((a * inputx) + (b * inputx));
        var outputy = ((c * inputy) + (d * inputy));
        return new Stempoint(outputx, outputy);
    };
    Stemcanvas.prototype.resizeStroke = function (inputstroke, resizevector, modifier) {
        var _this = this;
        inputstroke.UpdateBoundingBox("");
        var strokebox = inputstroke.getCachedBoundingBox();
        //takes input stroke and return
        var outputstroke = new Stemstroke();
        if (modifier == "NW") {
            var resizefactor_1 = new Vector(1 + ((resizevector.x / (strokebox.maxX - strokebox.originx)) * -1), 1 + ((resizevector.y / (strokebox.maxY - strokebox.originy)) * -1));
            inputstroke.points.forEach(function (p) {
                var resizedpoint = _this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor_1.x, 0, 0, resizefactor_1.y);
                resizedpoint.x += strokebox.originx + resizevector.x;
                resizedpoint.y += strokebox.originy + resizevector.y;
                outputstroke.points.push(resizedpoint);
            });
        }
        else if (modifier == "NE") {
            var resizefactor_2 = new Vector(1 + (resizevector.x / (strokebox.maxX - strokebox.originx)), 1 + ((resizevector.y / (strokebox.maxY - strokebox.originy)) * -1));
            inputstroke.points.forEach(function (p) {
                var resizedpoint = _this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor_2.x, 0, 0, resizefactor_2.y);
                resizedpoint.x += strokebox.originx;
                resizedpoint.y += strokebox.originy + resizevector.y;
                outputstroke.points.push(resizedpoint);
            });
        }
        else if (modifier == "SE") {
            var resizefactor_3 = new Vector(1 + (resizevector.x / (strokebox.maxX - strokebox.originx)), 1 + (resizevector.y / (strokebox.maxY - strokebox.originy)));
            inputstroke.points.forEach(function (p) {
                var resizedpoint = _this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor_3.x, 0, 0, resizefactor_3.y);
                resizedpoint.x += strokebox.originx;
                resizedpoint.y += strokebox.originy;
                outputstroke.points.push(resizedpoint);
            });
        }
        else if (modifier == "SW") {
            var resizefactor_4 = new Vector(1 + ((resizevector.x / (strokebox.maxX - strokebox.originx)) * -1), 1 + (resizevector.y / (strokebox.maxY - strokebox.originy)));
            inputstroke.points.forEach(function (p) {
                var resizedpoint = _this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor_4.x, 0, 0, resizefactor_4.y);
                resizedpoint.x += strokebox.originx + resizevector.x;
                resizedpoint.y += strokebox.originy;
                outputstroke.points.push(resizedpoint);
            });
        }
        return outputstroke;
    };
    Stemcanvas.prototype.debugtext = function (input) {
        this.debug.innerText = input;
    };
    return Stemcanvas;
}());
/////////////////////////////////////////
var Vector = /** @class */ (function () {
    function Vector(x, y) {
        this.x = x;
        this.y = y;
    }
    return Vector;
}());
var Canvasconstants = /** @class */ (function () {
    function Canvasconstants() {
    }
    Canvasconstants.width = 1500;
    Canvasconstants.height = 1000;
    Canvasconstants.multiselectMinimumLength = 20; //minimum length for a multiselection box to appear when dragging with the select tool
    Canvasconstants.cornersize = 10;
    Canvasconstants.cursorsize = 38;
    return Canvasconstants;
}());
var SelectionManager = /** @class */ (function () {
    //holds the currently selected drawnobject or multidrawnobject
    //keeps track of freshness    
    function SelectionManager(drawingData, debug) {
        this.contextfresh = true;
        this.showFullContextMenu = false;
        this.drawingData = drawingData;
        this.currentlySelected = null;
        this.currentlySelectedMulti = null;
        this.fresh = false;
        this.debug = debug;
    }
    SelectionManager.prototype.IDObjectAtPoint = function (x, y) {
        var _this = this;
        var boxintersected = new Array();
        this.drawingData.forEach(function (el) {
            el.UpdateBoundingBox("");
            if (el.getCachedBoundingBox().Intersects(x, y)) {
                boxintersected.push(el);
            }
        });
        if (boxintersected.length == 0) {
            this.currentlySelected = null;
            this.fresh = false; //selected nothing
        }
        var indexofClosest = 0;
        var closenessvalue = 99999999999999999;
        var index = 0;
        //consider doing this from top to bottom?
        boxintersected.forEach(function (el) {
            if (el.objecttype == "DRAW") //todo what are we checking for here agaain? does js have enums?
             {
                //search all points, distance to nearest point (could maybe skip every second point to speed up?)
                el.points.forEach(function (point) {
                    var distance = Math.sqrt(Math.pow(Math.abs(point.x - x), 2) + Math.pow(Math.abs(point.y - y), 2));
                    if (distance < closenessvalue) {
                        closenessvalue = distance;
                        indexofClosest = index;
                    }
                });
            }
            else if (el.objecttype == "RECTANGLE") {
                var box = el.getCachedBoundingBox();
                var xoriginx = Math.abs(x - box.originx);
                var xmaxx = Math.abs(x - box.maxX);
                var yoriginy = Math.abs(y - box.originy);
                var ymaxx = Math.abs(y - box.maxY);
                var distance = Math.min(xoriginx, xmaxx, yoriginy, ymaxx); //get the closest distance to all 4 walls
                if (distance < closenessvalue) {
                    indexofClosest = index;
                    closenessvalue = distance;
                }
            }
            // else if (el.objecttype == "RECTANGLE")//find all rectangles
            // {
            //     
            // }
            else if (el.objecttype == "CIRCLE") //find all circles  
             {
                var actualdistance = null;
                var box = el.getCachedBoundingBox();
                el.radius = el.getPixelLength();
                var centerx = (box.originx + box.maxX) / 2;
                var centery = (box.originy + box.maxY) / 2;
                var distancetocenter = _this.getDistanceBetweenTwoPoints(new Vector(x, y), new Vector(centerx, centery));
                if (distancetocenter < el.radius) //check if click is inside the circle
                 {
                    actualdistance = el.radius - distancetocenter;
                }
                else {
                    actualdistance = distancetocenter - el.radius;
                }
                var distance = actualdistance;
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
                var first = el.getFirstPoint();
                var last = el.getLastPoint();
                var a = new Vector(first.x, first.y); //start point of line
                var b = new Vector(last.x, last.y); //end point of line
                var distance = _this.getDistanceOfPointToLine(a, b, new Vector(x, y));
                if (distance < closenessvalue) {
                    closenessvalue = distance;
                    indexofClosest = index;
                }
            }
            index++;
        });
        if (closenessvalue < 99999999999999999) //check that it actually found something
         {
            console.log("closeness = " + closenessvalue);
            return boxintersected[indexofClosest].strokeid;
        }
        else {
            this.fresh = false;
            return null;
        }
    };
    SelectionManager.prototype.indexAtID = function (id) {
        for (var i = 0; i < this.drawingData.length; i++) {
            if (this.drawingData[i].strokeid == id) {
                return i;
            }
        }
        return null;
    };
    ///A to B is the line, P is the point
    SelectionManager.prototype.getDistanceOfPointToLine = function (a, b, p) {
        var x = p.x;
        var y = p.y;
        var x1 = a.x;
        var x2 = b.x;
        var y1 = a.y;
        var y2 = b.y;
        var A = x - x1;
        var B = y - y1;
        var C = x2 - x1;
        var D = y2 - y1;
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
    };
    SelectionManager.prototype.getDistanceBetweenTwoPoints = function (first, second) {
        var a = first.x - second.x;
        var b = first.y - second.y;
        var distance = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
        return distance;
    };
    SelectionManager.prototype.selectObjectAtPoint = function (x, y) {
        this.currentlySelectedMulti = null;
        var idofselected = this.IDObjectAtPoint(x, y);
        var indexofid = -1;
        for (var i = 0; i < this.drawingData.length; i++) {
            if (this.drawingData[i].strokeid == idofselected) {
                indexofid = i;
            }
        }
        if (indexofid != -1) {
            var selected = this.drawingData[indexofid];
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
    };
    SelectionManager.prototype.selectMultiObject = function (strokedata) {
        this.currentlySelected = null;
    };
    SelectionManager.prototype.copySelected = function () {
        var _this = this;
        this.clipboard = new StemDrawnObject();
        var copytime = performance.now();
        this.currentlySelected.points.forEach(function (p) {
            var np = Object.create(new Stempoint(p.x + 20, p.y + 20));
            np.press = p.press;
            np.timestamp = copytime; //
            _this.clipboard.points.push(np);
        });
        this.clipboard.objecttype = this.currentlySelected.objecttype;
        this.clipboard.strokecolour = this.currentlySelected.strokecolour;
        this.clipboard.strokewidth = this.currentlySelected.strokewidth;
        this.clipboard.strokeid = helper.getGUID();
        this.clipboard.copyof = this.currentlySelected.strokeid;
    };
    SelectionManager.prototype.pasteFromClipboard = function () {
        console.log(this.drawingData.length);
        if (this.clipboard != null) {
            //orig
            this.drawingData.push(this.clipboard);
            this.currentlySelected = null;
            this.fresh = false;
        }
        else {
            //@ts-ignore 
            M.toast({ html: 'Copy object first' });
        }
    };
    SelectionManager.prototype.debugCanvasPoint = function (x, y) {
        this.debug.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
        this.debug.strokeStyle = "Red";
        this.debug.lineWidth = 4;
        this.debug.beginPath();
        this.debug.moveTo(0, 0);
        this.debug.lineTo(x, y);
        this.debug.stroke();
        this.debug.closePath();
    };
    SelectionManager.prototype.debugCanvasRectangle = function (minx, miny, maxx, maxy) {
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
        console.log("why isnt this showing?");
    };
    return SelectionManager;
}());
//# sourceMappingURL=stemcanvas.js.map