class MultiSelectContainer
{    
    
    public minx;
    public miny;
    public maxx;
    public maxy;
    public drawingdata:StemDrawnObject[];

    constructor(objects:StemDrawnObject[]){

        let tminx = 999999999999;
        let tmaxx = -3333333333333;
        let tminy = 9999999999999;
        let tmaxy = -3333333333333;

        this.drawingdata = objects as StemDrawnObject[];

        objects.forEach(drobj => {
            drobj.points.forEach(p => {
                if(p.x < tminx)
                {
                    tminx = p.x;
                }
                if(p.x > tmaxx)
                {
                    tmaxx = p.x;
                }
                if(p.y < tminy)
                {
                    tminy = p.y
                }
                if(p.y > tmaxy)
                {
                    tmaxy = p.y;
                }
            });
        });

        this.minx = tminx;
        this.maxx = tmaxx;
        this.miny = tminy;
        this.maxy = tmaxy
    }

    public doesIntersect(x,y){

        if(x > this.minx && x < this.maxx)
        {
            if(y > this.miny && y < this.maxy)
            {
                return true;
            }
        }
    }

}