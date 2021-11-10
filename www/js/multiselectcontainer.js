var MultiSelectContainer = /** @class */ (function () {
    function MultiSelectContainer(objects) {
        var tminx = 999999999999;
        var tmaxx = -3333333333333;
        var tminy = 9999999999999;
        var tmaxy = -3333333333333;
        objects.forEach(function (drobj) {
            drobj.points.forEach(function (p) {
                if (p.x < tminx) {
                    tminx = p.x;
                }
                if (p.x > tmaxx) {
                    tmaxx = p.x;
                }
                if (p.y < tminy) {
                    tminy = p.y;
                }
                if (p.y > tmaxy) {
                    tmaxy = p.y;
                }
            });
        });
        this.minx = tminx;
        this.maxx = tmaxx;
        this.miny = tminy;
        this.maxy = tmaxy;
    }
    MultiSelectContainer.prototype.doesIntersect = function (x, y) {
        if (x > this.minx && x < this.maxx) {
            if (y > this.miny && y < this.maxy) {
                return true;
            }
        }
    };
    return MultiSelectContainer;
}());
//# sourceMappingURL=multiselectcontainer.js.map