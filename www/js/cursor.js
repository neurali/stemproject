var cursor = /** @class */ (function () {
    function cursor(context, pen) {
        this.selectmodifier = "";
        this.interacting = false;
        this.cursPointer = new Image();
        this.cursMove = new Image();
        this.cursNE = new Image();
        this.cursNW = new Image();
        this.cursCircle = new Image();
        this.cursErase = new Image();
        this.cursRect = new Image();
        this.cursDraw = new Image();
        this.cursType = new Image();
        this.cursLine = new Image();
        this.ctx = context;
        this.pen = pen;
        this.loadAssets();
    }
    cursor.prototype.loadAssets = function () {
        this.cursPointer.src = "media/cursors/c_Pointer.png";
        this.cursMove.src = "media/cursors/c_Move.png";
        this.cursNE.src = "media/cursors/c_ResizeNE.png";
        this.cursNW.src = "media/cursors/c_ResizeNW.png";
        //circle erase rect
        this.cursCircle.src = "media/cursors/c_Circle.png";
        this.cursErase.src = "media/cursors/c_Erase.png";
        this.cursRect.src = "media/cursors/c_Rect.png";
        this.cursDraw.src = "media/cursors/c_Draw.png";
        this.cursType.src = "media/cursors/c_Text.png";
        this.cursLine.src = "media/cursors/c_Line.png";
    };
    cursor.prototype.render = function () {
        if (this.currentTool == "DRAW") {
            this.ctx.clearRect(0, 0, 1500, 1500); //todo, this should be cleared with a smaller rectangle (might be faster)
            this.ctx.drawImage(this.cursDraw, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
        }
        else if (this.currentTool == "CIRCLE") {
            this.ctx.clearRect(0, 0, 1500, 1500);
            this.ctx.drawImage(this.cursCircle, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
        }
        else if (this.currentTool == "SELECT") {
            this.ctx.clearRect(0, 0, 1500, 1500);
            //now check the modifier:
            if (this.selectmodifier == "") {
                this.ctx.drawImage(this.cursPointer, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
            }
            else {
                if (this.selectmodifier == "MOVE") {
                    this.ctx.drawImage(this.cursMove, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
                }
                else if (this.selectmodifier == "NE") {
                    this.ctx.drawImage(this.cursNE, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
                }
                else if (this.selectmodifier == "NW") {
                    this.ctx.drawImage(this.cursNW, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
                }
                else if (this.selectmodifier == "SE") {
                    this.ctx.drawImage(this.cursNW, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
                }
                else if (this.selectmodifier == "SW") {
                    this.ctx.drawImage(this.cursNE, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
                }
            }
        }
        else if (this.currentTool == "RECTANGLE") {
            this.ctx.clearRect(0, 0, 1500, 1500);
            this.ctx.drawImage(this.cursRect, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
        }
        else if (this.currentTool == "ERASE") {
            this.ctx.clearRect(0, 0, 1500, 1500);
            this.ctx.drawImage(this.cursErase, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
        }
        else if (this.currentTool == "LINE") {
            this.ctx.clearRect(0, 0, 1500, 1500);
            this.ctx.drawImage(this.cursLine, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
        }
        else if (this.currentTool == "TEXT") {
            this.ctx.clearRect(0, 0, 1500, 1500);
            this.ctx.drawImage(this.cursType, this.pen.X, this.pen.Y, Canvasconstants.cursorsize, Canvasconstants.cursorsize);
        }
    };
    return cursor;
}());
//# sourceMappingURL=cursor.js.map