var Toolbox = /** @class */ (function () {
    function Toolbox(eventel) {
        var _this = this;
        this.selectedColour = "Black";
        //sentinel which tracks the start and endpoint of a draw stroke
        this.isDrawingObject = false;
        console.log("init drawing tools");
        this.assignelements();
        var _loop_1 = function (i) {
            var cur = this_1.drawtools[i];
            cur.addEventListener("click", function (e) {
                //remove darken from all the tools
                for (var i_1 = 0; i_1 < _this.drawtools.length; i_1++) {
                    _this.drawtools[i_1].classList.remove("darken-3");
                    ;
                }
                //add darken to the clicked button
                cur.classList.add("darken-3");
                var innertext = cur.innerText;
                var split = innertext.split(/\r?\n/);
                //get text of selected
                var selectedtooltext = split[split.length - 1];
                //detect if tool has actually changed
                _this.previoustool = _this.selectedtool;
                if (_this.previoustool != selectedtooltext) {
                    _this.selectedtool = selectedtooltext;
                    eventel.dispatchEvent(new Event(toolboxevents.toolchanged));
                }
            });
        };
        var this_1 = this;
        //drawtools
        for (var i = 0; i < this.drawtools.length; i++) {
            _loop_1(i);
        }
        var _loop_2 = function (i) {
            var cur = this_2.colourtools[i];
            cur.addEventListener("click", function (e) {
                for (var i_2 = 0; i_2 < _this.colourtools.length; i_2++) {
                    _this.colourtools[i_2].classList.remove("z-depth-3");
                    ;
                }
                cur.classList.add("z-depth-3");
                var temp = cur.id.slice(6);
                if (temp == "Red") {
                    _this.selectedColour = "#E53935";
                }
                else if (temp == "Green") {
                    _this.selectedColour = "#388E3C";
                }
                else if (temp == "Blue") {
                    _this.selectedColour = "#1976D2";
                }
                else if (temp == "Purple") {
                    _this.selectedColour = "#7b1fa2";
                }
                else if (temp == "Orange") {
                    _this.selectedColour = "#ff9800";
                }
                else {
                    _this.selectedColour = "Black";
                }
            });
        };
        var this_2 = this;
        //colourtools
        for (var i = 0; i < this.colourtools.length; i++) {
            _loop_2(i);
        }
        var _loop_3 = function (i) {
            var cur = this_3.sizetools[i];
            cur.addEventListener("click", function (e) {
                for (var i_3 = 0; i_3 < _this.sizetools.length; i_3++) {
                    _this.sizetools[i_3].classList.remove("z-depth-2");
                    _this.sizetools[i_3].classList.remove("darken-4");
                }
                cur.classList.add("z-depth-2");
                cur.classList.add("darken-4");
                var selectedsize = parseInt(cur.id.slice(-1));
                switch (selectedsize) {
                    case 1:
                        _this.selectedDrawSize = 4;
                        break;
                    case 2:
                        _this.selectedDrawSize = 7;
                        break;
                    case 3:
                        _this.selectedDrawSize = 10;
                        break;
                    case 4:
                        _this.selectedDrawSize = 14;
                        break;
                    case 5:
                        _this.selectedDrawSize = 17;
                        break;
                }
            });
        };
        var this_3 = this;
        //sizetools
        for (var i = 0; i < this.sizetools.length; i++) {
            _loop_3(i);
        }
    }
    Toolbox.prototype.on = function () {
    };
    Toolbox.prototype.dispatch = function () { };
    Toolbox.prototype.assignelements = function () {
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
        this.btnSize1 = document.getElementById("btnSize1"); //
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
        this.sizetools = document.getElementsByClassName("sizebtn");
    };
    return Toolbox;
}());
//# sourceMappingURL=toolbox.js.map