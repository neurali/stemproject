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
        this.strokecolour = "rgb(0,0,0)";
        //this.points = new Stempoint[1]; //might not work
        this.points = new Array();
        this.strokeid = helper.getGUID(); //overkill (1 in a million chance this will break) TODO: implement auto increment
    }
    //loops through all the points in the stroke to find the top bottom left and right maximums
    StemDrawnObject.prototype.getBoundingBox = function () {
        //limitation: in 30 years if screen resolutions get crazy and the canvas becomes larger than 99999 pixels x or y, this wont work
        var lowestx = 99999;
        var lowesty = 99999;
        var heighestx = -99999;
        var heighesty = -99999;
        for (var i = 0; i < this.points.length; i++) {
            if (this.points[i].x < lowestx) {
                lowestx = this.points[i].x;
            }
            else if (this.points[i].x > heighestx) {
                heighestx = this.points[i].x;
            }
            if (this.points[i].y < lowesty) {
                lowesty = this.points[i].y;
            }
            else if (this.points[i].y > heighesty) {
                heighesty = this.points[i].y;
            }
        }
        var outputresult = new StemstrokeBox();
        outputresult.originx = lowestx + 20;
        outputresult.originy = lowesty + 20;
        outputresult.maxX = heighestx + 20;
        outputresult.maxY = heighesty + 20;
        return outputresult;
    };
    return StemDrawnObject;
}());
var StemStroke = /** @class */ (function (_super) {
    __extends(StemStroke, _super);
    function StemStroke() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return StemStroke;
}(StemDrawnObject));
var StemShape = /** @class */ (function (_super) {
    __extends(StemShape, _super);
    function StemShape() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return StemShape;
}(StemDrawnObject));
var StemRectangle = /** @class */ (function (_super) {
    __extends(StemRectangle, _super);
    function StemRectangle() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return StemRectangle;
}(StemShape));
var StemErasure = /** @class */ (function (_super) {
    __extends(StemErasure, _super);
    function StemErasure() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return StemErasure;
}(StemShape));
var StemstrokeBox = /** @class */ (function () {
    function StemstrokeBox() {
    }
    return StemstrokeBox;
}());
