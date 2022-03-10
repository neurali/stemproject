var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var StemDrawnObject = /** @class */ (function () {
    //need to add stroke width data    
    function StemDrawnObject() {
        this.isFilled = false;
        this.strokecolour = "rgb(0,0,0)";
        //this.points = new Stempoint[1]; //might not work
        this.points = new Array();
        this.strokeid = helper.getGUID(); //overkill (1 in a million chance this will break) TODO: implement auto increment
    }
    StemDrawnObject.prototype.getFirstPoint = function () {
        if (this.points.length > 0) {
            return this.points[0];
        }
        else {
            return null;
        }
    };
    StemDrawnObject.prototype.getLastPoint = function () {
        if (this.points.length > 0) {
            return this.points[this.points.length - 1];
        }
    };
    StemDrawnObject.prototype.getPerfectStrokeWidth = function () {
        var lowestx = this.points.reduce(function (prev, curr) {
            return prev.x < curr.x ? prev : curr;
        });
        var heighestx = this.points.reduce(function (prev, curr) {
            return prev.x > curr.x ? prev : curr;
        });
        return heighestx.x - lowestx.x;
    };
    StemDrawnObject.prototype.getPerfectStrokeHeight = function () {
        var lowesty = this.points.reduce(function (prev, curr) {
            return prev.y < curr.y ? prev : curr;
        });
        var heighesty = this.points.reduce(function (prev, curr) {
            return prev.y > curr.y ? prev : curr;
        });
        return heighesty.y - lowesty.y;
    };
    //gets previously created cached drawing box (for quicker access)
    StemDrawnObject.prototype.getCachedBoundingBox = function () {
        //should only be called during operations that dont actually update the drawing box
        try {
            return this.cachedBoundingBox;
        }
        catch (_a) {
            return null;
        }
    };
    StemDrawnObject.prototype.getPixelLength = function () {
        if (this.points.length == 0) {
            return 0;
        }
        var first = this.points[0];
        var last = this.points[this.points.length - 1];
        var width = Math.abs(first.x - last.x);
        var height = Math.abs(first.y - last.y);
        var result = Math.sqrt((width * width) + (height * height));
        return result;
    };
    //loops through all the points in the stroke to find the top bottom left and right maximums
    StemDrawnObject.prototype.UpdateBoundingBox = function (caller) {
        if (this.objecttype == "DRAW") {
            //limitation: in 30 years if screen resolutions get crazy and the canvas becomes larger than 99999 pixels x or y, this wont work
            var lowestx = 99999;
            var lowesty = 99999;
            var heighestx = 0;
            var heighesty = 0;
            for (var i = 0; i < this.points.length; i++) {
                if (this.points[i].x < lowestx) {
                    lowestx = this.points[i].x;
                }
                if (this.points[i].x > heighestx) {
                    heighestx = this.points[i].x;
                }
                if (this.points[i].y < lowesty) {
                    lowesty = this.points[i].y;
                }
                if (this.points[i].y > heighesty) {
                    heighesty = this.points[i].y;
                }
            }
            var outputresult = new StemstrokeBox();
            //15pixels padding for ease of use
            outputresult.originx = lowestx;
            outputresult.originy = lowesty;
            outputresult.maxX = heighestx;
            outputresult.maxY = heighesty;
            this.cachedBoundingBox = outputresult;
        }
        else if (this.objecttype == "RECTANGLE") {
            var first = this.points[0];
            var last = this.points[this.points.length - 1];
            var lowestx = -1;
            var heighestx = -1;
            var lowesty = -1;
            var heighesty = -1;
            if (first.x < last.x) {
                lowestx = first.x;
                heighestx = last.x;
            }
            else {
                lowestx = last.x;
                heighestx = first.x;
            }
            if (first.y < last.y) {
                lowesty = first.y;
                heighesty = last.y;
            }
            else {
                lowesty = last.y;
                heighesty = first.y;
            }
            var output = new StemstrokeBox();
            output.maxX = heighestx;
            output.maxY = heighesty;
            output.originx = lowestx;
            output.originy = lowesty;
            this.cachedBoundingBox = output;
        }
        else if (this.objecttype == "CIRCLE") {
            var width = Math.abs(this.points[0].x - this.points[this.points.length - 1].x);
            var height = Math.abs(this.points[0].y - this.points[this.points.length - 1].y);
            var radius = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
            var outputresult = new StemstrokeBox();
            outputresult.originx = this.points[0].x - (radius);
            outputresult.maxX = this.points[0].x + (radius);
            outputresult.originy = this.points[0].y - (radius);
            outputresult.maxY = this.points[0].y + (radius);
            this.cachedBoundingBox = outputresult;
        }
        else if (this.objecttype == "TEXT") {
        }
        else if (this.objecttype == "LINE") {
            var output = new StemstrokeBox();
            if (this.points[0].x < this.points[this.points.length - 1].x) {
                output.originx = this.points[0].x;
                output.maxX = this.points[this.points.length - 1].x;
            }
            else {
                output.maxX = this.points[0].x;
                output.originx = this.points[this.points.length - 1].x;
            }
            if (this.points[0].y < this.points[this.points.length - 1].y) {
                output.originy = this.points[0].y;
                output.maxY = this.points[this.points.length - 1].y;
            }
            else {
                output.maxY = this.points[0].y;
                output.originy = this.points[this.points.length - 1].y;
            }
            this.cachedBoundingBox = output;
        }
    };
    return StemDrawnObject;
}());
var Stemstroke = /** @class */ (function (_super) {
    __extends(Stemstroke, _super);
    function Stemstroke() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.objecttype = "";
        _this.strokeid = helper.getGUID();
        return _this;
    }
    return Stemstroke;
}(StemDrawnObject));
var StemstrokeBox = /** @class */ (function () {
    function StemstrokeBox() {
        this.selectionpadding = 15;
    }
    StemstrokeBox.prototype.Intersects = function (x, y, padding) {
        if (padding === void 0) { padding = this.selectionpadding; }
        if (helper.isBetween(x, this.originx, this.maxX, this.selectionpadding) && helper.isBetween(y, this.originy, this.maxY, this.selectionpadding)) {
            return true;
        }
    };
    StemstrokeBox.prototype.IntersectsCorner = function (x, y) {
        var cornersize = Canvasconstants.cornersize; //half becaues its based on the center of the point
        if (x < this.originx - cornersize) {
            return "";
        }
        if (x > this.maxX + cornersize) {
            return "";
        }
        if (y < this.originy - cornersize) {
            return "";
        }
        if (y > this.maxY + cornersize) {
            return "";
        }
        var left = false;
        var right = false;
        var top = false;
        var bottom = false;
        if (x < this.originx + cornersize) {
            left = true;
        }
        else if (x > this.maxX - cornersize) {
            right = true;
        }
        if (y < this.originy + cornersize) {
            top = true;
        }
        else if (y > this.maxY - cornersize) {
            bottom = true;
        }
        if (left && top) {
            return "NW";
        }
        else if (right && top) {
            return "NE";
        }
        else if (left && bottom) {
            return "SW";
        }
        else if (right && bottom) {
            return "SE";
        }
        else {
            return "MOVE";
        }
    };
    return StemstrokeBox;
}());
var Stempoint = /** @class */ (function () {
    function Stempoint(x, y) {
        this.timestamp = performance.now();
        this.x = x;
        this.y = y;
    }
    return Stempoint;
}());
var SimplePoint = /** @class */ (function () {
    function SimplePoint(x, y) {
        this.x = x;
        this.y = y;
    }
    return SimplePoint;
}());
//# sourceMappingURL=stemstroke.js.map