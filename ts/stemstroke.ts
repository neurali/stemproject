class StemDrawnObject {
           
    cachedBoundingBox:StemstrokeBox;
    public isFilled: Boolean = false;
    strokeid: string;
    points: Stempoint[];
    strokecolour: string = "rgb(0,0,0)";
    strokewidth: number;
    objecttype: string;
    scale:number;
    rotate:number;
    //need to add stroke width data    

    constructor() {
        //this.points = new Stempoint[1]; //might not work
        this.points = new Array();
        this.strokeid = helper.getGUID(); //overkill (1 in a million chance this will break) TODO: implement auto increment
    }

    //gets previously created cached drawing box (for quicker access)
    getCachedBoundingBox() {
        //should only be called during operations that dont actually update the drawing box
        return this.cachedBoundingBox;
    }
    
    //loops through all the points in the stroke to find the top bottom left and right maximums
    UpdateBoundingBox(caller) {
        if(this.objecttype == "DRAW")
        {
            //limitation: in 30 years if screen resolutions get crazy and the canvas becomes larger than 99999 pixels x or y, this wont work
            let lowestx = 99999;
            let lowesty = 99999;
            let heighestx = 0;
            let heighesty = 0;

            for (let i = 0; i < this.points.length; i++) {
               
                if (this.points[i].x < lowestx) {
                    lowestx = this.points[i].x;
                }
                if (this.points[i].x > heighestx) {
                    heighestx = this.points[i].x;
                }
                if (this.points[i].y < lowesty) {
                    lowesty = this.points[i].y
                }
                 if (this.points[i].y > heighesty) {
                    heighesty = this.points[i].y;
                }
            }

            let outputresult = new StemstrokeBox();
            //15pixels padding for ease of use
            outputresult.originx = lowestx;
            outputresult.originy = lowesty;
            outputresult.maxX = heighestx;
            outputresult.maxY = heighesty;
            this.cachedBoundingBox = outputresult;                   
        }
         else if(this.objecttype == "RECTANGLE")
         {
            let first = this.points[0];
            let last = this.points[this.points.length - 1];
         
            let lowestx = -1;
            let heighestx = -1;
            let lowesty = -1;
            let heighesty = -1;

            if(first.x < last.x)
            {
                lowestx = first.x;
                heighestx = last.x;
            }
            else
            {
                lowestx = last.x;
                heighestx = first.x;
            }

            if(first.y <last.y)
            {
                lowesty = first.y;
                heighesty = last.y;
            }
            else{
                lowesty = last.y;
                heighesty = first.y;
            }

            let output = new StemstrokeBox();
            output.maxX = heighestx;
            output.maxY = heighesty;
            output.originx = lowestx;
            output.originy = lowesty;

            this.cachedBoundingBox = output;

         }       
        else if(this.objecttype == "CIRCLE")
        {
            let width = Math.abs(this.points[0].x - this.points[this.points.length -1].x);
            let height = Math.abs(this.points[0].y - this.points[this.points.length -1].y);
            let radius = Math.sqrt(Math.pow(width,2) + Math.pow(height,2));
            let outputresult = new StemstrokeBox();
            outputresult.originx = this.points[0].x - (radius);
            outputresult.maxX = this.points[0].x + (radius);
            outputresult.originy = this.points[0].y - (radius);
            outputresult.maxY = this.points[0].y + (radius);       
            this.cachedBoundingBox = outputresult;
        }
        else if(this.objecttype == "TEXT")
        {    
        }        
    }


}

class Stemstroke extends StemDrawnObject {
    
    
    objecttype = "DRAW";
    strokeid = helper.getGUID();   

    getPixelLength(){
        let first = this.points[0];
        let last = this.points[this.points.length -1];

        let width = Math.abs(first.x - last.x);
        let height = Math.abs(first.y - last.y);

        let result = Math.sqrt((width * width) + (height * height));
        return result;
    }
    
}



class StemstrokeBox {

    constructor() {
    }

    //top left corner of the bounding box
    public originx: number;
    public originy: number;
    public maxX: number;
    public maxY: number;

    private selectionpadding: number = 15;


    public Intersects(x, y) {
        if(helper.isBetween(x,this.originx,this.maxX,this.selectionpadding) && helper.isBetween(y,this.originy,this.maxY,this.selectionpadding))
        {
            return true;
        }
        
    }

    public IntersectsCorner(x,y){

        let cornersize = Canvasconstants.cornersize; //half becaues its based on the center of the point

        if(x < this.originx - cornersize)
        {
            return "";
        }
        if(x > this.maxX + cornersize)
        {
            return "";
        }
        if(y < this.originy - cornersize)
        {
            return "";
        }
        if(y > this.maxY + cornersize)
        {
            return "";
        }

        let left = false;
        let right = false;
        let top = false;
        let bottom = false;

        if(x < this.originx + cornersize)
        {
            left = true;
        }
        else if (x > this.maxX - cornersize)
        {
            right = true;
        }
        if(y < this.originy + cornersize)
        {
            top = true;
        }
        else if(y > this.maxY - cornersize)
        {
            bottom = true;
        }

        if(left && top)
        {
            return "NW";
        }
        else if(right && top)
        {
            return "NE"
        }
        else if(left && bottom)
        {
            return "NE";
        }
        else if(right && bottom)
        {
            return "NW";
        }
        else{
            return "MOVE";
        }




    }
}
class Stempoint{
    //timestamp
    timestamp: number;
     x: number;
     y: number;     
     press: number;

    constructor(x,y){
        this.timestamp = performance.now();
        this.x = x;
        this.y = y;
    }
}
class SimplePoint{
    x:number;
    y:number;
    constructor(x,y){
        this.x = x;
        this.y=y;
    }
}