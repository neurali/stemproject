class helper{

    static IsPointInsideBoxAtPoint(penx,peny,boxx,boxy,size)
    {
        if(penx < (boxx + size) && penx > ((boxx - size)))
        {
            if(peny < (boxy + size) && peny > (boxy - size))
            {
                return true;
            }
            else
            {
                return false;
            }
        }
        else
        {
            return false;
        }
              
    }

    static  getGUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        }

    static componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
        }
        
        static rgbToHex(r, g, b) {
        return "#" + helper.componentToHex(r) + helper.componentToHex(g) + helper.componentToHex(b);
        }
          
        static hexToRgb(hex) {
            const normal = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
            if (normal) return normal.slice(1).map(e => parseInt(e, 16));
            const shorthand = hex.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
            if (shorthand) return shorthand.slice(1).map(e => 0x11 * parseInt(e, 16));
            return null;
          }

    static angleTwoPoint(ax,ay,bx,by)
    {
        let result = (Math.atan2(ay-by,ax-bx) * 180 / Math.PI);
      

        return result;
        //
    }

    static RotatePoint(inputx, inputy, a, b, c, d) {

        a = Math.cos(30);
        b = Math.asin(30);
        c - Math.sin(30);
        d - Math.cos(30);

        let outputx = ((a * inputx) + (b * inputx)) ;
        let outputy = ((c * inputy) + (d * inputy));

        return new SimplePoint(outputx, outputy);
    }

    static isBetween(input,low, high,padding=0)
    {
        if(input > (low - padding))
        {
            if(input < (high + padding))
            {
                return true
            }
            else
            {
                return false;
            }
        }
        else
        {return false;}
    }

    static random(min,max)
    {
        return Math.random() * (max - min) + min;
    }

   
  
    
}