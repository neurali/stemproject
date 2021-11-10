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
    //gets previously created cached drawing box (for quicker access)
    StemDrawnObject.prototype.getCachedBoundingBox = function () {
        //should only be called during operations that dont actually update the drawing box
        return this.cachedBoundingBox;
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
    };
    return StemDrawnObject;
}());
var StemStroke = /** @class */ (function (_super) {
    __extends(StemStroke, _super);
    function StemStroke() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.objecttype = "DRAW";
        _this.strokeid = helper.getGUID();
        return _this;
    }
    StemStroke.prototype.length = function () {
        var first = this.points[0];
        var last = this.points[this.points.length - 1];
        var width = Math.abs(first.x - last.x);
        var height = Math.abs(first.y - last.y);
        return Math.sqrt((width * width) + (height * height));
    };
    return StemStroke;
}(StemDrawnObject));
var StemText = /** @class */ (function (_super) {
    __extends(StemText, _super);
    function StemText() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.objecttype = "TEXT";
        _this.text = "";
        return _this;
    }
    return StemText;
}(StemDrawnObject));
var StemShape = /** @class */ (function (_super) {
    __extends(StemShape, _super);
    function StemShape() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return StemShape;
}(StemDrawnObject));
var StemLine = /** @class */ (function (_super) {
    __extends(StemLine, _super);
    function StemLine() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.objecttype = "LINE";
        return _this;
    }
    return StemLine;
}(StemShape));
var StemRectangle = /** @class */ (function (_super) {
    __extends(StemRectangle, _super);
    function StemRectangle() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.objecttype = "RECTANGLE";
        return _this;
    }
    StemRectangle.prototype.MeasureDistanceToPoint = function (x, y) {
        this.UpdateBoundingBox("MeasureDistanceToPoint");
        var box = this.getCachedBoundingBox();
        var distance = 999999999;
        //if box is filled, anywhere inside the rectangle is zero;
        //otherwise check distance to line?
        if (this.isFilled) {
            if (x > box.originx && x < box.maxX) {
                if (y > box.originy && y < box.maxY) {
                    distance = 0;
                    return distance;
                }
            }
        }
        else {
            var height = 9999999;
            var width = 99999999;
            if (x < box.originx && y < box.originy) {
                width = Math.abs(x - box.originx);
                height = Math.abs(y - box.originy);
                //top left
                distance = Math.sqrt((width * width) + (height * height));
                return distance;
            }
            else if (x > box.maxX && y < box.originy) {
                width = Math.abs(x - box.maxX);
                height = Math.abs(y - box.originy);
                //top right
                distance = Math.sqrt((width * width) + (height * height));
                return distance;
            }
            else if (x < box.originx && y > box.maxY) {
                width = Math.abs(x - box.originx);
                height = Math.abs(y - box.maxY);
                //bottom left
                distance = Math.sqrt((width * width) + (height * height));
                return distance;
            }
            else if (x > box.maxX && y > box.maxY) {
                width = Math.abs(x - box.maxX);
                height = Math.abs(y - box.maxY);
                //bottom right
                distance = Math.sqrt((width * width) + (height * height));
                return distance;
            }
            else {
                //get closes distance to all for lines
                var xmindist = Math.abs(x - box.originx);
                var xmaxdist = Math.abs(x - box.maxX);
                var ymindist = Math.abs(y - box.originy);
                var ymaxdist = Math.abs(y - box.maxY);
                var lowest = 999999999;
                if (xmindist < lowest) {
                    lowest = xmindist;
                }
                if (xmaxdist < lowest) {
                    lowest = xmaxdist;
                }
                if (ymindist < lowest) {
                    lowest = ymindist;
                }
                if (ymaxdist < lowest) {
                    lowest = ymaxdist;
                }
                return lowest;
            }
        }
    };
    return StemRectangle;
}(StemShape));
var StemCircle = /** @class */ (function (_super) {
    __extends(StemCircle, _super);
    function StemCircle() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.objecttype = "CIRCLE";
        return _this;
    }
    StemCircle.prototype.GetRadius = function () {
        var startpoint = this.points[0];
        var endpoint = this.points[this.points.length - 1];
        var width = Math.abs(endpoint.x - startpoint.x);
        var height = Math.abs(endpoint.y - startpoint.y);
        var radius = Math.sqrt((width * width) + (height * height));
        return radius;
    };
    StemCircle.prototype.MeasureDistanceToPoint = function (x, y) {
        //get circle origin and final point
        var center = this.points[0];
        var perimeter = this.points[this.points.length - 1];
        var circlea = (perimeter.x - center.x) + 15;
        var circleb = (perimeter.y - center.y) + 15;
        var diameter = Math.sqrt(Math.pow(circlea, 2) + Math.pow(circleb, 2)); //the hypotenuese is the the diameter of the circle
        //x and y values come from the point we are measuring distance to:
        var pointa = x - center.x;
        var pointb = y - center.y;
        var pointToCenterDistance = Math.sqrt(Math.pow(pointa, 2) + Math.pow(pointb, 2));
        if (this.isFilled) {
            if (pointToCenterDistance < diameter) {
                return 0;
            }
            else {
                return Math.abs(diameter - pointToCenterDistance);
            }
        }
        else {
            return Math.abs(diameter - pointToCenterDistance);
        }
        //pythagoras to get disatnce to center of circle
        //if distance is greater (ie: click is outside perimeter), distance to center - diameter
        //if point is inside the circle:
    };
    return StemCircle;
}(StemShape));
var StemErasure = /** @class */ (function (_super) {
    __extends(StemErasure, _super);
    function StemErasure() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        //that we way can keep the erasings in the stack for undoing an erasure////// 
        _this.objecttype = "ERASING";
        return _this;
    }
    return StemErasure;
}(StemShape));
var StemstrokeBox = /** @class */ (function () {
    function StemstrokeBox() {
        this.selectionpadding = 15;
    }
    StemstrokeBox.prototype.DoesIntersect = function (x, y) {
        if (x > (this.originx - this.selectionpadding) && x < (this.maxX + this.selectionpadding)) {
            if (y > (this.originy - this.selectionpadding) && y < (this.maxY + this.selectionpadding)) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    };
    return StemstrokeBox;
}());
var StemResize = /** @class */ (function () {
    function StemResize() {
    }
    return StemResize;
}());
var StemMove = /** @class */ (function () {
    function StemMove() {
    }
    return StemMove;
}());
//# sourceMappingURL=stemdrawnobject.js.map