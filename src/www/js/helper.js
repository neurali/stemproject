var helper = /** @class */ (function () {
    function helper() {
    }
    helper.IsPointInsideBoxAtPoint = function (penx, peny, boxx, boxy, size) {
        if (penx < (boxx + size) && penx > ((boxx - size))) {
            if (peny < (boxy + size) && peny > (boxy - size)) {
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
    helper.getGUID = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
    helper.componentToHex = function (c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    };
    helper.rgbToHex = function (r, g, b) {
        return "#" + helper.componentToHex(r) + helper.componentToHex(g) + helper.componentToHex(b);
    };
    helper.hexToRgb = function (hex) {
        var normal = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (normal)
            return normal.slice(1).map(function (e) { return parseInt(e, 16); });
        var shorthand = hex.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
        if (shorthand)
            return shorthand.slice(1).map(function (e) { return 0x11 * parseInt(e, 16); });
        return null;
    };
    return helper;
}());
//# sourceMappingURL=helper.js.map