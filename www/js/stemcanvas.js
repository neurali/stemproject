var Stemcanvas = /** @class */ (function () {
    function Stemcanvas(id) {
        this.canvasscrollx = 0;
        this.canvascrolly = 0;
        this.menuImage = new Image();
        this.touchcount = 0;
        this.observation = "false"; //this will get set if the question starts from the observation page
        //session info for file download:
        //session start time clock
        this.starttimeclock = "";
        //session start time performance
        this.starttimeperf = "";
        //session end time clock
        this.endtimeclock = "";
        this.multierasing = false;
        this.multierasedstrokes = new Array();
        this.multierasedindexs = [];
        var path = window.location.pathname;
        var page = path.split("/").pop();
        if (page == "sandbox.html") {
            sessionStorage.setItem("sandbox", "pass");
        }
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
        var regex = /[a-zA-Z][0-9]+_[a-zA-Z][a-zA-Z]/i;
        this.participant = sessionStorage.getItem("token");
        if (regex.test(this.participant)) {
            //get values from the participant token
            this.taskset = "longitudinal";
            debugger;
            var split = this.participant.charAt(2); //A == Apple W== Wacom
            var last = this.participant.charAt(this.participant.length - 1);
            var secondlast = this.participant.charAt(this.participant.length - 2);
            if (secondlast == "A") {
                this.devicetype = "iPad";
            }
            else if (secondlast == "W") {
                this.devicetype = "Wacom";
            }
            else {
                this.devicetype = "unknowntoken";
            }
        }
        else {
            var lethrough = sessionStorage.getItem("sandbox");
            if (lethrough == "pass") {
            }
            else //else they are accessing from the longitudinal without a token
             {
                //so send them back to the index page with get parameter to display a message "Please enter a valid token to continue"
                window.location.href = "index.html?q=missingtoken";
            }
        }
        var sessioninfo = document.getElementById("sessioninfo");
        var attTasknumber = sessioninfo.attributes.getNamedItem("data-tasknumber");
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
        this.menuImage.src = "media/cursors/c_Menu.png";
        this.drawingdata = new Array();
        this.canvasbackground = document.getElementById("canvasbackground");
        this.canvascontainer = document.getElementById("canvas-scroll-container");
        this.drawingcanvas = document.getElementById(id);
        this.selectioncanvas = document.getElementById("selectioncanvas");
        this.cursorcanvas = document.getElementById("cursorcanvas");
        this.interfacecanvas = document.getElementById("interfacecanvas");
        this.debugcanvas = document.getElementById("debugcanvas");
        this.debug = document.getElementById("debug");
        this.initialisecanvas();
        this.undoredo = new StateManager(this.drawingdata);
        this.startTimer();
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
        this.contextCursor.fillStyle = "black";
        //create event element
        this.eventel = document.createElement("a");
        this.eventel.setAttribute("type", "hidden");
        this.eventel.id = "eventel";
        this.drawingcanvas.appendChild(this.eventel);
        this.toolbox = new Toolbox(this.eventel);
        this.eventel.addEventListener(toolboxevents.toolchanged, function () {
            console.log("toolchanged");
            _this.cursor.currentTool = _this.toolbox.selectedtool;
            _this.selectionManager.currentSelectionID = "";
            _this.selectionManager.currentlySelected = null;
            _this.selectionManager.FlushSelection();
            _this.selectionManager.fresh = false;
            _this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            _this.touchcount = 0; //reset touch count (as a quick fix)
        });
        this.eventel.addEventListener(toolboxevents.sizechanged, function () {
            console.log("sizechanged");
            var size = _this.toolbox.selectedDrawSize;
            if (_this.selectionManager.currentlySelected != null) {
                var singlewidthundo = new UndoAction(UndoActionTypes.widthsingle);
                singlewidthundo.setWidthSingle(_this.selectionManager.currentlySelected, _this.selectionManager.currentlySelected.strokewidth, size);
                _this.selectionManager.currentlySelected.strokewidth = size;
                _this.undoredo.save(singlewidthundo);
            }
            else if (_this.selectionManager.currentlySelectedMulti != null) {
                var previouswidths = new Array();
                for (var i = 0; i < _this.selectionManager.currentlySelectedMulti.length; i++) {
                    previouswidths.push(_this.selectionManager.currentlySelectedMulti[i].strokewidth);
                }
                var multiwidthundo = new UndoAction(UndoActionTypes.widthmulti);
                multiwidthundo.setWidthMulti(_this.selectionManager.currentlySelectedMulti, previouswidths, _this.toolbox.selectedDrawSize);
                for (var i = 0; i < _this.selectionManager.currentlySelectedMulti.length; i++) {
                    _this.selectionManager.currentlySelectedMulti[i].strokewidth = _this.toolbox.selectedDrawSize;
                }
                _this.undoredo.save(multiwidthundo);
            }
            _this.updateDrawing();
        });
        this.eventel.addEventListener(toolboxevents.colourchanged, function () {
            console.log("colourchanged");
            if (_this.selectionManager.currentlySelected != null) {
                var singlecolourundo = new UndoAction(UndoActionTypes.coloursingle);
                singlecolourundo.setColourSingle(_this.selectionManager.currentlySelected, _this.selectionManager.currentlySelected.strokecolour, _this.toolbox.selectedColour);
                _this.selectionManager.currentlySelected.strokecolour = _this.toolbox.selectedColour;
                _this.undoredo.save(singlecolourundo);
            }
            else if (_this.selectionManager.currentlySelectedMulti != null) {
                var prevcolours = new Array();
                for (var i = 0; i < _this.selectionManager.currentlySelectedMulti.length; i++) {
                    prevcolours.push(_this.selectionManager.currentlySelectedMulti[i].strokecolour);
                }
                var multicolourundo = new UndoAction(UndoActionTypes.colourmulti);
                multicolourundo.setColourMulti(_this.selectionManager.currentlySelectedMulti, prevcolours, _this.toolbox.selectedColour);
                for (var i = 0; i < _this.selectionManager.currentlySelectedMulti.length; i++) {
                    _this.selectionManager.currentlySelectedMulti[i].strokecolour = _this.toolbox.selectedColour;
                }
                _this.undoredo.save(multicolourundo);
            }
            _this.updateDrawing();
        });
        this.toolbox.selectedtool = "DRAW";
        this.toolbox.selectedDrawSize = 5;
        //canvas interaction events
        this.drawingcanvas.addEventListener("pointerenter", this.PointerEnterEvent.bind(this));
        this.drawingcanvas.addEventListener("pointermove", this.PointerMoveEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerdown", this.PointerDownEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerup", this.PointerUpEvent.bind(this));
        this.drawingcanvas.addEventListener("pointerleave", this.PointerLeaveEvent.bind(this));
        this.drawingcanvas.addEventListener("touchstart", function (e) { e.preventDefault(); });
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
        //
        // 
        document.getElementById("btnGrid").addEventListener("click", function () {
            _this.canvasBackgroundSwitch("grid");
        });
        document.getElementById("btnLines").addEventListener("click", function () {
            _this.canvasBackgroundSwitch("lines");
        });
        document.getElementById("btnBlank").addEventListener("click", function () {
            _this.canvasBackgroundSwitch("blank");
        });
        document.getElementById("btnSave").addEventListener("click", function () {
            _this.uploadData();
        });
        if (this.observation == "true") {
            document.getElementById("btnNext").addEventListener("click", function () {
                _this.NextAndUpload();
            });
        }
        var showingmore = true;
        document.getElementById("showmore").addEventListener("click", function () {
            var questiontext = document.getElementById("questiontext");
            var questioncontainer = document.getElementById("questioncontainer");
            var viewportheight = window.innerHeight;
            var canvascontainer = document.getElementById("canvas-scroll-container");
            var showmorelabel = document.getElementById("showmore");
            if (showingmore == false) {
                //remove max-height from question text
                showingmore = true;
                // questiontext.classList.remove("truncate");
                questiontext.classList.remove("line-clamp");
                //get height of question row
                var questioncontainerbounds_1 = questioncontainer.getBoundingClientRect();
                var bottom_1 = questioncontainerbounds_1.bottom;
                var remainingspace_1 = viewportheight - bottom_1;
                canvascontainer.style.height = "" + (remainingspace_1 - 20) + "px";
                showmorelabel.innerText = "-";
                //now set max height of the canvas container to the remaining space on screen
            }
            else {
                //set it maxheigh back again
                showingmore = false;
                //questiontext.classList.add("truncate");
                questiontext.classList.add("line-clamp");
                //get height of question row
                var questioncontainerbounds_2 = questioncontainer.getBoundingClientRect();
                var bottom_2 = questioncontainerbounds_2.bottom;
                var remainingspace_2 = viewportheight - bottom_2;
                canvascontainer.style.height = "" + (remainingspace_2 - 20) + "px";
                showmorelabel.innerText = "+";
            }
        });
        this.cursor = new cursor(this.contextCursor, this.pen);
        this.cursor.currentTool = "DRAW";
        this.selectionManager = new SelectionManager(this.drawingdata, this.contextDebug);
        this.contextSelection.strokeStyle = "black";
        this.contextSelection.lineWidth = 1;
        this.contextSelection.setLineDash([5]);
        // this.canvascontainer.scrollLeft = ((Canvasconstants.width - this.canvascontainer.clientWidth) / 2);
        this.canvascontainer.scrollLeft = ((Canvasconstants.width - this.canvascontainer.clientWidth));
        var questiontext = document.getElementById("questiontext");
        var questioncontainer = document.getElementById("questioncontainer");
        var viewportheight = window.innerHeight;
        var canvascontainer = document.getElementById("canvas-scroll-container");
        var showmorelabel = document.getElementById("showmore");
        //fixup canvas bounds size for height
        questiontext.classList.remove("line-clamp");
        var questioncontainerbounds = questioncontainer.getBoundingClientRect();
        var bottom = questioncontainerbounds.bottom;
        var remainingspace = viewportheight - bottom;
        canvascontainer.style.height = "" + (remainingspace - 20) + "px";
    };
    Stemcanvas.prototype.canvasBackgroundSwitch = function (s) {
        var canvasbackground = document.getElementById("canvasbackground");
        if (s == "blank") {
            canvasbackground.style.backgroundImage = "url(./media/canvasBG/blank.png)";
        }
        else if (s == "grid") {
            canvasbackground.style.backgroundImage = "url(./media/canvasBG/bg.png)";
        }
        else if (s == "lines") {
            canvasbackground.style.backgroundImage = "url(./media/canvasBG/lines.png)";
        }
    };
    Stemcanvas.prototype.clearcanvas = function () {
        this.drawingdata.splice(0, this.drawingdata.length);
        this.undoredo.clear();
        this.selectionManager.FlushSelection();
        this.selectionManager = new SelectionManager(this.drawingdata, this.contextDebug);
        this.updateDrawing();
        this.toolbox.reset();
        this.cursor.currentTool = this.toolbox.selectedtool;
        this.selectionManager.currentSelectionID = "";
        this.selectionManager.currentlySelected = null;
        this.selectionManager.FlushSelection();
        this.selectionManager.fresh = false;
        this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
        this.touchcount = 0; //reset touch count (as a quick fix)
    };
    Stemcanvas.prototype.undo = function () {
        this.undoredo.undo();
        this.selectionManager.currentlySelected = null;
        this.selectionManager.currentlySelectedMulti = null;
        this.updateDrawing();
    };
    Stemcanvas.prototype.redo = function () {
        this.undoredo.redo();
        this.selectionManager.currentlySelected = null;
        this.selectionManager.currentlySelectedMulti = null;
        this.updateDrawing();
    };
    Stemcanvas.prototype.copy = function () {
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
        // this.drawContextMenu()
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
            if (this.toolbox.selectedtool == "LINE" || this.toolbox.selectedtool == "RECTANGLE" || this.toolbox.selectedtool == "CIRCLE") {
                if (!this.selectionManager.fresh) {
                    this.contextInterface.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
                }
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
        if (this.selectionManager.fresh == false || this.selectionManager.multifresh == false) {
            this.contextSelection.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
            if (this.selectionManager.currentlySelected != null) {
                //draw the selected object bounds - black and white lines   
                this.selectionManager.currentlySelected.UpdateBoundingBox("");
                var box = this.selectionManager.currentlySelected.getCachedBoundingBox();
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
                                if (this.selectionManager.currentlySelected != null) {
                                    this.selectionManager.currentlySelected.points.forEach(function (p) {
                                        previewstroke_1.points.push(new Stempoint(p.x + vector_1.x, p.y + vector_1.y));
                                    });
                                    if (this.selectionManager.currentlySelected.objecttype == "DRAW") {
                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(previewstroke_1.points[0].x, previewstroke_1.points[0].y);
                                        previewstroke_1.points.forEach(function (p) {
                                            _this.contextSelection.lineTo(p.x, p.y);
                                        });
                                        this.stroke("selection");
                                    }
                                    else if (this.selectionManager.currentlySelected.objecttype == "LINE") {
                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(previewstroke_1.points[0].x, previewstroke_1.points[0].y);
                                        this.contextSelection.lineTo(previewstroke_1.points[previewstroke_1.points.length - 1].x, previewstroke_1.points[previewstroke_1.points.length - 1].y);
                                        this.stroke("selection");
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
                                        //this.contextSelection.stroke();
                                        this.stroke("selection");
                                        //this.contextSelection.closePath();
                                        //
                                    }
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
                                    this.stroke("selection");
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
                                        this.stroke("selection");
                                    }
                                }
                                else if (selectedtype == "LINE") {
                                    if (previewstroke.points.length > 1) {
                                        var first = previewstroke.points[0];
                                        var last = previewstroke.points[previewstroke.points.length - 1];
                                        this.contextSelection.beginPath();
                                        this.contextSelection.moveTo(first.x, first.y);
                                        this.contextSelection.lineTo(last.x, last.y);
                                        this.stroke("selection");
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
                    var boundingbox = this.selectionManager.getGroupBoundingBox();
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
                    this.contextSelection.fillStyle = "white";
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
                                var vector_2 = this.getCurrentStrokeVector();
                                if (this.cursor.selectmodifier == "MOVE") {
                                    //calc and affect move vector to selected object points
                                    this.selectionManager.currentlySelectedMulti.forEach(function (s) {
                                        var tempstroke = new Stemstroke();
                                        s.points.forEach(function (p) {
                                            tempstroke.points.push(new Stempoint(p.x + vector_2.x, p.y + vector_2.y));
                                        });
                                        ////////////////////////////////////////////////////
                                        if (s.objecttype == "DRAW") {
                                            _this.contextSelection.beginPath();
                                            _this.contextSelection.moveTo(tempstroke.points[0].x, tempstroke.points[0].y);
                                            tempstroke.points.forEach(function (p) {
                                                _this.contextSelection.lineTo(p.x, p.y);
                                            });
                                            //this.contextSelection.stroke();
                                            _this.stroke("selection");
                                            //this.contextSelection.closePath();
                                        }
                                        else if (s.objecttype == "LINE") {
                                            _this.contextSelection.beginPath();
                                            _this.contextSelection.moveTo(tempstroke.points[0].x, tempstroke.points[0].y);
                                            _this.contextSelection.lineTo(tempstroke.points[tempstroke.points.length - 1].x, tempstroke.points[tempstroke.points.length - 1].y);
                                            //this.contextSelection.stroke();
                                            _this.stroke("selection");
                                            //this.contextSelection.closePath();
                                        }
                                        else if (s.objecttype == "RECTANGLE") {
                                            tempstroke.objecttype = "RECTANGLE";
                                            tempstroke.UpdateBoundingBox("");
                                            var previewbox = tempstroke.getCachedBoundingBox();
                                            _this.contextSelection.beginPath();
                                            _this.contextSelection.moveTo(previewbox.originx, previewbox.originy);
                                            _this.contextSelection.lineTo(previewbox.maxX, previewbox.originy);
                                            _this.contextSelection.lineTo(previewbox.maxX, previewbox.maxY);
                                            _this.contextSelection.lineTo(previewbox.originx, previewbox.maxY);
                                            _this.contextSelection.lineTo(previewbox.originx, previewbox.originy);
                                            _this.contextSelection.stroke();
                                            _this.contextSelection.closePath();
                                        }
                                        else if (s.objecttype == "CIRCLE") {
                                            tempstroke.objecttype = "CIRCLE";
                                            tempstroke.UpdateBoundingBox("");
                                            var previewbox = tempstroke.getCachedBoundingBox();
                                            _this.contextSelection.beginPath();
                                            //
                                            var radius = tempstroke.getPixelLength();
                                            var midx = (previewbox.maxX + previewbox.originx) / 2;
                                            var midy = (previewbox.maxY + previewbox.originy) / 2;
                                            _this.contextSelection.arc(midx, midy, radius, 0, 3.16 * 2);
                                            //this.contextSelection.stroke();
                                            _this.stroke("selection");
                                            //this.contextSelection.closePath();
                                            //
                                        }
                                        ////////////////////////////////////////////////////
                                    });
                                }
                                else if (this.cursor.selectmodifier.length == 2) {
                                    //now for the last part, if its a resize stroke, do that business
                                    var bounds = this.selectionManager.getGroupBoundingBox();
                                    var resizepreview = this.resizeMulti(this.selectionManager.currentlySelectedMulti, bounds, vector_2, this.cursor.selectmodifier);
                                    resizepreview.forEach(function (s) {
                                        var selectedtype = s.objecttype;
                                        if (selectedtype == "DRAW") {
                                            _this.contextSelection.beginPath();
                                            // this.contextSelection.moveTo(s.points[0].x, s.points[0].y);
                                            s.points.forEach(function (p) {
                                                _this.contextSelection.lineTo(p.x, p.y);
                                            });
                                            _this.stroke("selection");
                                        }
                                        else if (selectedtype == "CIRCLE") {
                                            s.UpdateBoundingBox("");
                                            var previewbox = s.getCachedBoundingBox();
                                            _this.contextSelection.beginPath();
                                            var radius = s.getPixelLength();
                                            var midx = (previewbox.maxX + previewbox.originx) / 2;
                                            var midy = (previewbox.maxY + previewbox.originy) / 2;
                                            _this.contextSelection.arc(midx, midy, radius, 0, 3.16 * 2);
                                            _this.stroke("selection");
                                        }
                                        else if (selectedtype == "LINE") {
                                            var first = s.points[0];
                                            var last = s.points[s.points.length - 1];
                                            _this.contextSelection.beginPath();
                                            _this.contextSelection.moveTo(first.x, first.y);
                                            _this.contextSelection.lineTo(last.x, last.y);
                                            _this.stroke("selection");
                                        }
                                        else if (selectedtype == "RECTANGLE") {
                                            s.UpdateBoundingBox("");
                                            var first = s.points[0];
                                            var last = s.points[s.points.length - 1];
                                            _this.contextSelection.beginPath();
                                            _this.contextSelection.moveTo(first.x, first.y);
                                            _this.contextSelection.lineTo(last.x, first.y);
                                            _this.contextSelection.lineTo(last.x, last.y);
                                            _this.contextSelection.lineTo(first.x, last.y);
                                            _this.contextSelection.lineTo(first.x, first.y);
                                            _this.stroke("selection");
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
            this.contextDrawing.stroke(); //this one buffers so not a good idea to pass this one off to manager
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
        e.preventDefault();
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
        e.preventDefault();
        this.pen.X = e.pageX - (this.canvascontainer.offsetLeft) + this.canvasscrollx;
        this.pen.Y = e.pageY - (this.canvascontainer.offsetTop) + this.canvascrolly;
        this.pen.pressure = e.pressure;
        if (this.touchcount == 2) {
            this.touchscrolltracker.points.push(new Stempoint(this.pen.X, this.pen.Y));
            var movement = new Vector(this.touchscrolltracker.points[this.touchscrolltracker.points.length - 1].x - this.touchscrolltracker.points[0].x, this.touchscrolltracker.points[this.touchscrolltracker.points.length - 1].y - this.touchscrolltracker.points[0].y);
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
        else if (this.selectionManager.currentlySelectedMulti != null) {
            if (this.pen.penDown) {
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
                var box = this.selectionManager.getGroupBoundingBox();
                if (box.Intersects(this.pen.X, this.pen.Y)) {
                    //now check if its in one of the corners
                    this.cursor.selectmodifier = box.IntersectsCorner(this.pen.X, this.pen.Y);
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
        //now we need to check for scribble erase
        if (this.toolbox.selectedtool == "ERASE") {
            if (this.pen.penDown) {
                var erasestrokelength = this.currentstroke.getPixelLength();
                if (erasestrokelength > Canvasconstants.multiselectMinimumLength) {
                    //this code is whack (this needs to be refactored for release)
                    this.multierasing = true;
                    var toerase = [];
                    for (var i = 0; i < this.drawingdata.length; i++) {
                        var s = this.drawingdata[i];
                        s.UpdateBoundingBox("");
                        var box = s.getCachedBoundingBox();
                        var lastpointinstroke = this.currentstroke.points[this.currentstroke.points.length - 1];
                        if (box.Intersects(lastpointinstroke.x, lastpointinstroke.y)) {
                            var shouldbreak = false;
                            for (var y = 0; y < s.points.length; y++) {
                                var p = s.points[y];
                                if (this.selectionManager.getDistanceBetweenTwoPoints(new Vector(p.x, p.y), new Vector(lastpointinstroke.x, lastpointinstroke.y)) < Canvasconstants.multiselectMinimumLength) {
                                    this.multierasedstrokes.push(s);
                                    this.multierasedindexs.push(this.drawingdata.indexOf(s));
                                    var index = this.drawingdata.indexOf(s);
                                    if (index != -1) {
                                        this.drawingdata.splice(index, 1);
                                    }
                                    this.updateDrawing();
                                    shouldbreak = true;
                                    break;
                                }
                            }
                            if (shouldbreak) {
                                console.log("stopped looking through the drawing");
                                break;
                            }
                        }
                    }
                    ;
                    // for(let i = 0; i < toerase.length; i++)
                    // {                        
                    //     this.drawingdata.splice(toerase[i],1);
                    //     this.updateDrawing(); 
                    // }         
                }
            }
        }
    };
    Stemcanvas.prototype.PointerUpEvent = function (e) {
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
            var drawundo = new UndoAction(UndoActionTypes.newdraw);
            drawundo.setNewDrawnObject(this.currentstroke, this.toolbox.selectedtool);
            this.undoredo.save(drawundo);
        }
        else if (this.toolbox.selectedtool == "SELECT") {
            //check if there is already a selected object
            if (this.selectionManager.currentlySelected != null) {
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
                            var singlemoveundo = new UndoAction(UndoActionTypes.movesingle);
                            console.log(singlemoveundo);
                            singlemoveundo.setMoveSingle(this.selectionManager.currentlySelected, new Vector(x_1, y_1));
                            this.undoredo.save(singlemoveundo);
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
                            var resizevector = this.getCurrentStrokeVector();
                            var previewstroke = new Stemstroke();
                            previewstroke = this.resizeStroke(this.selectionManager.currentlySelected, resizevector, this.cursor.selectmodifier);
                            for (var i = 0; i < previewstroke.points.length; i++) {
                                this.selectionManager.currentlySelected.points[i].x = previewstroke.points[i].x;
                                this.selectionManager.currentlySelected.points[i].y = previewstroke.points[i].y;
                            }
                            //now we need to check if the stroke has been inverted (otherwise undo redo doesnt work)
                            var invertingx = false;
                            var invertingy = false;
                            var ns = this.cursor.selectmodifier.substring(0, 1);
                            var ew = this.cursor.selectmodifier.substring(1, 2);
                            //
                            if (ns == 'N') {
                                if (resizevector.y > this.selectionManager.currentlySelected.getPerfectStrokeHeight()) {
                                    //is inverting the y
                                    invertingy = true;
                                }
                            }
                            else if (ns == 'S') {
                                if (-resizevector.y > this.selectionManager.currentlySelected.getPerfectStrokeHeight()) {
                                    //is inverting the y
                                    invertingy = true;
                                }
                            }
                            if (ew == "E") {
                                if (-resizevector.x > this.selectionManager.currentlySelected.getPerfectStrokeWidth()) {
                                    //is inverting x
                                    invertingx = true;
                                }
                            }
                            else if (ew == "W") {
                                if (resizevector.x > this.selectionManager.currentlySelected.getPerfectStrokeWidth()) {
                                    //inverting x
                                    invertingx = true;
                                }
                            }
                            var singleresizeundo = new UndoAction(UndoActionTypes.resizesingle);
                            singleresizeundo.setResizeSingle(this.selectionManager.currentlySelected, resizevector, this.cursor.selectmodifier, invertingx, invertingy);
                            console.log(singleresizeundo);
                            this.selectionManager.currentlySelected.UpdateBoundingBox("");
                            this.selectionManager.fresh = false;
                            this.undoredo.save(singleresizeundo);
                            this.updateDrawing();
                            ///////////////
                        }
                    }
                }
                //cursor isnt interacting so we need are doing a normal selection
                else {
                    if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {
                        this.currentstroke.UpdateBoundingBox("");
                        var box = this.currentstroke.getCachedBoundingBox();
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
                    var vector_3 = this.getCurrentStrokeVector();
                    if (this.cursor.selectmodifier == "MOVE") {
                        var multimoveundo = new UndoAction(UndoActionTypes.movemulti);
                        multimoveundo.setMoveMulti(this.selectionManager.currentlySelectedMulti, vector_3);
                        this.undoredo.save(multimoveundo);
                        //move all the objects in that are currently selected
                        this.selectionManager.currentlySelectedMulti.forEach(function (s) {
                            s.points.forEach(function (p) {
                                p.x += vector_3.x;
                                p.y += vector_3.y;
                            });
                        });
                        this.updateDrawing();
                    }
                    else {
                        if (this.cursor.selectmodifier.length == 2) {
                            var bounds = this.selectionManager.getGroupBoundingBox();
                            var resizepreview = this.resizeMulti(this.selectionManager.currentlySelectedMulti, bounds, vector_3, this.cursor.selectmodifier);
                            var multimoveundo = new UndoAction(UndoActionTypes.resizemulti);
                            var resizevector = this.getCurrentStrokeVector();
                            var invertingx = false;
                            var invertingy = false;
                            var ns = this.cursor.selectmodifier.substring(0, 1);
                            var ew = this.cursor.selectmodifier.substring(1, 2);
                            var width = bounds.maxX - bounds.originx;
                            var height = bounds.maxY - bounds.originy;
                            //
                            if (ns == 'N') {
                                if (resizevector.y > height) {
                                    //is inverting the y
                                    invertingy = true;
                                }
                            }
                            else if (ns == 'S') {
                                if (-resizevector.y > height) {
                                    //is inverting the y
                                    invertingy = true;
                                }
                            }
                            if (ew == "E") {
                                if (-resizevector.x > width) {
                                    //is inverting x
                                    invertingx = true;
                                }
                            }
                            else if (ew == "W") {
                                if (resizevector.x > width) {
                                    //inverting x
                                    invertingx = true;
                                }
                            }
                            multimoveundo.setResizeMulti(this.selectionManager.currentlySelectedMulti, vector_3, this.cursor.selectmodifier, invertingx, invertingy);
                            this.undoredo.save(multimoveundo);
                            for (var i = 0; i < resizepreview.length; i++) {
                                var strokeobj = this.selectionManager.currentlySelectedMulti[i];
                                var changedstroke = resizepreview[i];
                                for (var y = 0; y < changedstroke.points.length; y++) {
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
                    var selectionbox = new StemstrokeBox();
                    var firstpoint = this.currentstroke.getFirstPoint();
                    var lastpoint = this.currentstroke.getLastPoint();
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
            this.currentstroke = null;
        }
        else if (this.toolbox.selectedtool == "ERASE") {
            //is the stroke a line or a point
            if (this.currentstroke.getPixelLength() > Canvasconstants.multiselectMinimumLength) {
                //see move event (coz it strokes will be erased 'live' while the user is interacting)
                //strokes have allready been popped, now put them into undostack
                var multierase = new UndoAction(UndoActionTypes.erasemulti);
                this.multierasedstrokes = this.removeduplicates(this.multierasedstrokes, "strokeid");
                // this.multierasedstrokes.sort((a,b) => (a.points[0].timestamp > b.points[0].timestamp) ? 1 : -1);    
                multierase.setEraseMulti(this.multierasedstrokes, this.multierasedindexs);
                this.undoredo.save(multierase);
                console.log;
                this.multierasing = false;
                this.multierasedstrokes = [];
                this.multierasedindexs = [];
            }
            else {
                if (!this.multierasing) {
                    debugger;
                    var underpointerid = this.selectionManager.IDObjectAtPoint(this.currentstroke.points[this.currentstroke.points.length - 1].x, this.currentstroke.points[this.currentstroke.points.length - 1].y);
                    var indexunderpointer = this.selectionManager.indexAtID(underpointerid);
                    if (indexunderpointer == null) {
                        return;
                    }
                    var undosingleerase = new UndoAction(UndoActionTypes.erase);
                    undosingleerase.setErase(this.drawingdata[indexunderpointer], indexunderpointer);
                    this.undoredo.save(undosingleerase);
                    this.drawingdata.splice(indexunderpointer, 1); //remove the entry from the array
                    this.updateDrawing();
                }
            }
        }
        else if (this.toolbox.selectedtool == "LINE") {
            this.currentstroke.UpdateBoundingBox("");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            this.drawingdata.push(this.currentstroke);
            var singledrawlineundo = new UndoAction(UndoActionTypes.newdraw);
            singledrawlineundo.stroke = this.currentstroke;
            singledrawlineundo.drawtype = this.toolbox.selectedtool;
            this.undoredo.save(singledrawlineundo);
            this.updateDrawing();
            this.currentstroke = null;
        }
        else if (this.toolbox.selectedtool == "RECTANGLE") {
            this.currentstroke.UpdateBoundingBox("");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            this.drawingdata.push(this.currentstroke);
            var singledrawrectangleundo = new UndoAction(UndoActionTypes.newdraw);
            singledrawrectangleundo.stroke = this.currentstroke;
            singledrawrectangleundo.drawtype = this.toolbox.selectedtool;
            this.undoredo.save(singledrawrectangleundo);
            this.updateDrawing();
            this.currentstroke = null;
        }
        else if (this.toolbox.selectedtool == "CIRCLE") {
            this.currentstroke.UpdateBoundingBox("");
            this.currentstroke.strokecolour = this.toolbox.selectedColour;
            this.currentstroke.strokewidth = this.toolbox.selectedDrawSize;
            this.drawingdata.push(this.currentstroke);
            var singledrawcircleundo = new UndoAction(UndoActionTypes.newdraw);
            singledrawcircleundo.stroke = this.currentstroke;
            singledrawcircleundo.drawtype = this.toolbox.selectedtool;
            this.undoredo.save(singledrawcircleundo);
            this.updateDrawing();
            this.currentstroke = null;
        }
        this.currentstroke = null;
        this.cursor.interacting = false;
        this.toolbox.isDrawingObject = false;
        this.cursor.selectmodifier = "";
    };
    Stemcanvas.prototype.PointerDownEvent = function (e) {
        e.preventDefault();
        this.pen.X = e.pageX - (this.canvascontainer.offsetLeft) + this.canvasscrollx;
        this.pen.Y = e.pageY - (this.canvascontainer.offsetTop) + this.canvascrolly;
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
                    //now need to check if intersecting with any objects
                    if (this.selectionManager.currentlySelected != null) {
                        //checking if intersecting single selected item
                        this.selectionManager.currentlySelected.UpdateBoundingBox("");
                        var box = this.selectionManager.currentlySelected.getCachedBoundingBox();
                        if (box.Intersects(this.pen.X, this.pen.Y)) {
                            //now check if its in one of the corners
                            this.cursor.selectmodifier = box.IntersectsCorner(this.pen.X, this.pen.Y);
                        }
                    }
                    //we need to do both checks so no else here please :D
                    else if (this.selectionManager.currentlySelectedMulti != null) {
                        //checking if intersecting a group selection
                        var box = this.selectionManager.getGroupBoundingBox();
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
    };
    Stemcanvas.prototype.PointerLeaveEvent = function (e) {
        e.preventDefault();
        this.pen.onCanvas = false;
    };
    Stemcanvas.prototype.updateDrawing = function () {
        //clear drawingcanvas:
        var _this = this;
        this.contextDrawing.clearRect(0, 0, Canvasconstants.width, Canvasconstants.height);
        this.selectionManager.fresh = false;
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
                stroke.UpdateBoundingBox("");
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
                stroke.UpdateBoundingBox("");
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
    Stemcanvas.prototype.resizeMulti = function (inputstrokes, boundingbox, resizevector, modifier) {
        var _this = this;
        var output = new Array();
        inputstrokes.forEach(function (inputstroke) {
            var outputstroke = new Stemstroke();
            outputstroke.objecttype = inputstroke.objecttype;
            if (modifier == "NW") {
                var resizefactor_5 = new Vector(1 + ((resizevector.x / (boundingbox.maxX - boundingbox.originx)) * -1), 1 + ((resizevector.y / (boundingbox.maxY - boundingbox.originy)) * -1));
                inputstroke.points.forEach(function (p) {
                    var resizedpoint = _this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor_5.x, 0, 0, resizefactor_5.y);
                    resizedpoint.x += boundingbox.originx + resizevector.x;
                    resizedpoint.y += boundingbox.originy + resizevector.y;
                    outputstroke.points.push(resizedpoint);
                });
            }
            else if (modifier == "NE") {
                var resizefactor_6 = new Vector(1 + (resizevector.x / (boundingbox.maxX - boundingbox.originx)), 1 + ((resizevector.y / (boundingbox.maxY - boundingbox.originy)) * -1));
                inputstroke.points.forEach(function (p) {
                    var resizedpoint = _this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor_6.x, 0, 0, resizefactor_6.y);
                    resizedpoint.x += boundingbox.originx;
                    resizedpoint.y += boundingbox.originy + resizevector.y;
                    outputstroke.points.push(resizedpoint);
                });
            }
            else if (modifier == "SE") {
                var resizefactor_7 = new Vector(1 + (resizevector.x / (boundingbox.maxX - boundingbox.originx)), 1 + (resizevector.y / (boundingbox.maxY - boundingbox.originy)));
                inputstroke.points.forEach(function (p) {
                    var resizedpoint = _this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor_7.x, 0, 0, resizefactor_7.y);
                    resizedpoint.x += boundingbox.originx;
                    resizedpoint.y += boundingbox.originy;
                    outputstroke.points.push(resizedpoint);
                });
            }
            else if (modifier == "SW") {
                var resizefactor_8 = new Vector(1 + ((resizevector.x / (boundingbox.maxX - boundingbox.originx)) * -1), 1 + (resizevector.y / (boundingbox.maxY - boundingbox.originy)));
                inputstroke.points.forEach(function (p) {
                    var resizedpoint = _this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor_8.x, 0, 0, resizefactor_8.y);
                    resizedpoint.x += boundingbox.originx + resizevector.x;
                    resizedpoint.y += boundingbox.originy;
                    outputstroke.points.push(resizedpoint);
                });
            }
            output.push(outputstroke);
        });
        return output;
    };
    Stemcanvas.prototype.startTimer = function () {
        var timertext = document.getElementById("questiontimer");
        var startsynctime = performance.now();
        var startClockTime = new Date().getTime();
        this.starttimeclock = new Date().toISOString();
        this.starttimeperf = startsynctime.toString();
        var x = setInterval(function () {
            var currentTime = new Date().getTime();
            var distance = currentTime - startClockTime;
            var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);
            //timertext.innerText = `${hours}h  ${minutes}m  ${seconds}s`;
        }, 2000);
    };
    Stemcanvas.prototype.uploadData = function () {
        var participantDeviceTask = "".concat(this.participant, " - ").concat(this.devicetype, " - ").concat(this.task);
        this.updateDrawing();
        var image = this.drawingcanvas.toDataURL("image/png").replace("image/png", "image/octet-stream"); //this is dirty, but it works for now                      
        // SAVE THE SESSION INFO FILE
        var session = new Sessioninfo();
        session.start = this.starttimeclock;
        session.end = new Date().toISOString();
        session.startperf = this.starttimeperf;
        session.devicetype = this.devicetype;
        session.task = this.task;
        session.participanttoken = this.participant;
        //////////////////// SAVE THE DRAWING DATA FILE
        var packageoutput = new FileOutputPackage(); //we package the session info in so we can buddy up the files later on (just in case right. coz all the files will be named unknown!)
        packageoutput.drawingdata = this.drawingdata;
        packageoutput.sessioninfo = session;
        packageoutput.imagefile = image;
        // let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(packageoutput));
        var dataStr = JSON.stringify(packageoutput);
        //window.open(dataStr);
        // var anchor = document.createElement('a');
        // anchor.setAttribute("href", dataStr);
        // anchor.setAttribute("download", `${participantDeviceTask} - packagedSession.json`);
        // anchor.click();
        //create post request to send the data to the server:
        var xhr = new XMLHttpRequest();
        var url = "../upload.php";
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                //@ts-ignore 
                M.toast({ html: 'Drawing submitted' });
                //window.location.href = "index.html?q=nextquestion";
            }
        };
        xhr.send(dataStr);
    };
    Stemcanvas.prototype.NextAndUpload = function () {
        // let participantDeviceTask = `${this.participant} - ${this.devicetype} - ${this.task}`;
        var currentquestionarray = this.task.split('q');
        var currentquestion = parseInt(currentquestionarray[1]);
        var nextquestion = "q" + (currentquestion + 1) + ".html";
        //document.location.href = (nextquestion);
        window.open(nextquestion);
        this.uploadData();
    };
    Stemcanvas.prototype.debugtext = function (input) {
        this.debug.innerText = input;
    };
    Stemcanvas.prototype.stroke = function (context) {
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
    };
    Stemcanvas.prototype.removeduplicates = function (array, prop) {
        return array.filter(function (s, i, arr) {
            return arr.map(function (mapobj) { return mapobj[prop]; }).indexOf(s[prop]) == i;
        });
    };
    return Stemcanvas;
}());
var Vector = /** @class */ (function () {
    function Vector(x, y) {
        this.x = x;
        this.y = y;
    }
    return Vector;
}());
var UndoAction = /** @class */ (function () {
    function UndoAction(actiontype) {
        this.actiontype = actiontype; //only actiontype is required, all other parameters are filled post construction                
    }
    UndoAction.prototype.setNewDrawnObject = function (stroke, type) {
        this.stroke = stroke;
        this.drawtype = type;
    };
    UndoAction.prototype.setMoveSingle = function (inputstroke, inputVector) {
        this.stroke = inputstroke;
        this.vector = inputVector;
    };
    UndoAction.prototype.setMoveMulti = function (strokes, vector) {
        this.multistrokes = strokes;
        this.vector = vector;
    };
    UndoAction.prototype.setResizeSingle = function (stroke, vector, direction, invertingx, invertingy) {
        this.stroke = stroke;
        this.vector = vector;
        this.direction = direction;
        this.invertingx = invertingx;
        this.invertingy = invertingy;
    };
    UndoAction.prototype.setResizeMulti = function (strokes, vector, direction, invertingx, invertingy) {
        this.multistrokes = strokes;
        this.vector = vector;
        this.direction = direction;
        this.invertingx = invertingx;
        this.invertingy = invertingy;
    };
    UndoAction.prototype.setColourSingle = function (stroke, previouscolour, newcolour) {
        this.stroke = stroke;
        this.previouscolour = previouscolour;
        this.newcolour = newcolour;
    };
    UndoAction.prototype.setColourMulti = function (strokes, previouscolours, newcolour) {
        this.multistrokes = strokes;
        this.previouscolours = previouscolours;
        this.newcolour = newcolour;
    };
    UndoAction.prototype.setWidthSingle = function (stroke, previouswidth, newwidth) {
        this.stroke = stroke;
        this.previouswidth = previouswidth;
        this.newwidth = newwidth;
    };
    UndoAction.prototype.setWidthMulti = function (strokes, previouswidths, newwidth) {
        this.multistrokes = strokes;
        this.previouswidths = previouswidths;
        this.newwidth = newwidth;
    };
    UndoAction.prototype.setErase = function (stroke, index) {
        this.stroke = stroke;
        this.reinsertindex = index;
    };
    UndoAction.prototype.setEraseMulti = function (strokes, indexes) {
        this.multistrokes = strokes;
        this.reinsertindexes = indexes;
    };
    return UndoAction;
}());
var StateManager = /** @class */ (function () {
    function StateManager(drawing) {
        this.data = drawing;
        this.undostack = [];
        this.redostack = [];
    }
    StateManager.prototype.save = function (action) {
        this.undostack.push(action);
        this.redostack = [];
    };
    StateManager.prototype.undo = function () {
        if (this.undostack.length < 1) {
            return;
        }
        var lastaction = this.undostack[this.undostack.length - 1];
        if (lastaction.actiontype == UndoActionTypes.newdraw) {
            this.data.pop(); //pop off drawing
            var action = this.undostack.pop();
            this.redostack.push(action); //pop undo action off the undo stack into the redo stack
        }
        else if (lastaction.actiontype == UndoActionTypes.colourmulti) {
            var action = this.undostack.pop();
            for (var i = 0; i < action.multistrokes.length; i++) {
                var currenstroke = action.multistrokes[i];
                currenstroke.strokecolour = action.previouscolours[i];
            }
            this.redostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.coloursingle) {
            var action = this.undostack.pop();
            action.stroke.strokecolour = lastaction.previouscolour;
            this.redostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.movemulti) {
            var action_1 = this.undostack.pop();
            action_1.multistrokes.forEach(function (s) {
                s.points.forEach(function (p) {
                    p.x -= action_1.vector.x;
                    p.y -= action_1.vector.y;
                });
            });
            this.redostack.push(action_1);
        }
        else if (lastaction.actiontype == UndoActionTypes.movesingle) {
            var action_2 = this.undostack.pop();
            action_2.stroke.points.forEach(function (p) {
                p.x -= action_2.vector.x;
                p.y -= action_2.vector.y;
            });
            this.redostack.push(action_2);
        }
        else if (lastaction.actiontype == UndoActionTypes.resizemulti) {
            var action = this.undostack.pop();
            var invertedVector = this.invertVector(action.vector.x, action.vector.y);
            var direction = action.direction;
            var ns = direction.substring(0, 1);
            var ew = direction.substring(1, 2);
            var invertcheckeddirection = "";
            if (lastaction.invertingy) {
                if (ns == "N") {
                    invertcheckeddirection += "S";
                }
                else if (ns == "S") {
                    invertcheckeddirection += "N";
                }
            }
            else {
                invertcheckeddirection += ns;
            }
            if (lastaction.invertingx) {
                if (ew == "E") {
                    invertcheckeddirection += "W";
                }
                else if (ew == "W") {
                    invertcheckeddirection += "E";
                }
            }
            else {
                invertcheckeddirection += ew;
            }
            var box = new StemstrokeBox();
            for (var i = 0; i < action.multistrokes.length; i++) {
                var s = action.multistrokes[i];
                var lowestx = s.points.reduce(function (prev, curr) {
                    return prev.x < curr.x ? prev : curr;
                });
                var heighestx = s.points.reduce(function (prev, curr) {
                    return prev.x > curr.x ? prev : curr;
                });
                var lowesty = s.points.reduce(function (prev, curr) {
                    return prev.y < curr.y ? prev : curr;
                });
                var heighesty = s.points.reduce(function (prev, curr) {
                    return prev.y > curr.y ? prev : curr;
                });
                if (i == 0) {
                    box.originx = lowestx.x;
                    box.originy = lowesty.y;
                    box.maxX = heighestx.x;
                    box.maxY = heighesty.y;
                }
                else {
                    if (lowestx.x < box.originx) {
                        box.originx = lowestx.x;
                    }
                    if (lowesty.y < box.originy) {
                        box.originy = lowesty.y;
                    }
                    if (heighestx.x > box.maxX) {
                        box.maxX = heighestx.x;
                    }
                    if (heighesty.y > box.maxY) {
                        box.maxY = heighesty.y;
                    }
                }
            }
            var resizedstrokes = this.resizeMulti(action.multistrokes, box, invertedVector, invertcheckeddirection);
            for (var i = 0; i < action.multistrokes.length; i++) {
                for (var y = 0; y < action.multistrokes[i].points.length; y++) {
                    action.multistrokes[i].points[y].x = resizedstrokes[i].points[y].x;
                    action.multistrokes[i].points[y].y = resizedstrokes[i].points[y].y;
                }
            }
            this.redostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.resizesingle) {
            var action = this.undostack.pop();
            var invertedVector = this.invertVector(action.vector.x, action.vector.y);
            var direction = action.direction;
            var ns = direction.substring(0, 1);
            var ew = direction.substring(1, 2);
            var invertcheckeddirection = "";
            if (lastaction.invertingy) {
                if (ns == "N") {
                    invertcheckeddirection += "S";
                }
                else if (ns == "S") {
                    invertcheckeddirection += "N";
                }
            }
            else {
                invertcheckeddirection += ns;
            }
            if (lastaction.invertingx) {
                if (ew == "E") {
                    invertcheckeddirection += "W";
                }
                else if (ew == "W") {
                    invertcheckeddirection += "E";
                }
            }
            else {
                invertcheckeddirection += ew;
            }
            //check invert for vector now:
            var temp = this.resizeStroke(action.stroke, invertedVector, invertcheckeddirection);
            for (var i = 0; i < action.stroke.points.length; i++) {
                action.stroke.points[i] = temp.points[i];
            }
            this.redostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.widthmulti) {
            var action = this.undostack.pop();
            for (var i = 0; i < action.multistrokes.length; i++) {
                action.multistrokes[i].strokewidth = action.previouswidths[i];
            }
            this.redostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.widthsingle) {
            lastaction.stroke.strokewidth = lastaction.previouswidth;
            this.redostack.push(this.undostack.pop());
        }
        else if (lastaction.actiontype == UndoActionTypes.erasemulti) {
            var action = this.undostack.pop(); //get last undo action
            var strokes = action.multistrokes;
            var indexes = action.reinsertindexes;
            for (var i = strokes.length - 1; i >= 0; i--) {
                this.data.splice(indexes[i], 0, strokes[i]);
            }
            this.redostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.erase) {
            debugger;
            var action = this.undostack.pop();
            this.data.splice(action.reinsertindex, 0, action.stroke);
            this.redostack.push(action);
        }
    };
    StateManager.prototype.redo = function () {
        if (this.redostack.length < 1) {
            return;
        }
        var lastaction = this.redostack[this.redostack.length - 1];
        if (lastaction.actiontype == UndoActionTypes.newdraw) {
            this.data.push(lastaction.stroke); //pop off drawing
            this.undostack.push(this.redostack.pop()); //pop undo action off the undo stack into the redo stack
        }
        else if (lastaction.actiontype == UndoActionTypes.movesingle) {
            lastaction.stroke.points.forEach(function (s) {
                s.x += lastaction.vector.x;
                s.y += lastaction.vector.y;
            });
            this.undostack.push(this.redostack.pop()); //pop undo action off the undo stack into the redo stack
        }
        else if (lastaction.actiontype == UndoActionTypes.movemulti) {
            lastaction.multistrokes.forEach(function (s) {
                s.points.forEach(function (p) {
                    p.x += lastaction.vector.x;
                    p.y += lastaction.vector.y;
                });
            });
            this.undostack.push(this.redostack.pop()); //pop undo action off the undo stack into the redo stack
        }
        else if (lastaction.actiontype == UndoActionTypes.resizesingle) {
            var temp = this.resizeStroke(lastaction.stroke, lastaction.vector, lastaction.direction);
            for (var i = 0; i < temp.points.length; i++) {
                lastaction.stroke.points[i] = temp.points[i];
            }
            this.undostack.push(this.redostack.pop()); //pop undo action off the undo stack into the redo stack
        }
        else if (lastaction.actiontype == UndoActionTypes.resizemulti) {
            var box = new StemstrokeBox();
            for (var i = 0; i < lastaction.multistrokes.length; i++) {
                var s = lastaction.multistrokes[i];
                var lowestx = s.points.reduce(function (prev, curr) {
                    return prev.x < curr.x ? prev : curr;
                });
                var heighestx = s.points.reduce(function (prev, curr) {
                    return prev.x > curr.x ? prev : curr;
                });
                var lowesty = s.points.reduce(function (prev, curr) {
                    return prev.y < curr.y ? prev : curr;
                });
                var heighesty = s.points.reduce(function (prev, curr) {
                    return prev.y > curr.y ? prev : curr;
                });
                if (i == 0) {
                    box.originx = lowestx.x;
                    box.originy = lowesty.y;
                    box.maxX = heighestx.x;
                    box.maxY = heighesty.y;
                }
                else {
                    if (lowestx.x < box.originx) {
                        box.originx = lowestx.x;
                    }
                    if (lowesty.y < box.originy) {
                        box.originy = lowesty.y;
                    }
                    if (heighestx.x > box.maxX) {
                        box.maxX = heighestx.x;
                    }
                    if (heighesty.y > box.maxY) {
                        box.maxY = heighesty.y;
                    }
                }
            }
            var temp = this.resizeMulti(lastaction.multistrokes, box, lastaction.vector, lastaction.direction);
            for (var i = 0; i < lastaction.multistrokes.length; i++) {
                for (var y = 0; y < lastaction.multistrokes[i].points.length; y++) {
                    lastaction.multistrokes[i].points[y].x = temp[i].points[y].x;
                    lastaction.multistrokes[i].points[y].y = temp[i].points[y].y;
                }
            }
            this.undostack.push(this.redostack.pop()); //pop undo action off the undo stack into the redo stack
        }
        else if (lastaction.actiontype == UndoActionTypes.coloursingle) {
            var action = this.redostack.pop();
            action.stroke.strokecolour = action.newcolour;
            this.undostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.widthsingle) {
            var action = this.redostack.pop();
            action.stroke.strokewidth = action.newwidth;
            this.undostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.colourmulti) {
            var action = this.redostack.pop();
            for (var i = 0; i < action.multistrokes.length; i++) {
                var cur = action.multistrokes[i];
                cur.strokecolour = action.newcolour;
            }
            this.undostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.widthmulti) {
            var action = this.redostack.pop();
            for (var i = 0; i < action.multistrokes.length; i++) {
                var cur = action.multistrokes[i];
                cur.strokewidth = action.newwidth;
            }
            this.undostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.erasemulti) {
            var action = this.redostack.pop();
            for (var i = 0; i < action.multistrokes.length; i++) {
                this.data.splice(action.reinsertindexes[i], 1);
            }
            this.undostack.push(action);
        }
        else if (lastaction.actiontype == UndoActionTypes.erase) {
            var action = this.redostack.pop();
            var index = this.data.indexOf(action.stroke);
            this.data.splice(index, 1);
            this.undostack.push(action);
        }
    };
    StateManager.prototype.clear = function () {
        debugger;
        this.undostack.splice(0, this.undostack.length);
        this.redostack.splice(0, this.redostack.length);
    };
    StateManager.prototype.resizePoint = function (inputx, inputy, a, b, c, d) {
        // how to use: currentpoint.x - (strokebox.originx), currentpoint.y - (strokebox.originy), xfactor, 0, 0, yfactor, 0, 0
        // will resize based from origin
        var outputx = ((a * inputx) + (b * inputx));
        var outputy = ((c * inputy) + (d * inputy));
        return new Stempoint(outputx, outputy);
    };
    StateManager.prototype.resizeStroke = function (inputstroke, resizevector, modifier) {
        var _this = this;
        inputstroke.UpdateBoundingBox("");
        var strokebox = inputstroke.getCachedBoundingBox();
        //takes input stroke and return
        var outputstroke = new Stemstroke();
        if (modifier == "NW") {
            var resizefactor_9 = new Vector(1 + ((resizevector.x / (strokebox.maxX - strokebox.originx)) * -1), 1 + ((resizevector.y / (strokebox.maxY - strokebox.originy)) * -1));
            inputstroke.points.forEach(function (p) {
                var resizedpoint = _this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor_9.x, 0, 0, resizefactor_9.y);
                resizedpoint.x += strokebox.originx + resizevector.x;
                resizedpoint.y += strokebox.originy + resizevector.y;
                outputstroke.points.push(resizedpoint);
            });
        }
        else if (modifier == "NE") {
            var resizefactor_10 = new Vector(1 + (resizevector.x / (strokebox.maxX - strokebox.originx)), 1 + ((resizevector.y / (strokebox.maxY - strokebox.originy)) * -1));
            inputstroke.points.forEach(function (p) {
                var resizedpoint = _this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor_10.x, 0, 0, resizefactor_10.y);
                resizedpoint.x += strokebox.originx;
                resizedpoint.y += strokebox.originy + resizevector.y;
                outputstroke.points.push(resizedpoint);
            });
        }
        else if (modifier == "SE") {
            var resizefactor_11 = new Vector(1 + (resizevector.x / (strokebox.maxX - strokebox.originx)), 1 + (resizevector.y / (strokebox.maxY - strokebox.originy)));
            inputstroke.points.forEach(function (p) {
                var resizedpoint = _this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor_11.x, 0, 0, resizefactor_11.y);
                resizedpoint.x += strokebox.originx;
                resizedpoint.y += strokebox.originy;
                outputstroke.points.push(resizedpoint);
            });
        }
        else if (modifier == "SW") {
            var resizefactor_12 = new Vector(1 + ((resizevector.x / (strokebox.maxX - strokebox.originx)) * -1), 1 + (resizevector.y / (strokebox.maxY - strokebox.originy)));
            inputstroke.points.forEach(function (p) {
                var resizedpoint = _this.resizePoint(p.x - strokebox.originx, p.y - strokebox.originy, resizefactor_12.x, 0, 0, resizefactor_12.y);
                resizedpoint.x += strokebox.originx + resizevector.x;
                resizedpoint.y += strokebox.originy;
                outputstroke.points.push(resizedpoint);
            });
        }
        return outputstroke;
    };
    StateManager.prototype.resizeMulti = function (inputstrokes, boundingbox, resizevector, modifier) {
        var _this = this;
        var output = new Array();
        inputstrokes.forEach(function (inputstroke) {
            var outputstroke = new Stemstroke();
            outputstroke.objecttype = inputstroke.objecttype;
            if (modifier == "NW") {
                var resizefactor_13 = new Vector(1 + ((resizevector.x / (boundingbox.maxX - boundingbox.originx)) * -1), 1 + ((resizevector.y / (boundingbox.maxY - boundingbox.originy)) * -1));
                inputstroke.points.forEach(function (p) {
                    var resizedpoint = _this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor_13.x, 0, 0, resizefactor_13.y);
                    resizedpoint.x += boundingbox.originx + resizevector.x;
                    resizedpoint.y += boundingbox.originy + resizevector.y;
                    outputstroke.points.push(resizedpoint);
                });
            }
            else if (modifier == "NE") {
                var resizefactor_14 = new Vector(1 + (resizevector.x / (boundingbox.maxX - boundingbox.originx)), 1 + ((resizevector.y / (boundingbox.maxY - boundingbox.originy)) * -1));
                inputstroke.points.forEach(function (p) {
                    var resizedpoint = _this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor_14.x, 0, 0, resizefactor_14.y);
                    resizedpoint.x += boundingbox.originx;
                    resizedpoint.y += boundingbox.originy + resizevector.y;
                    outputstroke.points.push(resizedpoint);
                });
            }
            else if (modifier == "SE") {
                var resizefactor_15 = new Vector(1 + (resizevector.x / (boundingbox.maxX - boundingbox.originx)), 1 + (resizevector.y / (boundingbox.maxY - boundingbox.originy)));
                inputstroke.points.forEach(function (p) {
                    var resizedpoint = _this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor_15.x, 0, 0, resizefactor_15.y);
                    resizedpoint.x += boundingbox.originx;
                    resizedpoint.y += boundingbox.originy;
                    outputstroke.points.push(resizedpoint);
                });
            }
            else if (modifier == "SW") {
                var resizefactor_16 = new Vector(1 + ((resizevector.x / (boundingbox.maxX - boundingbox.originx)) * -1), 1 + (resizevector.y / (boundingbox.maxY - boundingbox.originy)));
                inputstroke.points.forEach(function (p) {
                    var resizedpoint = _this.resizePoint(p.x - boundingbox.originx, p.y - boundingbox.originy, resizefactor_16.x, 0, 0, resizefactor_16.y);
                    resizedpoint.x += boundingbox.originx + resizevector.x;
                    resizedpoint.y += boundingbox.originy;
                    outputstroke.points.push(resizedpoint);
                });
            }
            output.push(outputstroke);
        });
        return output;
    };
    StateManager.prototype.invertVector = function (x, y) {
        return new Vector(-x, -y);
    };
    return StateManager;
}());
var UndoActionTypes;
(function (UndoActionTypes) {
    UndoActionTypes[UndoActionTypes["movesingle"] = 0] = "movesingle";
    UndoActionTypes[UndoActionTypes["movemulti"] = 1] = "movemulti";
    UndoActionTypes[UndoActionTypes["resizesingle"] = 2] = "resizesingle";
    UndoActionTypes[UndoActionTypes["resizemulti"] = 3] = "resizemulti";
    UndoActionTypes[UndoActionTypes["coloursingle"] = 4] = "coloursingle";
    UndoActionTypes[UndoActionTypes["colourmulti"] = 5] = "colourmulti";
    UndoActionTypes[UndoActionTypes["newdraw"] = 6] = "newdraw";
    UndoActionTypes[UndoActionTypes["erase"] = 7] = "erase";
    UndoActionTypes[UndoActionTypes["erasemulti"] = 8] = "erasemulti";
    UndoActionTypes[UndoActionTypes["widthsingle"] = 9] = "widthsingle";
    UndoActionTypes[UndoActionTypes["widthmulti"] = 10] = "widthmulti";
})(UndoActionTypes || (UndoActionTypes = {}));
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
        this.multifresh = false;
        this.contextfresh = true;
        this.showFullContextMenu = false;
        this.drawingData = drawingData;
        this.currentlySelected = null;
        this.currentlySelectedMulti = null;
        this.fresh = false;
        this.debug = debug;
    }
    SelectionManager.prototype.FlushSelection = function () {
        this.currentSelectionID = null;
        this.currentlySelected = null;
        this.clipboard = null;
        this.currentlySelectedMulti = null;
        this.fresh = false;
        this.contextfresh = false;
        this.showFullContextMenu = false;
    };
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
    SelectionManager.prototype.getGroupBoundingBox = function () {
        var lowestx = 999999999999, lowesty = 999999999999, heighestx = -999999999999, heighesty = -999999999999;
        this.currentlySelectedMulti.forEach(function (s) {
            s.points.forEach(function (p) {
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
    SelectionManager.prototype.selectInsideBox = function (selectionbox) {
        var _this = this;
        this.currentlySelected = null;
        var selected = new Array();
        this.drawingData.forEach(function (s) {
            s.UpdateBoundingBox("");
            var first = s.points[0];
            var last = s.points[s.points.length - 1];
            var firstorlastinside = false;
            if (_this.PointInsideBoxCheck(first.x, first.y, selectionbox)) {
                firstorlastinside = true;
            }
            if (_this.PointInsideBoxCheck(last.x, last.y, selectionbox)) {
                firstorlastinside = true;
            }
            if (firstorlastinside) {
                selected.push(s);
            }
            if (selected.length == 1) {
                _this.multiBoundingBox = null;
                //do a normal selection
            }
            else if (selected.length > 1) {
                _this.currentlySelectedMulti = selected;
            }
            else {
                _this.multiBoundingBox = null;
                //select nothing
            }
        });
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
        this.currentlySelected = null;
        if (this.clipboard != null) {
            var indexofcopied = this.clipboard.strokeid;
            //orig
            this.drawingData.push(this.clipboard);
            this.currentlySelected = this.drawingData[this.drawingData.length - 1];
            this.fresh = false;
            this.currentSelectionID = this.currentlySelected.strokeid;
            this.clipboard = null; //clear it for now revisit      
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
    };
    SelectionManager.prototype.PointInsideBoxCheck = function (x, y, box) {
        if (x < box.originx || x > box.maxX) {
            return false;
        }
        if (y < box.originy || y > box.maxY) {
            return false;
        }
        //x and y must be within the bounds of the box now
        return true;
    };
    return SelectionManager;
}());
var Sessioninfo = /** @class */ (function () {
    function Sessioninfo() {
    }
    Sessioninfo.prototype.Sessioninfo = function () {
    };
    return Sessioninfo;
}());
var FileOutputPackage = /** @class */ (function () {
    function FileOutputPackage() {
    }
    return FileOutputPackage;
}());
//# sourceMappingURL=stemcanvas.js.map