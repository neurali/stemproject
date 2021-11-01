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