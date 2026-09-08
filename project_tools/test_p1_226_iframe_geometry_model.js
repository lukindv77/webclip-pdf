'use strict';

const assert = require('assert');

class Matrix2D {
  constructor(a=1,b=0,c=0,d=1,e=0,f=0){ Object.assign(this,{a,b,c,d,e,f}); }
  static identity(){ return new Matrix2D(); }
  static translate(x,y){ return new Matrix2D(1,0,0,1,x,y); }
  static scale(x,y=x){ return new Matrix2D(x,0,0,y,0,0); }
  static rotate(deg){ const r=deg*Math.PI/180, c=Math.cos(r), s=Math.sin(r); return new Matrix2D(c,s,-s,c,0,0); }
  multiply(other){
    return new Matrix2D(
      this.a*other.a + this.c*other.b,
      this.b*other.a + this.d*other.b,
      this.a*other.c + this.c*other.d,
      this.b*other.c + this.d*other.d,
      this.a*other.e + this.c*other.f + this.e,
      this.b*other.e + this.d*other.f + this.f
    );
  }
  point(x,y){ return { x:this.a*x + this.c*y + this.e, y:this.b*x + this.d*y + this.f }; }
}

function bounds(points){
  const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
  const left=Math.min(...xs), right=Math.max(...xs), top=Math.min(...ys), bottom=Math.max(...ys);
  return {left,top,right,bottom,width:right-left,height:bottom-top};
}

function rectCorners(r){
  return [
    {x:r.left,y:r.top}, {x:r.right,y:r.top},
    {x:r.right,y:r.bottom}, {x:r.left,y:r.bottom}
  ];
}

// Each frame step maps coordinates from its child viewport into its parent viewport.
// `contentOffset` is the frame content-box origin in the frame's local border-box
// coordinate space. `localToParent` includes layout translation + CSS transform/zoom.
function frameStep({contentOffset={x:0,y:0}, localToParent=Matrix2D.identity()}){
  return localToParent.multiply(Matrix2D.translate(contentOffset.x, contentOffset.y));
}

function projectRectToTop(childRect, frameChain){
  let matrix=Matrix2D.identity();
  for(const frame of frameChain){
    matrix=frameStep(frame).multiply(matrix);
  }
  return bounds(rectCorners(childRect).map(p=>matrix.point(p.x,p.y)));
}

// Current-shape approximation: add each transformed frame bounding-box left/top,
// but never compose child coordinates with content-box offsets or scale/transform.
function legacySimpleAddition(childRect, frameBoundingRects){
  let left=childRect.left, top=childRect.top;
  for(const fr of frameBoundingRects){ left += fr.left; top += fr.top; }
  return {left,top,right:left+childRect.width,bottom:top+childRect.height,width:childRect.width,height:childRect.height};
}

function close(actual, expected, epsilon=1e-9){ assert.ok(Math.abs(actual-expected)<=epsilon, `${actual} != ${expected}`); }
function closeRect(a,b,epsilon=1e-9){ for(const k of ['left','top','right','bottom','width','height']) close(a[k],b[k],epsilon); }

// Current-source counterexample: 10px border/content offset + transform:scale(.5).
{
  const child={left:20,top:30,right:120,bottom:70,width:100,height:40};
  const step={contentOffset:{x:10,y:10},localToParent:Matrix2D.translate(200,100).multiply(Matrix2D.scale(.5))};
  const truthful=projectRectToTop(child,[step]);
  const legacy=legacySimpleAddition(child,[{left:200,top:100}]);
  assert.notDeepStrictEqual(legacy,truthful);
  closeRect(truthful,{left:215,top:120,right:265,bottom:140,width:50,height:20});
  assert.deepStrictEqual(legacy,{left:220,top:130,right:320,bottom:170,width:100,height:40});
  console.log('P1-226 current-shape counterexample: simple frameRect addition misses content offset and scale');
}

// A. Top-document element: no frame chain is identity.
{
  const r={left:10,top:20,right:110,bottom:60,width:100,height:40};
  closeRect(projectRectToTop(r,[]),r);
}

// B. Border/content-box offset without transform.
{
  const r={left:5,top:6,right:25,bottom:16,width:20,height:10};
  const step={contentOffset:{x:3,y:7},localToParent:Matrix2D.translate(100,50)};
  closeRect(projectRectToTop(r,[step]),{left:108,top:63,right:128,bottom:73,width:20,height:10});
}

// C. Scale changes position AND dimensions.
{
  const r={left:20,top:10,right:120,bottom:50,width:100,height:40};
  const step={contentOffset:{x:4,y:6},localToParent:Matrix2D.translate(50,25).multiply(Matrix2D.scale(.5))};
  closeRect(projectRectToTop(r,[step]),{left:62,top:33,right:112,bottom:53,width:50,height:20});
}

// D. Nested same-origin frames compose every ancestor transform/content origin.
{
  const r={left:8,top:12,right:48,bottom:32,width:40,height:20};
  const inner={contentOffset:{x:2,y:4},localToParent:Matrix2D.translate(20,30).multiply(Matrix2D.scale(2))};
  const outer={contentOffset:{x:5,y:7},localToParent:Matrix2D.translate(100,200).multiply(Matrix2D.scale(.5))};
  // inner: x'=20+2*(x+2), outer: x''=100+.5*(x'+5)
  closeRect(projectRectToTop(r,[inner,outer]),{left:122.5,top:234.5,right:162.5,bottom:254.5,width:40,height:20});
}

// E. Rotation/skew-class affine mapping must project all four corners, not only
// top-left plus untransformed width/height.
{
  const r={left:0,top:0,right:100,bottom:20,width:100,height:20};
  const step={contentOffset:{x:0,y:0},localToParent:Matrix2D.translate(200,100).multiply(Matrix2D.rotate(90))};
  closeRect(projectRectToTop(r,[step]),{left:180,top:100,right:200,bottom:200,width:20,height:100},1e-8);
}

// F. CSS zoom is another scale in the visual mapping.
{
  const r={left:10,top:10,right:30,bottom:30,width:20,height:20};
  const step={contentOffset:{x:2,y:2},localToParent:Matrix2D.translate(5,7).multiply(Matrix2D.scale(1.5))};
  closeRect(projectRectToTop(r,[step]),{left:23,top:25,right:53,bottom:55,width:30,height:30});
}

// G. Top-document scroll is applied only after viewport projection. Child scroll
// is already represented by the child getBoundingClientRect() coordinates.
{
  const r={left:10,top:-20,right:30,bottom:0,width:20,height:20};
  const step={contentOffset:{x:1,y:1},localToParent:Matrix2D.translate(100,80)};
  const viewport=projectRectToTop(r,[step]);
  const scroll={x:300,y:400};
  const doc={left:viewport.left+scroll.x,top:viewport.top+scroll.y,right:viewport.right+scroll.x,bottom:viewport.bottom+scroll.y,width:viewport.width,height:viewport.height};
  closeRect(doc,{left:411,top:461,right:431,bottom:481,width:20,height:20});
}

// H. Geometry changes admission authority: 3x3 CSS px inside scale(.5) is only
// 1.5x1.5 visual px and must fail a >=2px usability threshold.
{
  const r={left:0,top:0,right:3,bottom:3,width:3,height:3};
  const truthful=projectRectToTop(r,[{contentOffset:{x:0,y:0},localToParent:Matrix2D.scale(.5)}]);
  const legacy=legacySimpleAddition(r,[{left:0,top:0}]);
  const usable=x=>x.width>=2 && x.height>=2;
  assert.strictEqual(usable(legacy),true);
  assert.strictEqual(usable(truthful),false);
}

// I. Visual overlap must use projected top-space bounds. Two child rects from
// different transformed frames can overlap even when naive local widths/offsets say otherwise.
{
  const a={left:0,top:0,right:100,bottom:20,width:100,height:20};
  const b={left:0,top:0,right:40,bottom:20,width:40,height:20};
  const ar=projectRectToTop(a,[{contentOffset:{x:0,y:0},localToParent:Matrix2D.translate(0,0).multiply(Matrix2D.scale(.5))}]);
  const br=projectRectToTop(b,[{contentOffset:{x:0,y:0},localToParent:Matrix2D.translate(45,0)}]);
  const overlap=(x,y)=>Math.min(x.right,y.right)-Math.max(x.left,y.left)>0.5 && Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>0.5;
  assert.strictEqual(overlap(ar,br),true); // A visually spans x=0..50, B x=45..85.
}

console.log('P1-226 same-origin iframe top-space geometry deterministic model: PASS');
