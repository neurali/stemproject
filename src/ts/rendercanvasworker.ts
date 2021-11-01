const workercontext: Worker = self as any;

    function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
    }
    
    function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

onmessage = (e)=>{
    //drawingdata

    //this.renderCanvasWorker.postMessage({drawingdata: this.drawing, bufferimagejson: this.bufferimageJSON, width:this.canvas.width, height:this.canvas.height});

    let drawingdata = e.data["drawingdata"] as StemDrawnObject[];
    let height = e.data["height"] as number;
    let width = e.data["width"] as number;
    let bufferjson = e.data["bufferimagejson"] as string;


    //console.log(drawingdata);
    
   
    
    // //now create invisible canvas
     var buffercanvas = new OffscreenCanvas(width,height);
     var bcontext = buffercanvas.getContext("2d");

    bcontext.fillStyle = "white";
    bcontext.fillRect(0,0,buffercanvas.width,buffercanvas.height);
    
    drawingdata.forEach(s => {       
        //each stroke
        bcontext.lineCap = "round";
        bcontext.lineJoin = "round";        
        //console.log("colour of stroke: " + rgbToHex(s.strokecolour[0],s.strokecolour[1],s.strokecolour[2]))
        //bcontext.strokeStyle = rgbToHex(s.strokecolour[0],s.strokecolour[1],s.strokecolour[2]);  
        bcontext.strokeStyle = s.strokecolour 
        bcontext.lineWidth =+ s.strokewidth;


        if(s.objecttype == "DRAW")
        { 
            bcontext.beginPath();
            //go to stroke origin   
           
            for(let i = 0; i < s.points.length; i++)
            {
            // console.log(s.points[i].x);
                //each point in the stroke
                bcontext.lineTo(s.points[i].x,s.points[i].y);                           
            }
            bcontext.stroke(); 
            bcontext.closePath();  
        }
        else if (s.objecttype == "RECTANGLE")
        {
            //get top, right, bottom, left, then draw some lines                  
            let minx = s.points[0].x;
            let maxx = s.points[s.points.length - 1].x;
            let miny = s.points[0].y;
            let maxy = s.points[s.points.length -1].y;

            s.points[0]

            bcontext.beginPath();
            bcontext.moveTo(minx,miny); //start top left
            bcontext.lineTo(maxx,miny);//line to top right
            bcontext.lineTo(maxx,maxy);  //line to bottom right
            bcontext.lineTo(minx,maxy);  //line to bottom left
            bcontext.lineTo(minx,miny);//line back to top left


            if(s.isFilled)
            {
                bcontext.fillStyle = bcontext.strokeStyle;
                bcontext.fill();
            }
            bcontext.stroke()

            // var stemrect = s as StemRectangle;
            
            // if(stemrect.isFilled)
            // {
            //     bcontext.fillStyle = bcontext.strokeStyle;
            //     bcontext.fillRect(minx,miny,maxx-minx,maxy-miny);
            //     bcontext.fill();
            // }

            
        }
        else if (s.objecttype == "CIRCLE")
        {
            
            bcontext.beginPath();
            let minx = s.points[0].x;
            let miny = s.points[0].y;

            console.log(minx);

            let maxx = s.points[s.points.length - 1].x;            
            let maxy = s.points[s.points.length -1].y;

            //pythag to get radius
            let alength = (maxx - minx);
            let blenght = (maxy - miny);
            let radius = Math.sqrt((alength * alength) + (blenght * blenght));

            bcontext.arc(minx,miny,radius,0,20);

            if(s.isFilled)
            {
                bcontext.fillStyle = bcontext.strokeStyle;
                bcontext.fill();
            }

            bcontext.stroke();
            bcontext.closePath();
        

        }  
        else if (s.objecttype == "TEXT")   
        {   
            let finalpoint = s.points[s.points.length -1];
            let textobject = s as StemText;
        
            let textsize = (parseInt(s.strokewidth)) * 2;
            
            bcontext.font = `${textsize}px Arial`;
            bcontext.lineWidth = 1.5;

            bcontext.fillStyle = bcontext.strokeStyle;
            bcontext.fillText(textobject.text, finalpoint.x, finalpoint.y);
         
        }
    });

    // //buffer.transferToImageBitmap //this is our image (hopefully);
    // //console.log(output);
    
    
    buffercanvas.convertToBlob({quality:1, type:"image/jpeg"}).then((blobdata)=>{   

        workercontext.postMessage(blobdata);
    });

    
     

    //workercontext.postMessage(bufferimage); //here we 'return the image back to the caller'
    //return(buffer);
    //postMessage(output,);

}