var Stemcanvas = /** @class */ (function () {
    function Stemcanvas(canvasid) {
        var _this = this;
        this.pendetails = new Stempen();
        this.selectedTool = "DRAW"; //page loads with draw selected    
        this.previousSelectedTool = "DRAW";
        this.cursonOnCanvas = false;
        this.fillShapeSelected = false;
        this.drawsize = 4;
        this.halfdrawsize = 1.5; //we will pre compute half the draw size at a time when it doesnt need to be quick
        this.SelectedColour = "black";
        this.selectionPoints = new Array(5);
        this.hoveredSelectionPoint = ""; //topleft,topright,bottomright, bottomleft, center
        this.selectionHoverBoxSize = 20;
        this.ismovingobject = false;
        this.isresizingobject = false;
        this.isEnteringText = false;
        this.textEntered = "";
        this.multiselectionMinimumLength = 10; //the minimum lenght to select objects inside bounds
        //session info for file download:
        //session start time clock
        this.starttimeclock = "";
        //session start time performance
        this.starttimeperf = "";
        //session end time clock
        this.endtimeclock = "";
        //load the session details:   
        this.participant = sessionStorage.getItem("token");
        this.taskset = sessionStorage.getItem("taskset");
        this.devicetype = sessionStorage.getItem("devicetype");
        var sessioninfo = document.getElementById("sessioninfo");
        var attTasknumber = sessioninfo.attributes.getNamedItem("data-tasknumber");
        this.task = attTasknumber.value;
        document.getElementById("lblParticipant").innerText = "Participant: " + this.participant;
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
        this.loadAssets();
        this.id = canvasid;
        if (window.Worker) {
            this.renderCanvasWorker = new Worker('./js/rendercanvasworker.js');
        }
        this.tempcanvasBounce = document.getElementById("debugimage");
        this.drawing = new Array();
        this.redoStack = new Array();
        this.canvas = document.getElementById(canvasid);
        this.canvas.width = Stemcanvas.canvaswidth;
        this.canvas.height = Stemcanvas.canvasheight;
        this.canvasBuffer = new OffscreenCanvas(Stemcanvas.canvaswidth, Stemcanvas.canvasheight);
        this.ccontext = this.canvas.getContext("2d");
        this.ccontext.fillStyle = "white";
        this.ccontext.fillRect(0, 0, this.canvas.width, this.canvas.height);
        //canvas pointer events
        this.canvas.addEventListener("pointerenter", this.PointerEnterEvent.bind(this));
        this.canvas.addEventListener("pointermove", this.PointerMoveEvent.bind(this));
        this.canvas.addEventListener("pointerdown", this.PointerDownEvent.bind(this));
        this.canvas.addEventListener("pointerup", this.PointerUpEvent.bind(this));
        this.canvas.addEventListener("pointerleave", this.PointerLeaveEvent.bind(this));
        //catch all uncaught errors
        window.addEventListener('error', function (e) {
            console.log("error");
            //now reset so user can continue drawing: 
            _this.selectedDrawnObject = null;
            _this.selectedMultiDrawnObjects = null;
            _this.ismovingobject = false;
            _this.isresizingobject = false;
            _this.isEnteringText = false;
            _this.hoveredSelectionPoint = "";
            return true;
        });
        this.wireUpControls();
        //control events
        //screen tidyup:
        var canvascontainer = document.getElementById("canvas-scroll-container");
        var viewheight = window.innerHeight;
        console.log("viewheight = " + viewheight);
        var top = canvascontainer.offsetTop;
        console.log("top point of canvas container = " + top);
        var maxheight = viewheight - top;
        console.log("difference = " + maxheight);
        canvascontainer.style.maxHeight = maxheight - 15 + "px";
        // console.log(heightchange);
        // canvascontainer.style.maxHeight = (heightchange).toString()+"px";
        //begin canvas loop
        requestAnimationFrame(this.rendercanvascontent.bind(this));
        this.startTimer();
    }
    Stemcanvas.prototype.DeleteSelectedObject = function () {
    };
    Stemcanvas.prototype.wireUpControls = function () {
        var _this = this;
        this.wireUpDrawingControls();
        //background worker callback
        this.renderCanvasWorker.onmessage = function (e) {
            createImageBitmap(e.data).then(function (bmpimage) {
                _this.bufferimage = bmpimage;
            });
        };
        //DRAWING TOOLS BUTTONS
        //todo button icons are getting the events too :D, need to fix that
        var tools = document.getElementsByClassName("tool");
        for (var i = 0; i < tools.length; i++) {
            tools[i].addEventListener("click", function (e) {
                //store previous selected tool
                _this.previousSelectedTool = _this.selectedTool;
                var callerelement = e.target;
                _this.selectedTool = callerelement.innerText.split(/\r?\n/)[1];
                if (_this.selectedTool == _this.previousSelectedTool) {
                    return;
                }
                _this.currentStrokeData = null;
                // let alldroptownInputs = document.getElementsByClassName("dynamic");
                // for(let d = 0; d < alldroptownInputs.length; d++)
                // {
                //     alldroptownInputs[d].remove();
                // }              
                _this.selectedDrawnObject = null;
                _this.selectedMultiDrawnObjects = null;
                //unset all the tools (buttons, not the dynamic controls underneath them)
                for (var y = 0; y < tools.length; y++) {
                    tools[y].classList.remove("teal");
                    tools[y].classList.remove("darken-4");
                }
                //visual show user button selected
                callerelement.classList.add("teal");
                callerelement.classList.add("darken-4");
                //
                //hide the dynamic controls
                var dynamictools = document.getElementsByClassName("dynamichider");
                for (var i = 0; i < dynamictools.length; i++) {
                    var tool = dynamictools[i];
                    tool.classList.add("hide");
                }
                //reinit text sentinel
                _this.isEnteringText = false;
                var drawsize = document.getElementById("ctlDrawSize");
                var lbldrawsize = document.getElementById("drawing-size");
                if (_this.selectedTool == "TEXT") {
                    _this.isEnteringText = true;
                    _this.drawsize = 8;
                    drawsize.setAttribute("min", "8");
                    lbldrawsize.innerText = "Size: 8";
                }
                else if (_this.selectedTool == "SELECT") {
                }
                else if (_this.selectedTool == "DRAW") {
                    _this.currentStrokeData = null;
                }
                else if (_this.selectedTool == "RECTANGLE") {
                }
                else if (_this.selectedTool == "CIRCLE") {
                }
                if (_this.selectedTool == "TEXT") {
                }
                else {
                    drawsize.setAttribute("min", "1");
                }
            });
        }
        //stop page scrolling with touch devices
        this.canvas.addEventListener("click", function (e) {
            e.preventDefault();
        });
        this.canvas.addEventListener("mousedown", function (e) {
            e.preventDefault();
        });
        this.canvas.addEventListener("mousemove", function (e) {
            e.preventDefault();
        });
        this.canvas.addEventListener("touchstart", function (e) {
            e.preventDefault();
        });
        this.canvas.addEventListener("touchmove", function (e) {
            e.preventDefault();
        });
        this.canvas.addEventListener("pointerdown", function (e) {
            e.preventDefault();
        });
        this.canvas.addEventListener("pointermove", function (e) {
            e.preventDefault();
        });
        //undo/redo:
        document.getElementById("btnUndo").addEventListener("click", function () {
            if (_this.drawing.length > 0) {
                _this.redoStack.push(_this.drawing[_this.drawing.length - 1]);
                _this.drawing.pop();
                _this.selectedDrawnObject = null;
                _this.selectedMultiDrawnObjects = null;
                _this.UpdateBackgroundRender();
                _this.rendercanvascontent();
            }
        });
        document.getElementById("btnRedo").addEventListener("click", function () {
            if (_this.redoStack[_this.redoStack.length - 1] != null) {
                _this.drawing.push(_this.redoStack[_this.redoStack.length - 1]);
                _this.redoStack.pop();
                _this.UpdateBackgroundRender();
            }
        });
        document.getElementById("btnConfirmClear").addEventListener("click", function () {
            //clears complete drawing ,, but why are the rectangles still showing during render current stroke?
            _this.selectedDrawnObject = null;
            _this.selectedMultiDrawnObjects = null;
            _this.drawing = [];
            _this.currentStrokeData = null;
            _this.rendercanvascontent();
            _this.UpdateBackgroundRender();
            //todo reselect the draw tool
            // //id = btnDrawTool
            // let btnDrawTool = document.getElementById("btnDrawTool") as HTMLElement;
            // btnDrawTool.click();
        });
        //save button
        document.getElementById("btnSave").addEventListener("click", function () {
            var participantDeviceTask = _this.participant + " - " + _this.devicetype + " - " + _this.task;
            //download canvas, 
            _this.selectedDrawnObject = null;
            _this.rendercanvascontent();
            var image = _this.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            var anchor = document.createElement('a');
            anchor.setAttribute('download', "canvas - .png");
            anchor.setAttribute('href', image);
            anchor.click();
            //drawing data json, 
            //Export JSON BUTTON (REMOVE FOR PROD)
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(_this.drawing));
            anchor = document.createElement('a');
            anchor.setAttribute("href", dataStr);
            anchor.setAttribute("download", participantDeviceTask + " - drawingdata.json");
            anchor.click();
            //and session information
            var session = new Sessioninfo();
            session.start = _this.starttimeclock;
            session.end = new Date().toLocaleString();
            session.startperf = _this.starttimeperf;
            session.devicetype = _this.devicetype;
            session.task = _this.task;
            session.participanttoken = _this.participant;
            var sessionoutputstring = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session));
            anchor = document.createElement('a');
            anchor.setAttribute("href", sessionoutputstring);
            anchor.setAttribute("download", participantDeviceTask + " - sessioninfo.json");
            anchor.click();
        });
        document.getElementById("btnNext").addEventListener("click", function () {
            // let participantTask = `${this.participant} - ${this.task}`;
            // //download canvas, 
            // this.selectedDrawnObject = null;
            // this.rendercanvascontent();
            // let image = this.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            // var anchor = document.createElement('a');
            // anchor.setAttribute('download', `Canvas - ${this.participant} - ${this.task}.png`);
            // anchor.setAttribute('href', image);
            // anchor.click();
            // //drawing data json, 
            // var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.drawing));
            // anchor = document.createElement('a');
            // anchor.setAttribute("href", dataStr);
            // anchor.setAttribute("download", `${participantTask} - drawingdata.json`);
            // anchor.click();
            // //and session information
            // let session = new Sessioninfo();
            // session.start = this.starttimeclock
            // session.end = new Date().toLocaleString();
            // session.startperf = this.starttimeperf;
            // let sessionoutputstring = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session));
            // anchor = document.createElement('a');
            // anchor.setAttribute("href", sessionoutputstring);
            // anchor.setAttribute("download", `${participantTask} - sessioninfo.json`);
            // anchor.click();
            var participantDeviceTask = _this.participant + " - " + _this.devicetype + " - " + _this.task;
            console.log(participantDeviceTask);
            //download canvas, 
            _this.selectedDrawnObject = null;
            _this.rendercanvascontent();
            var image = _this.canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            var anchor = document.createElement('a');
            anchor.setAttribute('download', participantDeviceTask + ".png");
            anchor.setAttribute('href', image);
            anchor.click();
            //drawing data json, 
            //Export JSON BUTTON (REMOVE FOR PROD)
            var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(_this.drawing));
            anchor = document.createElement('a');
            anchor.setAttribute("href", dataStr);
            anchor.setAttribute("download", participantDeviceTask + " - drawingdata.json");
            anchor.click();
            //and session information
            var session = new Sessioninfo();
            session.start = _this.starttimeclock;
            session.end = new Date().toLocaleString();
            session.startperf = _this.starttimeperf;
            session.devicetype = _this.devicetype;
            session.task = _this.task;
            session.participanttoken = _this.participant;
            var sessionoutputstring = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session));
            anchor = document.createElement('a');
            anchor.setAttribute("href", sessionoutputstring);
            anchor.setAttribute("download", participantDeviceTask + " - sessioninfo.json");
            anchor.click();
            var currentquestionarray = _this.task.split('q');
            var currentquestion = parseInt(currentquestionarray[1]);
            location.href = "q" + (currentquestion + 1) + ".html";
        });
        //handle scrollbars
        var scrollcontainer = document.getElementById("canvas-scroll-container");
        scrollcontainer.addEventListener('scroll', function (e) {
            var scrollY = scrollcontainer.scrollTop;
            var scrollX = scrollcontainer.scrollLeft;
            _this.pendetails.scrollx = scrollX;
            _this.pendetails.scrolly = scrollY;
        });
        //text input modal stuff
        var btnAddText = document.getElementById("btnAddText");
        var btnCancel = document.getElementById("btnCancel");
        var textinputbox = document.getElementById("text-input-box");
        var textinput = document.getElementById("tbxInput");
        //todo, need to stop this if actually clicking inside the modal box
        var modelbackground = document.getElementById("text-input-modal");
        modelbackground.addEventListener('click', function (e) {
            //cancel the text input
            // modelbackground.classList.add("hide");
            // textinput.value = "";
        });
        btnCancel.addEventListener("click", function (e) {
            modelbackground.classList.add("hide");
            textinput.value = "";
        });
        btnAddText.addEventListener("click", function (e) {
            //add text object to drawing:
            if (textinput.value.length > 0) {
                var newtext = new StemText();
                var location_1 = new Stempoint(_this.pendetails.X, _this.pendetails.Y);
                newtext.points.push(location_1);
                newtext.text = textinput.value;
                newtext.strokecolour = _this.SelectedColour;
                newtext.strokewidth = _this.drawsize.toString();
                newtext.isFilled = true;
                var textsize = (parseInt(newtext.strokewidth)) * 2;
                _this.ccontext.font = textsize + "px Arial";
                var width = _this.ccontext.measureText(newtext.text);
                newtext.cachedBoundingBox = new StemstrokeBox();
                newtext.cachedBoundingBox.originx = newtext.points[0].x - 8;
                newtext.cachedBoundingBox.originy = newtext.points[0].y - 30;
                newtext.cachedBoundingBox.maxX = newtext.cachedBoundingBox.originx + width.width + 8;
                newtext.cachedBoundingBox.maxY = newtext.points[0].y + 15;
                _this.drawing.push(newtext);
                modelbackground.classList.add("hide");
                _this.UpdateBackgroundRender();
            }
        });
    };
    Stemcanvas.prototype.SelectedChangeUpdate = function () {
        //this updates the currently selected object        
        if (this.selectedDrawnObject == null) //sanity check
         {
            //this shouldnt happen
        }
        else {
            this.selectedDrawnObject.strokecolour = this.SelectedColour;
            this.selectedDrawnObject.strokewidth = this.drawsize.toString();
            this.selectedDrawnObject.isFilled = this.fillShapeSelected;
            //what about text? todo
            this.rendercanvascontent();
        }
    };
    Stemcanvas.prototype.wireUpDrawingControls = function () {
        var _this = this;
        //GLOBAL SIZE CONTROL
        var lbl_draw_size = document.getElementById("drawing-size");
        var draw_size = document.getElementById("ctlDrawSize");
        draw_size.addEventListener("change", function (e) {
            _this.drawsize = +draw_size.value;
            _this.halfdrawsize = _this.drawsize / 2; //calc this now to be quicker later on (save 1 op)
            lbl_draw_size.innerText = "Size: " + _this.drawsize;
            _this.SelectedChangeUpdate();
            _this.UpdateBackgroundRender();
        });
        //colourpickers        
        var draw_colour = document.getElementById("ctlInputColour");
        draw_colour.addEventListener("change", function (e) {
            _this.SelectedColour = draw_colour.value;
            _this.SelectedChangeUpdate();
            _this.UpdateBackgroundRender();
        });
        // let rectanglecolour = document.getElementById("rectangle_colour") as HTMLInputElement;
        // rectanglecolour.addEventListener("change",(e: InputEvent)=>{
        //     this.SelectedColour = rectanglecolour.value;
        // })
        // let circlecolour = document.getElementById("circle_colour") as HTMLInputElement;
        // circlecolour.addEventListener("change",(e: InputEvent)=>{
        //     this.SelectedColour = circlecolour.value;
        // })
        //SELECT CONTROLS //DRAW SELECTED
        // let selectdrawsize = document.getElementById("select_draw_size") as HTMLInputElement;
        // selectdrawsize.addEventListener("change", (e: InputEvent) => {
        //     document.getElementById("select_draw_size_label").innerText = "Pen Width: " + selectdrawsize.value;
        //     this.drawsize = +selectdrawsize.value;
        //     this.halfdrawsize = this.drawsize / 2; //calc this now to be quicker later on (save 1 op)
        //     this.SelectedChangeUpdate();
        //     this.UpdateBackgroundRender();
        // })
        // let selectdrawcolour = document.getElementById("select_draw_colour") as HTMLInputElement;
        // selectdrawcolour.addEventListener("change",(e: InputEvent)=>{
        //     this.SelectedColour = selectdrawcolour.value;
        //     this.SelectedChangeUpdate();
        //     this.UpdateBackgroundRender();
        // })
    };
    Stemcanvas.prototype.UpdateCurrentStrokeDataDynamics = function () {
        //this function gets called when user lefts off after drawing a stroke
        if (this.currentStrokeData == null) //sanity check
         {
            return;
        }
        this.currentStrokeData.strokewidth = this.drawsize.toString();
        this.currentStrokeData.strokecolour = this.SelectedColour;
    };
    Stemcanvas.prototype.rendercanvascontent = function () {
        //clear canvas        
        this.updateCurrentStroke(); //updates the current stroke data, does not draw -bug why though?
        this.renderClearCanvas(); //resets canvas  
        this.renderDrawingHistory(); //draws the buffer (everything that has been drawn)    
        this.renderSelectionControls(); //draws dotted bounding box around selected objecta and interaction points
        this.renderInterface();
        if (this.cursonOnCanvas) {
        }
        requestAnimationFrame(this.rendercanvascontent.bind(this)); //iterate
    };
    Stemcanvas.prototype.renderClearCanvas = function () {
        this.ccontext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ccontext.fillStyle = "white";
        this.ccontext.fillRect(0, 0, this.canvas.width, this.canvas.height);
    };
    ///Puts the current drawing data into the current stroke
    Stemcanvas.prototype.updateCurrentStroke = function () {
        if (this.pendetails.penDown) {
            //build current point and set details
            var currentpoint = new Stempoint(this.pendetails.X, this.pendetails.Y);
            currentpoint.press = this.pendetails.pressure;
            currentpoint.timestamp = performance.now();
            //add current point
            this.currentStrokeData.points.push(currentpoint);
        }
    };
    Stemcanvas.prototype.renderDrawingHistory = function () {
        if (this.bufferimage != null) {
            this.ccontext.drawImage(this.bufferimage, 0, 0);
        }
    };
    Stemcanvas.prototype.renderInterface = function () {
        this.renderCurrentStroke();
        this.renderCursor(this.pendetails.X, this.pendetails.Y);
    };
    Stemcanvas.prototype.renderObjectMovePreview = function () {
        var xvector = this.currentStrokeData.points[this.currentStrokeData.points.length - 1].x - this.currentStrokeData.points[0].x;
        var yvector = this.currentStrokeData.points[this.currentStrokeData.points.length - 1].y - this.currentStrokeData.points[0].y;
        if (this.selectedDrawnObject.objecttype == "DRAW") {
            //ORIGIN DISTANCE
            this.ccontext.beginPath();
            this.ccontext.strokeStyle = this.selectedDrawnObject.strokecolour;
            this.ccontext.lineWidth = parseInt(this.selectedDrawnObject.strokewidth);
            var strokeorigin = this.selectedDrawnObject.points[0];
            this.ccontext.moveTo(this.selectedDrawnObject.points[0].x + xvector, this.selectedDrawnObject.points[0].y + yvector);
            for (var i = 1; i < this.selectedDrawnObject.points.length; i++) {
                this.ccontext.lineTo(this.selectedDrawnObject.points[i].x + xvector, this.selectedDrawnObject.points[i].y + yvector);
            }
            // var xc = (this.currentStroke.points[i].x + this.currentStroke.points[i+1].x) / 2;
            //     var yc = (this.currentStroke.points[i].y + this.currentStroke.points[i+1].y) / 2;
            this.ccontext.stroke();
            //test
        }
        else {
            if (this.selectedDrawnObject.objecttype == "CIRCLE") {
                /////////////////////////////////////
                this.ccontext.closePath();
                this.ccontext.beginPath();
                var tempcircle_1 = new StemCircle();
                this.selectedDrawnObject.points.forEach(function (element) {
                    tempcircle_1.points.push(element);
                });
                var minx = tempcircle_1.points[0].x + xvector;
                var maxx = tempcircle_1.points[tempcircle_1.points.length - 1].x + xvector;
                var miny = tempcircle_1.points[0].y + yvector;
                var maxy = tempcircle_1.points[tempcircle_1.points.length - 1].y + yvector;
                //pythag to get radius
                var alength = (maxx - minx);
                var blength = (maxy - miny);
                var radius = Math.sqrt((alength * alength) + (blength * blength));
                this.ccontext.arc(minx, miny, radius, 0, 360);
                this.ccontext.stroke();
                this.ccontext.closePath();
                ////////////////////////////////////
            }
            else if (this.selectedDrawnObject.objecttype == "RECTANGLE") {
                this.ccontext.closePath();
                this.ccontext.beginPath();
                var temprect_1 = new StemRectangle();
                this.selectedDrawnObject.points.forEach(function (p) {
                    var point = new Stempoint(p.x + xvector, p.y + yvector);
                    temprect_1.points.push(point);
                });
                temprect_1.UpdateBoundingBox("h");
                var tempbox = temprect_1.getCachedBoundingBox();
                this.ccontext.closePath();
                this.ccontext.beginPath();
                this.ccontext.moveTo(tempbox.originx, tempbox.originy); //start top left
                this.ccontext.lineTo(tempbox.maxX, tempbox.originy); //line to top right
                this.ccontext.lineTo(tempbox.maxX, tempbox.maxY); //line to bottom right
                this.ccontext.lineTo(tempbox.originx, tempbox.maxY); //line to bottom left
                this.ccontext.lineTo(tempbox.originx, tempbox.originy); //line back to top left
                this.ccontext.stroke();
                this.ccontext.closePath();
            }
            else if (this.selectedDrawnObject.objecttype == "TEXT") {
                var textobj = this.selectedDrawnObject;
                this.ccontext.closePath();
                this.ccontext.beginPath();
                this.ccontext.font = parseInt(textobj.strokewidth) * 2 + "px Arial";
                this.ccontext.fillText(textobj.text, this.selectedDrawnObject.points[0].x + xvector, this.selectedDrawnObject.points[0].y + yvector);
                this.ccontext.stroke();
                this.ccontext.closePath();
            }
        }
        this.ccontext.closePath();
    };
    Stemcanvas.prototype.renderMultiObjectMovePreview = function () {
        //todo
    };
    Stemcanvas.prototype.renderObjectResizePreview = function () {
        if (this.selectedDrawnObject != null) {
            this.selectedDrawnObject.UpdateBoundingBox("renderObjectResizePreview");
            var strokebox = this.selectedDrawnObject.getCachedBoundingBox();
            var strokewidth = (strokebox.maxX - strokebox.originx);
            var strokeheight = (strokebox.maxY - strokebox.originy);
            var first = this.currentStrokeData.points[0];
            var last = this.currentStrokeData.points[this.currentStrokeData.points.length - 1];
            var resizewidth = ((last.x) - (first.x));
            var resizeheight = ((last.y) - (first.y));
            if (this.hoveredSelectionPoint == "NE") {
                resizeheight = resizeheight * -1;
            }
            if (this.hoveredSelectionPoint == "SW") {
                resizewidth = resizewidth * -1;
            }
            if (this.hoveredSelectionPoint == "NW") {
                resizewidth = resizewidth * -1;
                resizeheight = resizeheight * -1;
            }
            var xfactor = 1 + (resizewidth / strokewidth); //remove padding
            var yfactor = 1 + (resizeheight / strokeheight);
            if (this.selectedDrawnObject.objecttype == "DRAW") {
                //get the resize factor
                if (this.currentStrokeData == null) {
                    return;
                }
                this.selectedDrawnObject.UpdateBoundingBox("renderObjectResizePreview");
                this.ccontext.beginPath();
                this.ccontext.strokeStyle = this.selectedDrawnObject.strokecolour;
                this.ccontext.lineWidth = parseInt(this.selectedDrawnObject.strokewidth);
                for (var i = 0; i < this.selectedDrawnObject.points.length; i++) {
                    if (this.hoveredSelectionPoint == "NE") {
                        var currentpoint = this.selectedDrawnObject.points[i];
                        var transformedpoint = this.TransformPoint(currentpoint.x - (strokebox.originx), currentpoint.y - (strokebox.maxY), xfactor, 0, 0, yfactor, 0, 0);
                        this.ccontext.lineTo(transformedpoint.x + (strokebox.originx), transformedpoint.y + (strokebox.maxY));
                    }
                    else if (this.hoveredSelectionPoint == "SE") {
                        var currentpoint = this.selectedDrawnObject.points[i];
                        var transformedpoint = this.TransformPoint(currentpoint.x - (strokebox.originx), currentpoint.y - (strokebox.originy), xfactor, 0, 0, yfactor, 0, 0);
                        this.ccontext.lineTo(transformedpoint.x + (strokebox.originx), transformedpoint.y + (strokebox.originy));
                    }
                    else if (this.hoveredSelectionPoint == "SW") {
                        var currentpoint = this.selectedDrawnObject.points[i];
                        var transformedpoint = this.TransformPoint(currentpoint.x - (strokebox.maxX), currentpoint.y - (strokebox.originy), xfactor, 0, 0, yfactor, 0, 0);
                        this.ccontext.lineTo(transformedpoint.x + (strokebox.maxX), transformedpoint.y + (strokebox.originy));
                    }
                    else if (this.hoveredSelectionPoint == "NW") {
                        var currentpoint = this.selectedDrawnObject.points[i];
                        var transformedpoint = this.TransformPoint(currentpoint.x - (strokebox.maxX), currentpoint.y - (strokebox.maxY), xfactor, 0, 0, yfactor, 0, 0);
                        this.ccontext.lineTo(transformedpoint.x + (strokebox.maxX), transformedpoint.y + (strokebox.maxY));
                    }
                }
                this.ccontext.stroke();
                this.ccontext.closePath();
            }
            else if (this.selectedDrawnObject.objecttype == "RECTANGLE") {
                this.selectedDrawnObject.UpdateBoundingBox("blah");
                var box = this.selectedDrawnObject.getCachedBoundingBox();
                var minx = box.originx;
                var maxx = box.maxX;
                var miny = box.originy;
                var maxy = box.maxY;
                if (this.hoveredSelectionPoint == "NE") {
                    var transmin = this.TransformPoint((minx - strokebox.originx), (miny - strokebox.maxY), xfactor, 0, 0, yfactor, minx, maxy);
                    var transmax = this.TransformPoint((maxx - strokebox.originx), (maxy - strokebox.maxY), xfactor, 0, 0, yfactor, minx, maxy);
                    this.ccontext.closePath();
                    this.ccontext.beginPath();
                    this.ccontext.moveTo(transmin.x, transmin.y); //start top left
                    this.ccontext.lineTo(transmax.x, transmin.y); //line to top right
                    this.ccontext.lineTo(transmax.x, transmax.y); //line to bottom right
                    this.ccontext.lineTo(transmin.x, transmax.y); //line to bottom left
                    this.ccontext.lineTo(transmin.x, transmin.y); //line back to top left
                    this.ccontext.stroke();
                    this.ccontext.closePath();
                }
                else if (this.hoveredSelectionPoint == "SE") {
                    var transmin = this.TransformPoint((minx - strokebox.originx), (miny - strokebox.originy), xfactor, 0, 0, yfactor, minx, miny);
                    var transmax = this.TransformPoint((maxx - strokebox.originx), (maxy - strokebox.originy), xfactor, 0, 0, yfactor, minx, miny);
                    this.ccontext.closePath();
                    this.ccontext.beginPath();
                    this.ccontext.moveTo(transmin.x, transmin.y); //start top left
                    this.ccontext.lineTo(transmax.x, transmin.y); //line to top right
                    this.ccontext.lineTo(transmax.x, transmax.y); //line to bottom right
                    this.ccontext.lineTo(transmin.x, transmax.y); //line to bottom left
                    this.ccontext.lineTo(transmin.x, transmin.y); //line back to top left
                    this.ccontext.stroke();
                    this.ccontext.closePath();
                }
                else if (this.hoveredSelectionPoint == "SW") {
                    var transmin = this.TransformPoint((minx - strokebox.maxX), (miny - strokebox.originy), xfactor, 0, 0, yfactor, maxx, miny);
                    var transmax = this.TransformPoint((maxx - strokebox.maxX), (maxy - strokebox.originy), xfactor, 0, 0, yfactor, maxx, miny);
                    this.ccontext.closePath();
                    this.ccontext.beginPath();
                    this.ccontext.moveTo(transmin.x, transmin.y); //start top left
                    this.ccontext.lineTo(transmax.x, transmin.y); //line to top right
                    this.ccontext.lineTo(transmax.x, transmax.y); //line to bottom right
                    this.ccontext.lineTo(transmin.x, transmax.y); //line to bottom left
                    this.ccontext.lineTo(transmin.x, transmin.y); //line back to top left
                    this.ccontext.stroke();
                    this.ccontext.closePath();
                }
                else if (this.hoveredSelectionPoint == "NW") {
                    var transmin = this.TransformPoint((minx - strokebox.maxX), (miny - strokebox.maxY), xfactor, 0, 0, yfactor, maxx, maxy);
                    var transmax = this.TransformPoint((maxx - strokebox.maxX), (maxy - strokebox.maxY), xfactor, 0, 0, yfactor, maxx, maxy);
                    this.ccontext.closePath();
                    this.ccontext.beginPath();
                    this.ccontext.moveTo(transmin.x, transmin.y); //start top left
                    this.ccontext.lineTo(transmax.x, transmin.y); //line to top right
                    this.ccontext.lineTo(transmax.x, transmax.y); //line to bottom right
                    this.ccontext.lineTo(transmin.x, transmax.y); //line to bottom left
                    this.ccontext.lineTo(transmin.x, transmin.y); //line back to top left
                    this.ccontext.stroke();
                    this.ccontext.closePath();
                }
            }
            else if (this.selectedDrawnObject.objecttype == "CIRCLE") {
                var firstpoint = this.selectedDrawnObject.points[0];
                var lastpoint = this.selectedDrawnObject.points[this.selectedDrawnObject.points.length - 1];
                strokewidth = Math.abs(firstpoint.x - lastpoint.x);
                strokeheight = Math.abs(firstpoint.y - lastpoint.y);
                if (this.hoveredSelectionPoint == "P") {
                    resizeheight = resizeheight * -1; //invert y                
                }
                var circlexfactor = 1 + (resizewidth / strokewidth); //remove padding
                var circleyfactor = 1 + (resizeheight / strokeheight);
                this.ccontext.beginPath();
                var newfinal = this.TransformPoint(lastpoint.x - (firstpoint.x), lastpoint.y - (firstpoint.y), circlexfactor, 0, 0, circleyfactor, 0, 0);
                newfinal.x = newfinal.x + firstpoint.x;
                newfinal.y = newfinal.y + firstpoint.y;
                var newwidth = Math.abs(newfinal.x - firstpoint.x);
                var newheight = Math.abs(newfinal.y - firstpoint.y);
                //now get the length using pythag
                var radius = Math.sqrt((newwidth * newwidth) + (newheight * newheight));
                this.ccontext.beginPath();
                this.ccontext.arc(firstpoint.x, firstpoint.y, radius, 0, 20);
                this.ccontext.stroke();
                this.ccontext.closePath();
            }
            else if (this.selectedDrawnObject.objecttype == "TEXT") {
            }
        }
        else {
            //lets try the multiselect method
        }
    };
    Stemcanvas.prototype.renderCurrentStroke = function () {
        this.ccontext.closePath();
        // this.ccontext.beginPath();
        if (this.ismovingobject) {
            if (this.selectedDrawnObject == null) {
                if (this.selectedMultiDrawnObjects == null) {
                }
                else {
                    this.renderMultiObjectMovePreview();
                }
            }
            else {
                this.renderObjectMovePreview();
            }
        }
        if (this.isresizingobject) {
            this.renderObjectResizePreview();
        }
        if (this.currentStrokeData == null) {
            return;
        }
        this.ccontext.lineCap = "round";
        this.ccontext.lineJoin = "round";
        this.ccontext.lineWidth = this.drawsize;
        this.ccontext.strokeStyle = this.SelectedColour;
        // if (this.isEnteringText) {
        //     let x = this.currentStrokeData.points[this.currentStrokeData.points.length - 1].x;
        //     let y = this.currentStrokeData.points[this.currentStrokeData.points.length - 1].y;
        //     let fontsize = this.drawsize * 2;
        //     this.ccontext.fillStyle = this.SelectedColour;
        //     this.ccontext.font = `${fontsize}px Arial`;
        //     this.ccontext.fillText(this.textEntered, x, y);
        // }
        if (this.selectedTool == "DRAW") {
            this.ccontext.closePath();
            this.ccontext.beginPath();
            // this.ccontext.moveTo(this.currentStrokeData.points[0].x, this.currentStrokeData.points[0].y);
            if (this.currentStrokeData.points != null && this.currentStrokeData.points.length > 1) {
                for (var i = 0; i < this.currentStrokeData.points.length; i++) {
                    this.ccontext.lineTo(this.currentStrokeData.points[i].x, this.currentStrokeData.points[i].y);
                }
                this.ccontext.stroke();
            }
            this.ccontext.closePath();
        }
        else if (this.selectedTool == "RECTANGLE") {
            this.ccontext.closePath();
            this.ccontext.beginPath();
            this.currentRectangle = new StemRectangle();
            this.currentRectangle.points = this.currentStrokeData.points;
            var minx = this.currentRectangle.points[0].x;
            var maxx = this.currentRectangle.points[this.currentRectangle.points.length - 1].x;
            var miny = this.currentRectangle.points[0].y;
            var maxy = this.currentRectangle.points[this.currentRectangle.points.length - 1].y;
            this.ccontext.moveTo(minx, miny); //start top left
            this.ccontext.lineTo(maxx, miny); //line to top right
            this.ccontext.lineTo(maxx, maxy); //line to bottom right
            this.ccontext.lineTo(minx, maxy); //line to bottom left
            this.ccontext.lineTo(minx, miny); //line back to top left
            this.ccontext.stroke();
            this.ccontext.closePath();
        }
        else if (this.selectedTool == "CIRCLE") {
            this.ccontext.closePath();
            this.ccontext.beginPath();
            this.currentCircle = new StemCircle();
            this.currentCircle.points = this.currentStrokeData.points;
            var minx = this.currentStrokeData.points[0].x;
            var maxx = this.currentStrokeData.points[this.currentStrokeData.points.length - 1].x;
            var miny = this.currentStrokeData.points[0].y;
            var maxy = this.currentStrokeData.points[this.currentStrokeData.points.length - 1].y;
            //pythag to get radius
            var alength = maxx - minx;
            var blength = maxy - miny;
            var radius = Math.sqrt((alength * alength) + (blength * blength));
            this.ccontext.arc(minx, miny, radius, 0, 360);
            this.ccontext.stroke();
            this.ccontext.closePath();
        }
        else if (this.selectedTool == "LINE") {
            this.ccontext.closePath();
            this.ccontext.beginPath();
            if (this.currentStrokeData.points != null && this.currentStrokeData.points.length > 1) {
                this.ccontext.lineWidth = this.drawsize;
                this.ccontext.strokeStyle = this.SelectedColour;
                this.ccontext.moveTo(this.currentStrokeData.points[0].x, this.currentStrokeData.points[0].y);
                this.ccontext.lineTo(this.currentStrokeData.points[this.currentStrokeData.points.length - 1].x, this.currentStrokeData.points[this.currentStrokeData.points.length - 1].y);
                this.ccontext.stroke();
                this.ccontext.closePath();
            }
        }
        //
        this.ccontext.closePath();
    };
    Stemcanvas.prototype.renderMultiSelectionPreview = function () {
        if (this.currentStrokeData != null && this.pendetails.penDown && this.hoveredSelectionPoint == "") {
            if (this.currentStrokeData.length() > this.multiselectionMinimumLength) {
                var first = this.currentStrokeData.points[0];
                var last = this.currentStrokeData.points[this.currentStrokeData.points.length - 1];
                //draw the multi-selection bounds
                this.ccontext.closePath();
                this.ccontext.beginPath();
                this.ccontext.lineWidth = 1;
                this.ccontext.setLineDash([6]);
                this.ccontext.moveTo(first.x, first.y);
                this.ccontext.lineTo(last.x, first.y);
                this.ccontext.lineTo(last.x, last.y);
                this.ccontext.lineTo(first.x, last.y);
                this.ccontext.lineTo(first.x, first.y);
                this.ccontext.stroke();
                this.ccontext.closePath();
                this.ccontext.setLineDash([0]);
            }
        }
    };
    Stemcanvas.prototype.renderCursor = function (x, y) {
        if (!this.cursonOnCanvas) {
            return;
        }
        if (this.selectedTool == "SELECT") {
            if (this.selectedDrawnObject != null || this.selectedMultiDrawnObjects != null) {
                // this.ccontext.drawImage(this.cursPointer,x,y,18,18);      
                if (this.hoveredSelectionPoint == "C") {
                    this.ccontext.drawImage(this.cursMove, x, y, 27, 18);
                }
                else if (this.hoveredSelectionPoint == "NE") {
                    this.ccontext.drawImage(this.cursNE, x, y, 27, 18);
                }
                else if (this.hoveredSelectionPoint == "NW") {
                    this.ccontext.drawImage(this.cursNW, x, y, 27, 18);
                }
                else if (this.hoveredSelectionPoint == "SW") {
                    this.ccontext.drawImage(this.cursNE, x, y, 27, 18);
                }
                else if (this.hoveredSelectionPoint == "SE") {
                    this.ccontext.drawImage(this.cursNW, x, y, 27, 18);
                }
                else if (this.hoveredSelectionPoint == "P") //circle perimeter
                 {
                    this.ccontext.drawImage(this.cursNE, x, y, 27, 18);
                }
                else {
                    this.ccontext.drawImage(this.cursPointer, x, y, 18, 18);
                }
            }
            else {
                this.ccontext.drawImage(this.cursPointer, x, y, 18, 18);
            }
            this.renderMultiSelectionPreview();
        }
        else if (this.selectedTool == "DRAW") {
            this.ccontext.drawImage(this.cursDraw, x, y, 22, 22);
        }
        else if (this.selectedTool == "CIRCLE") {
            this.ccontext.drawImage(this.cursCircle, x, y, 27, 20);
        }
        else if (this.selectedTool == "TEXT") {
            var textsize = this.drawsize * 2;
            this.ccontext.font = textsize + "px Arial";
            var textwidth = this.ccontext.measureText(this.textEntered).width;
            this.ccontext.lineWidth = 1.5;
            this.ccontext.strokeStyle = "black";
            this.ccontext.beginPath();
            this.ccontext.setLineDash([6]);
            this.ccontext.moveTo(x - 8, y + 15); //bottomleft      
            this.ccontext.lineTo(x + textwidth + 8, y + 15); //bottom right
            this.ccontext.lineTo(x + textwidth + 8, y - 30); //top right
            this.ccontext.lineTo(x - 8, y - 30); //top left
            this.ccontext.lineTo(x - 8, y + 15); //bottom left again
            this.ccontext.drawImage(this.cursType, x - 5, y - 16, 8, 16);
            this.ccontext.stroke();
            this.ccontext.setLineDash([0]);
            this.ccontext.fillStyle = this.SelectedColour;
            this.ccontext.fillText(this.textEntered, x, y);
            this.ccontext.closePath();
        }
        else if (this.selectedTool == "RECTANGLE") {
            this.ccontext.drawImage(this.cursRect, x, y, 26, 20);
        }
        else if (this.selectedTool == "ERASE") {
            this.ccontext.drawImage(this.cursErase, x, y, 25, 17);
        }
        else if (this.selectedTool == "LINE") {
            this.ccontext.drawImage(this.cursDraw, x, y, 22, 22);
        }
    };
    Stemcanvas.prototype.renderSelectionControls = function () {
        if (this.selectedDrawnObject != null) {
            this.selectedDrawnObject.UpdateBoundingBox("renderSelectionControls");
            var box = this.selectedDrawnObject.getCachedBoundingBox();
            this.ccontext.closePath();
            this.ccontext.beginPath();
            if (this.selectedDrawnObject.objecttype == "CIRCLE") {
                var lastpoint = this.selectedDrawnObject.points[this.selectedDrawnObject.points.length - 1];
                var minx = box.originx;
                var maxx = box.maxX;
                var miny = box.originy;
                var maxy = box.maxY;
                this.ccontext.fillStyle = "black";
                this.ccontext.fillRect(((minx + maxx) / 2) - 4, ((miny + maxy) / 2) - 4, 8, 8);
                this.ccontext.fillRect(lastpoint.x - 4, lastpoint.y - 4, 8, 8);
            }
            else {
                var minx = box.originx;
                var maxx = box.maxX;
                var miny = box.originy;
                var maxy = box.maxY;
                var topleft = new Point(minx, miny);
                var topright = new Point(maxx, miny);
                var bottomright = new Point(maxx, maxy);
                var bottomleft = new Point(minx, maxy);
                this.ccontext.moveTo(topleft.x, topleft.y); //start top left            
                this.ccontext.lineTo(topright.x, topright.y); //line to top right
                this.ccontext.lineTo(bottomright.x, bottomright.y); //line to bottom right
                this.ccontext.lineTo(bottomleft.x, bottomleft.y); //line to bottom left
                this.ccontext.lineTo(topleft.x, topleft.y); //line back to top left            
                this.ccontext.lineWidth = 1;
                this.ccontext.setLineDash([6]);
                this.ccontext.strokeStyle = "black";
                this.ccontext.stroke();
                this.ccontext.lineWidth = this.drawsize;
                this.ccontext.setLineDash([1]);
                this.ccontext.fillStyle = "black";
                this.ccontext.fillRect(minx - 4, miny - 4, 8, 8);
                this.ccontext.fillRect(maxx - 4, miny - 4, 8, 8);
                this.ccontext.fillRect(minx - 4, maxy - 4, 8, 8);
                this.ccontext.fillRect(maxx - 4, maxy - 4, 8, 8);
                // this.ccontext.fillRect(((minx + maxx) / 2) - 4, ((miny + maxy) / 2) - 4, 8, 8);
            }
            this.ccontext.closePath();
        }
        if (this.selectedMultiDrawnObjects != null) {
            //draw the selection controls for all selected objects:
            this.ccontext.closePath();
            this.ccontext.beginPath();
            this.ccontext.moveTo(this.selectedMultiDrawnObjects.minx, this.selectedMultiDrawnObjects.miny); //start top left            
            this.ccontext.lineTo(this.selectedMultiDrawnObjects.maxx, this.selectedMultiDrawnObjects.miny); //line to top right
            this.ccontext.lineTo(this.selectedMultiDrawnObjects.maxx, this.selectedMultiDrawnObjects.maxy); //line to bottom right
            this.ccontext.lineTo(this.selectedMultiDrawnObjects.minx, this.selectedMultiDrawnObjects.maxy); //line to bottom left
            this.ccontext.lineTo(this.selectedMultiDrawnObjects.minx, this.selectedMultiDrawnObjects.miny); //line back to top left            
            this.ccontext.lineWidth = 1;
            this.ccontext.setLineDash([6]);
            this.ccontext.strokeStyle = "black";
            this.ccontext.stroke();
            this.ccontext.lineWidth = this.drawsize;
            this.ccontext.setLineDash([0]);
            this.ccontext.closePath();
            this.ccontext.fillStyle = "black";
            this.ccontext.fillRect(this.selectedMultiDrawnObjects.minx - 4, this.selectedMultiDrawnObjects.miny - 4, 8, 8);
            this.ccontext.fillRect(this.selectedMultiDrawnObjects.maxx - 4, this.selectedMultiDrawnObjects.miny - 4, 8, 8);
            this.ccontext.fillRect(this.selectedMultiDrawnObjects.minx - 4, this.selectedMultiDrawnObjects.maxy - 4, 8, 8);
            this.ccontext.fillRect(this.selectedMultiDrawnObjects.maxx - 4, this.selectedMultiDrawnObjects.maxy - 4, 8, 8);
        }
        //todo check if multiselect is present
    };
    Stemcanvas.prototype.PointerEnterEvent = function (e) {
        this.pendetails.X = e.pageX - this.canvas.offsetLeft + this.pendetails.scrollx;
        this.pendetails.Y = e.pageY - this.canvas.offsetTop + this.pendetails.scrolly;
        this.pendetails.pressure = e.pressure;
        this.cursonOnCanvas = true;
        //todo handle clickdragging off the canvas and then returning in an unclicking state        
    };
    Stemcanvas.prototype.PointerMoveEvent = function (e) {
        this.pendetails.X = e.pageX - this.canvas.offsetLeft + this.pendetails.scrollx;
        this.pendetails.Y = e.pageY - this.canvas.offsetTop + this.pendetails.scrolly;
        this.pendetails.pressure = e.pressure;
        //now check if the cursor is over a selection-hover-point
        if (this.selectedDrawnObject != null) {
            if (this.pendetails.penDown) {
                return;
            }
            var box = this.selectedDrawnObject.getCachedBoundingBox();
            //check if pen is near the selected object:
            //it does, so now check if the cursor is actuall on top of one of the interaction elements:
            //get center point of box:
            var centerx = (box.maxX + box.originx) / 2;
            var centery = (box.maxY + box.originy) / 2;
            if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, box.originx, box.originy, this.selectionHoverBoxSize)) {
                this.hoveredSelectionPoint = "NW";
            }
            else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, box.maxX, box.originy, this.selectionHoverBoxSize)) {
                this.hoveredSelectionPoint = "NE"; //not near any selection points
            }
            else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, box.maxX, box.maxY, this.selectionHoverBoxSize)) {
                this.hoveredSelectionPoint = "SE"; //not near any selection points
            }
            else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, box.originx, box.maxY, this.selectionHoverBoxSize)) {
                this.hoveredSelectionPoint = "SW";
            }
            else if (box.DoesIntersect(this.pendetails.X, this.pendetails.Y)) {
                this.hoveredSelectionPoint = "C";
            }
            else {
                this.hoveredSelectionPoint = "";
            }
            if (this.selectedDrawnObject.objecttype == "CIRCLE") {
                var lastpoint = this.selectedDrawnObject.points[this.selectedDrawnObject.points.length - 1];
                if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, lastpoint.x, lastpoint.y, 16)) {
                    this.hoveredSelectionPoint = "P"; //not near any selection points                        
                }
                else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, centerx, centery, this.selectionHoverBoxSize)) {
                    this.hoveredSelectionPoint = "C";
                }
                else {
                    this.hoveredSelectionPoint = "";
                }
            }
            if (this.ismovingobject) {
                var endpoint = new Stempoint(this.pendetails.X, this.pendetails.Y);
                this.currentMove.endPoint = endpoint;
            }
            if (this.isresizingobject) {
                var endpoint = new Stempoint(this.pendetails.X, this.pendetails.Y);
                this.currentResize.endPoint = endpoint;
            }
        }
        if (this.selectedMultiDrawnObjects != null) {
            if (this.selectedMultiDrawnObjects.doesIntersect(this.pendetails.X, this.pendetails.Y)) {
                this.hoveredSelectionPoint = "C";
            }
            else {
                this.hoveredSelectionPoint = "";
            }
            if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, this.selectedMultiDrawnObjects.minx, this.selectedMultiDrawnObjects.miny, this.selectionHoverBoxSize)) {
                this.hoveredSelectionPoint = "NW";
            }
            else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, this.selectedMultiDrawnObjects.maxx, this.selectedMultiDrawnObjects.miny, this.selectionHoverBoxSize)) {
                this.hoveredSelectionPoint = "NE"; //not near any selection points
            }
            else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, this.selectedMultiDrawnObjects.maxx, this.selectedMultiDrawnObjects.maxy, this.selectionHoverBoxSize)) {
                this.hoveredSelectionPoint = "SE"; //not near any selection points
            }
            else if (helper.IsPointInsideBoxAtPoint(this.pendetails.X, this.pendetails.Y, this.selectedMultiDrawnObjects.minx, this.selectedMultiDrawnObjects.maxy, this.selectionHoverBoxSize)) {
                this.hoveredSelectionPoint = "SW"; //not near any selection points
            }
        }
    };
    Stemcanvas.prototype.PointerUpEvent = function (e) {
        var _this = this;
        var _a;
        this.pendetails.penDown = false;
        //push current stroke to the whole drawing
        //render background canvas (async if we can?)
        this.UpdateCurrentStrokeDataDynamics();
        if (this.selectedTool == "DRAW") {
            this.currentStrokeData.UpdateBoundingBox("PointerUpEvent 'DRAW'");
            this.drawing.push(this.currentStrokeData);
            this.currentStrokeData = null;
        }
        else if (this.selectedTool == "TEXT") {
            //show text entry pop over 
            var customcontainer = document.getElementById("canvas-scroll-container");
            // let popupdiv = document.createElement()
            var textinputdiv = document.getElementById("text-input-modal");
            textinputdiv.classList.remove("hide");
            var canvasposition = this.canvas.getBoundingClientRect();
            var inputbox = document.getElementById("text-input-box");
            inputbox.style.left = (this.pendetails.X + 5 - this.pendetails.scrollx).toString() + "px";
            inputbox.style.top = (canvasposition.top + this.pendetails.Y - 45).toString() + "px";
        }
        else if (this.selectedTool == "RECTANGLE") {
            if (this.currentRectangle != null) {
                this.currentRectangle.strokecolour = this.currentStrokeData.strokecolour;
                this.currentRectangle.strokewidth = this.currentStrokeData.strokewidth;
                this.currentRectangle.isFilled = this.currentStrokeData.isFilled;
                this.drawing.push(this.currentRectangle);
            }
            this.selectedDrawnObject = this.currentRectangle;
            this.currentRectangle = null;
        }
        else if (this.selectedTool == "CIRCLE") {
            if (this.currentCircle != null) {
                this.currentCircle.strokecolour = this.currentStrokeData.strokecolour;
                this.currentCircle.strokewidth = this.currentStrokeData.strokewidth;
                this.currentCircle.isFilled = this.currentStrokeData.isFilled;
                this.drawing.push(this.currentCircle);
                this.selectedDrawnObject = this.currentCircle;
            }
            this.currentCircle = null;
        }
        else if (this.selectedTool == "SELECT") {
            if (this.ismovingobject) {
                this.currentMove.startPoint = this.currentStrokeData.points[0];
                this.currentMove.endPoint = this.currentStrokeData.points[this.currentStrokeData.points.length - 1];
                //now find the stored stroke, and move all its points
                var xvector_1 = this.currentMove.endPoint.x - this.currentMove.startPoint.x;
                var yvector_1 = this.currentMove.endPoint.y - this.currentMove.startPoint.y;
                (_a = this.selectedDrawnObject) === null || _a === void 0 ? void 0 : _a.strokeid;
                //loop through drawing to find the right object
                this.drawing.forEach(function (stemobj) {
                    if (stemobj.strokeid == _this.selectedDrawnObject.strokeid) //affect only the selected object
                     {
                        stemobj.points.forEach(function (p) {
                            p.x += xvector_1;
                            p.y += yvector_1;
                        });
                        //because the textobject bounding box is created at mouse up, we also need to translate that too
                        if (stemobj.objecttype == "TEXT") {
                            stemobj.cachedBoundingBox.originx += xvector_1;
                            stemobj.cachedBoundingBox.originy += yvector_1;
                            stemobj.cachedBoundingBox.maxX += xvector_1;
                            stemobj.cachedBoundingBox.maxY += yvector_1;
                        }
                    }
                });
                this.ismovingobject = false;
                //this.selectedDrawnObject = null;
                this.currentMove = null;
            }
            else if (this.isresizingobject) {
                this.selectedDrawnObject.UpdateBoundingBox("renderObjectResizePreview");
                var strokebox = this.selectedDrawnObject.getCachedBoundingBox();
                var strokewidth = (strokebox.maxX - strokebox.originx);
                var strokeheight = (strokebox.maxY - strokebox.originy);
                var first = this.currentStrokeData.points[0];
                var last = this.currentStrokeData.points[this.currentStrokeData.points.length - 1];
                var resizewidth = ((last.x) - (first.x));
                var resizeheight = ((last.y) - (first.y));
                var xfactor = 1 + (resizewidth / strokewidth); //remove padding
                var yfactor = 1 + (resizeheight / strokeheight);
                if (this.selectedDrawnObject.objecttype == "DRAW" || this.selectedDrawnObject.objecttype == "RECTANGLE") {
                    this.selectedDrawnObject.UpdateBoundingBox("PointerUpEvent 'SELECT'");
                    var selectedstrokebox = this.selectedDrawnObject.getCachedBoundingBox();
                    var selectedstrokewidth = selectedstrokebox.maxX - selectedstrokebox.originx;
                    var selectedstrokeheight = selectedstrokebox.maxY - selectedstrokebox.originy;
                    var first_1 = this.currentStrokeData.points[0];
                    var last_1 = this.currentStrokeData.points[this.currentStrokeData.points.length - 1];
                    var resizewidth_1 = last_1.x - first_1.x;
                    var resizeheight_1 = last_1.y - first_1.y;
                    if (this.hoveredSelectionPoint == "NE") {
                        resizeheight_1 = resizeheight_1 * -1;
                    }
                    if (this.hoveredSelectionPoint == "SW") {
                        resizewidth_1 = resizewidth_1 * -1;
                    }
                    if (this.hoveredSelectionPoint == "NW") {
                        resizewidth_1 = resizewidth_1 * -1;
                        resizeheight_1 = resizeheight_1 * -1;
                    }
                    var xfactor_1 = 1 + (resizewidth_1 / selectedstrokewidth);
                    var yfactor_1 = 1 + (resizeheight_1 / selectedstrokeheight);
                    //sanity check
                    if (this.currentStrokeData == null) {
                        return;
                    }
                    var relocatex = 0;
                    var relocatey = 0;
                    if (this.hoveredSelectionPoint == "NE") {
                        relocatey = resizeheight_1;
                    }
                    if (this.hoveredSelectionPoint == "SW") {
                        relocatex = resizewidth_1;
                    }
                    if (this.hoveredSelectionPoint == "NW") {
                        relocatey = resizeheight_1;
                        relocatex = resizewidth_1;
                    }
                    for (var i = 0; i < this.selectedDrawnObject.points.length; i++) {
                        var currentpoint = this.selectedDrawnObject.points[i];
                        var transformedpoint = this.TransformPoint(currentpoint.x - selectedstrokebox.originx, currentpoint.y - selectedstrokebox.originy, xfactor_1, 0, 0, yfactor_1, 0, 0);
                        var currentactualpoint = this.selectedDrawnObject.points[i];
                        currentactualpoint.x = transformedpoint.x + selectedstrokebox.originx - relocatex;
                        currentactualpoint.y = transformedpoint.y + selectedstrokebox.originy - relocatey;
                    }
                }
                else if (this.selectedDrawnObject.objecttype == "CIRCLE") {
                    var firstpoint = this.selectedDrawnObject.points[0];
                    var lastpoint = this.selectedDrawnObject.points[this.selectedDrawnObject.points.length - 1];
                    strokewidth = Math.abs(firstpoint.x - lastpoint.x);
                    strokeheight = Math.abs(firstpoint.y - lastpoint.y);
                    if (this.hoveredSelectionPoint == "P") {
                        resizeheight = resizeheight * -1; //invert y                
                    }
                    var circlexfactor = 1 + (resizewidth / strokewidth); //remove padding
                    var circleyfactor = 1 + (resizeheight / strokeheight);
                    this.ccontext.beginPath();
                    var newfinal = this.TransformPoint(lastpoint.x - (firstpoint.x), lastpoint.y - (firstpoint.y), circlexfactor, 0, 0, circleyfactor, 0, 0);
                    newfinal.x = newfinal.x + firstpoint.x;
                    newfinal.y = newfinal.y + firstpoint.y;
                    var newwidth = Math.abs(newfinal.x - firstpoint.x);
                    var newheight = Math.abs(newfinal.y - firstpoint.y);
                    for (var i = 0; i < this.selectedDrawnObject.points.length; i++) {
                        if (this.hoveredSelectionPoint == "P") {
                            var currentpoint = this.selectedDrawnObject.points[i];
                            var transformedpoint = this.TransformPoint(currentpoint.x - (firstpoint.x), currentpoint.y - (firstpoint.y), circlexfactor, 0, 0, circleyfactor, 0, 0);
                            currentpoint.x = transformedpoint.x + firstpoint.x;
                            currentpoint.y = transformedpoint.y + firstpoint.y;
                            //this.ccontext.lineTo(transformedpoint.x + (firstpoint.x),transformedpoint.y + (firstpoint.y));
                        }
                    }
                }
            }
            else {
                this.selectedMultiDrawnObjects = null;
                this.selectedDrawnObject = null;
                if (this.currentStrokeData.length() < this.multiselectionMinimumLength) {
                    //cursor position in canvas:
                    var x = e.pageX - this.canvas.offsetLeft + this.pendetails.scrollx;
                    var y = e.pageY - this.canvas.offsetTop + this.pendetails.scrolly;
                    //get all strokes etc that are near the cursor
                    this.SelectDrawnObjectAtPoint(x, y);
                    this.currentStrokeData = null;
                }
                else {
                    this.currentStrokeData.UpdateBoundingBox("doesnt matter");
                    var bounds = this.currentStrokeData.getCachedBoundingBox();
                    this.SelectDrawnObjectsInsideBounds(bounds);
                    this.currentStrokeData = null;
                }
            }
        }
        else if (this.selectedTool == "ERASE") {
            this.SelectDrawnObjectAtPoint(this.pendetails.X, this.pendetails.Y);
            var selectedid = this.selectedDrawnObject.strokeid;
            var indexofselected = this.drawing.indexOf(this.selectedDrawnObject);
            this.redoStack.push(this.selectedDrawnObject);
            this.selectedDrawnObject = null;
            if (indexofselected > -1) {
                this.drawing.splice(indexofselected, 1);
            }
        }
        else if (this.selectedTool == "LINE") {
        }
        if (this.selectedTool == "TEXT") {
            //dont clear stroke if entering text
        }
        else {
        }
        //since the user has drawn a new object, we can clear the redo stack
        this.isresizingobject = false;
        this.ccontext.closePath();
        this.UpdateBackgroundRender();
        this.currentStrokeData = null;
        //this.redoStack = []; //todo redo stack needs ordering after undoing and then adding more content
    };
    Stemcanvas.prototype.PointerDownEvent = function (e) {
        this.pendetails.penDown = true;
        this.currentStrokeData = new StemStroke();
        this.currentStrokeData.isFilled = this.fillShapeSelected;
        this.pendetails.X = e.pageX - this.canvas.offsetLeft + this.pendetails.scrollx;
        this.pendetails.Y = e.pageY - this.canvas.offsetTop + this.pendetails.scrolly;
        this.pendetails.penDown = true;
        this.currentStrokeData.strokecolour = this.SelectedColour;
        this.currentStrokeData.strokewidth = this.drawsize.toString();
        this.pendetails.pressure = e.pressure;
        this.currentStrokeData.points.push(new Stempoint(this.pendetails.X, this.pendetails.Y));
        if (this.selectedTool == "DRAW") {
        }
        else if (this.selectedTool == "TEXT") {
            this.currentText = new StemText();
            this.isEnteringText = true;
        }
        else if (this.selectedTool == "RECTANGLE") {
        }
        else if (this.selectedTool == "CIRCLE") {
        }
        else if (this.selectedTool == "SELECT") {
            //check if pointer down event is coming from touch or not
            if (e.pointerType == "touch") {
                //now check if an object is already selected
                if (this.selectedDrawnObject != null) {
                    //now we need to check if they are current touching a 'control point'
                }
            }
            else {
            }
            this.ismovingobject = false;
            if (this.hoveredSelectionPoint == "C") {
                this.ismovingobject = true;
                this.currentMove = new StemMove();
                //start and end are the same the moment the user clicks            
                //user is moving selected object, so we need to apply the translation to all the points
            }
            else if (this.hoveredSelectionPoint == "NE") {
                this.ismovingobject = false;
                this.isresizingobject = true;
                //user is now resizeing current selected object
                this.currentResize = new StemResize();
            }
            else if (this.hoveredSelectionPoint == "SE") {
                this.ismovingobject = false;
                this.isresizingobject = true;
                //user is now resizeing current selected object
                this.currentResize = new StemResize();
            }
            else if (this.hoveredSelectionPoint == "SW") {
                this.ismovingobject = false;
                this.isresizingobject = true;
                //user is now resizeing current selected object
                this.currentResize = new StemResize();
            }
            else if (this.hoveredSelectionPoint == "NW") {
                this.ismovingobject = false;
                this.isresizingobject = true;
                //user is now resizeing current selected object
                this.currentResize = new StemResize();
            }
            else if (this.hoveredSelectionPoint == "P") //circle perimeter
             {
                this.ismovingobject = false;
                this.isresizingobject = true;
                //user is now resizeing current selected object
                this.currentResize = new StemResize();
            }
        }
        else if (this.selectedTool == "ERASE") {
            // this.currentErase = new StemErasure();
        }
        else if (this.selectedTool == "LINE") {
        }
        //todo set colour and width        
    };
    Stemcanvas.prototype.PointerLeaveEvent = function (e) {
        this.cursonOnCanvas = false;
    };
    Stemcanvas.prototype.UpdateBackgroundRender = function () {
        //now pass the drawing data to the render worker (we will pass the data and the size of the current canvas) //see renderCanvasWorker.onmessage line 45* anonymous func
        //this.renderCanvasWorker.postMessage([this.drawing,this.canvas.width,this.canvas.height,this.canvasBuffer]);   
        //now pass the drawing data and the imagebitmap buffer
        //this.renderCanvasWorker.postMessage(this.bufferimage as any,[this.drawing]);
        //removed: bufferimagejson: this.bufferimageJSON,
        this.renderCanvasWorker.postMessage({ drawingdata: this.drawing, width: this.canvas.width, height: this.canvas.height, bufferimagebmp: this.bufferimage });
        //this.renderCanvasWorker.postMessage()
    };
    Stemcanvas.prototype.TransformPoint = function (inputx, inputy, a, b, c, d, translatex, translatey) {
        var outputx = ((a * inputx) + (b * inputx)) + translatex;
        var outputy = ((c * inputy) + (d * inputy)) + translatey;
        return new SimplePoint(outputx, outputy);
    };
    Stemcanvas.prototype.SelectDrawnObjectAtPoint = function (x, y) {
        var boxintersected = new Array();
        this.drawing.forEach(function (el) {
            el.UpdateBoundingBox("SelectDrawnObjectAtPoint");
            //find all strokes           
            if (el.getCachedBoundingBox().DoesIntersect(x, y)) {
                boxintersected.push(el);
            }
        });
        var indexofClosest = -1;
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
            else if (el.objecttype == "RECTANGLE") //find all rectangles
             {
                //get closest cardinal line N,S,E,W. Distance to that line
                var rectangle = el;
                var distance = rectangle.MeasureDistanceToPoint(x, y);
                if (distance < closenessvalue) {
                    indexofClosest = index;
                    closenessvalue = distance;
                }
            }
            else if (el.objecttype == "CIRCLE") //find all circles  
             {
                var circle = el;
                var distance = circle.MeasureDistanceToPoint(x, y);
                if (distance < closenessvalue) {
                    closenessvalue = distance;
                    indexofClosest = index;
                }
            }
            else if (el.objecttype == "TEXT") {
                var text = el;
                var distance = 99999999999;
                if (text.cachedBoundingBox.DoesIntersect(x, y)) {
                    distance = 0;
                }
                if (distance < closenessvalue) {
                    closenessvalue = distance;
                    indexofClosest = index;
                }
            }
            index++;
        });
        if (closenessvalue < 99999999999999999) //check that it actually found something
         {
            var selected = boxintersected[indexofClosest];
            this.selectedDrawnObject = selected;
            this.updateDrawingTools();
        }
        else {
            this.selectedDrawnObject = null;
        }
    };
    Stemcanvas.prototype.SelectDrawnObjectsInsideBounds = function (box) {
        var selected = new Array;
        this.drawing.forEach(function (s) {
            var first = s.points[0];
            var last = s.points[s.points.length - 1];
            //check head of stroke
            if (first.x > box.originx && first.x < box.maxX) {
                if (first.y > box.originy && first.y < box.maxY) {
                    //head is inside box
                    selected.push(s);
                }
            }
            //check tail of stroke
            if (last.x > box.originx && last.x < box.maxX) {
                if (last.y > box.originy && last.y < box.maxY) {
                    //tail is inside box
                    selected.push(s);
                }
            }
        });
        if (selected.length == 0) {
            console.log("no objects selected");
            this.selectedMultiDrawnObjects = null;
        }
        else {
            var temp = new MultiSelectContainer(selected);
            this.selectedMultiDrawnObjects = temp;
            this.currentStrokeData = null;
        }
    };
    Stemcanvas.prototype.updateDrawingTools = function () {
        var size = this.selectedDrawnObject.strokewidth; //get the size of the selected object
        console.log("size " + size);
        var sizeslider = document.getElementById("ctlDrawSize"); //the global size slider       
        var sizelabel = document.getElementById("drawing-size");
        sizelabel.innerText = "Size: " + size;
        var colourpicker = document.getElementById("ctlInputColour");
        colourpicker.value = this.selectedDrawnObject.strokecolour;
        if (this.selectedDrawnObject.objecttype == "TEXT") {
            //set minimum to 8            
            sizeslider.setAttribute("min", "8");
        }
        else {
            sizeslider.setAttribute("min", "1");
        }
        sizeslider.value = size;
    };
    Stemcanvas.prototype.loadAssets = function () {
        this.cursPointer = new Image();
        this.cursMove = new Image();
        this.cursNE = new Image();
        this.cursNW = new Image();
        this.cursCircle = new Image();
        this.cursErase = new Image();
        this.cursRect = new Image();
        this.cursDraw = new Image();
        this.cursType = new Image();
        this.cursPointer.src = "media/pointer.png";
        this.cursMove.src = "media/move.png";
        this.cursNE.src = "media/resizeNE.png";
        this.cursNW.src = "media/resizeNW.png";
        //circle erase rect
        this.cursCircle.src = "media/circle.png";
        this.cursErase.src = "media/erase.png";
        this.cursRect.src = "media/rectangle.png";
        this.cursDraw.src = "media/draw.png";
        this.cursType.src = "media/type.png";
    };
    Stemcanvas.prototype.startTimer = function () {
        var timertext = document.getElementById("questiontimer");
        var startsynctime = performance.now();
        var startClockTime = new Date().getTime();
        this.starttimeclock = new Date().toLocaleString();
        this.starttimeperf = startsynctime.toString();
        var x = setInterval(function () {
            var currentTime = new Date().getTime();
            var distance = currentTime - startClockTime;
            var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            var seconds = Math.floor((distance % (1000 * 60)) / 1000);
            timertext.innerText = hours + "h  " + minutes + "m  " + seconds + "s";
        }, 2000);
    };
    //assets and constants below
    Stemcanvas.canvaswidth = 1500;
    Stemcanvas.canvasheight = 1000;
    return Stemcanvas;
}());
var Point = /** @class */ (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    return Point;
}());
//# sourceMappingURL=stemcanvas.js.map