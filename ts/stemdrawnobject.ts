
class StemDrawnObject {
       
    cachedBoundingBox:StemstrokeBox;
    public isFilled: Boolean = false;
    strokeid: string;
    points: Stempoint[];
    strokecolour: string = "rgb(0,0,0)";
    strokewidth: string;
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
             console.log("looking at selecting a rectangle");
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
            console.log("text bounding boxes need canvas operations to update, look elsewhere see 1150 stemcanvas.ts");            
        }        
    }


}

class StemStroke extends StemDrawnObject {
    
    
    objecttype = "DRAW";
    strokeid = helper.getGUID();   

    length(){
        let first = this.points[0];
        let last = this.points[this.points.length -1];

        let width = Math.abs(first.x - last.x);
        let height = Math.abs(first.y - last.y);

        return Math.sqrt((width * width) + (height * height));
    }
    
}
class StemText extends StemDrawnObject{
    
    objecttype = "TEXT";
    text = "";
    textwidth:number;
    textheight:number;
    strokecolour: any;
    
  
 
}

class StemShape extends StemDrawnObject {

}

class StemRectangle extends StemShape {
    objecttype = "RECTANGLE";
    
    MeasureDistanceToPoint(x,y) {

        this.UpdateBoundingBox("MeasureDistanceToPoint");
        let box = this.getCachedBoundingBox();
        let distance = 999999999;
        //if box is filled, anywhere inside the rectangle is zero;
        //otherwise check distance to line?
        if(this.isFilled)
        {
            if(x > box.originx && x < box.maxX)
            {
                if(y > box.originy && y < box.maxY)
                {
                    distance = 0;
                    return distance;
                }               
            }
        }
        else
        {       
            console.log("stop");           
            let height = 9999999;
            let width = 99999999;
            
            if(x < box.originx && y < box.originy)
            {
                width = Math.abs(x - box.originx);
                height = Math.abs(y - box.originy);
                //top left
                distance = Math.sqrt((width * width) + (height * height));
                return distance;                
            }      
            else if( x > box.maxX && y < box.originy)
            {
                width = Math.abs(x - box.maxX);
                height = Math.abs(y - box.originy);
                //top right
                distance = Math.sqrt((width * width) + (height * height));
                return distance;
            }
            else if(x < box.originx && y > box.maxY)
            {
                width = Math.abs(x - box.originx);
                height = Math.abs(y - box.maxY);
                //bottom left
                distance = Math.sqrt((width * width) + (height * height));
                return distance;
            }
            else if (x > box.maxX && y > box.maxY)
            {
                width = Math.abs(x - box.maxX);
                height = Math.abs(y - box.maxY);
                //bottom right
                distance = Math.sqrt((width * width) + (height * height));
                return distance;
            }            
            else
            {
                //get closes distance to all for lines
                let xmindist = Math.abs(x - box.originx);
                let xmaxdist = Math.abs(x - box.maxX);
                let ymindist = Math.abs(y - box.originy);
                let ymaxdist  = Math.abs(y - box.maxY);

                let lowest = 999999999;

                if(xmindist < lowest)
                {                    
                    lowest = xmindist;
                }
                if(xmaxdist < lowest)
                {
                    lowest = xmaxdist;
                }
                if(ymindist < lowest)
                {
                    lowest = ymindist;
                }
                if(ymaxdist < lowest)
                {
                    lowest = ymaxdist;
                }
                return lowest;
            }
         

        }

       

    }
    
}

class StemCircle extends StemShape {
    objecttype = "CIRCLE";

    

    GetRadius(){
        let startpoint = this.points[0];
        let endpoint = this.points[this.points.length -1];
        let width = Math.abs(endpoint.x - startpoint.x);
        let height = Math.abs(endpoint.y - startpoint.y);

        let radius = Math.sqrt((width * width) + (height * height));

        return radius;
    }

    MeasureDistanceToPoint(x, y) {
        
        //get circle origin and final point
        let center = this.points[0];
        let perimeter = this.points[this.points.length - 1];
        let circlea = (perimeter.x - center.x)+15;
        let circleb = (perimeter.y - center.y)+15;
        let diameter = Math.sqrt(Math.pow(circlea, 2) + Math.pow(circleb, 2)); //the hypotenuese is the the diameter of the circle

        //x and y values come from the point we are measuring distance to:
        let pointa = x - center.x;
        let pointb = y - center.y;
        let pointToCenterDistance = Math.sqrt(Math.pow(pointa, 2) + Math.pow(pointb, 2));

        if (this.isFilled)
        {
            if(pointToCenterDistance < diameter)
            {
               
                return 0;
            }
            else
            {
               
                return Math.abs(diameter - pointToCenterDistance);
            }
        }
        else
        {
            
            return Math.abs(diameter - pointToCenterDistance);
        }
        
        
        

        //pythagoras to get disatnce to center of circle
        //if distance is greater (ie: click is outside perimeter), distance to center - diameter
        //if point is inside the circle:
    }
}

class StemErasure extends StemShape {
    //that we way can keep the erasings in the stack for undoing an erasure////// 
    objecttype = "ERASING";
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


    public DoesIntersect(x, y) {

        

        if (x > (this.originx - this.selectionpadding) && x < (this.maxX+this.selectionpadding)) {
            if (y > (this.originy-this.selectionpadding)&& y < (this.maxY + this.selectionpadding)) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
}

class StemResize
{
    constructor(){

    }
    startPoint: Stempoint;
    endPoint: Stempoint;

}

class StemMove
{
    startPoint: Stempoint;
    endPoint: Stempoint;
    constructor(){

    }
}
