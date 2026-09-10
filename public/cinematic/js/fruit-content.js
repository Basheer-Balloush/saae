/* Canvas masks sampled into the same particle buffer as the tree. These are
   pictograms and published figures, not a second overlaid DOM animation.
 *
 * Everything here is drawn for a medium that cannot render fine detail: the
 * mask is resampled onto a dot lattice, and a stroke thinner than the lattice
 * spacing does not come out faint, it comes out as scattered beads. Roughly
 * three dots across is the floor for something meant to be read. That is why
 * the labels are set at 50px rather than the 30 that looks right on a canvas,
 * why the text uses the bundled 900 weight throughout, and why the hairlines are 7px
 * and not 3: at 3 they rendered as dotted noise across the middle of the
 * frame. If anything here is ever made smaller or lighter it will not look
 * subtle, it will look broken. */
/* The learning screen's progress bar, in mask pixels. Exported because the
   scene has to know which dots belong to it: those are the ones it reveals as
   the reader scrolls, rather than baking a fill level into the picture. */
export const FILL_BAR = { x0: 280, y0: 343, x1: 718, y1: 351 };

export function fruitContentMask(kind, language) {
  const canvas=document.createElement('canvas');
  canvas.width=960; canvas.height=560;
  const c=canvas.getContext('2d',{willReadFrequently:true});
  c.strokeStyle='#fff'; c.fillStyle='#fff'; c.lineWidth=8;
  c.lineCap='round'; c.lineJoin='round';
  const line=(points)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();};
  const box=(x,y,w,h)=>{c.beginPath();c.roundRect(x,y,w,h,18);c.stroke();};
  const text=(value,x,y,size,weight=700)=>{
    c.font=`${weight} ${size}px Cairo, sans-serif`;
    c.direction=language==='ar'?'rtl':'ltr'; c.textAlign='center';c.textBaseline='middle';c.fillText(value,x,y);
  };
  if(kind===0){
    // A learning screen: open book, play lesson, a progress bar and connected modules.
    box(110,45,740,360);
    line([[110,100],[850,100]]);
    for(let i=0;i<3;i++){c.beginPath();c.arc(145+i*25,74,5,0,Math.PI*2);c.fill();}
    line([[440,145],[365,130],[280,145],[280,290],[365,276],[440,295],[515,276],[600,290],[600,145],[515,130],[440,145],[440,295]]);
    line([[310,180],[363,171],[407,181]]); line([[310,218],[363,209],[407,219]]);
    line([[478,181],[520,171],[567,180]]); line([[478,219],[520,209],[567,218]]);
    c.beginPath();c.arc(713,210,47,0,Math.PI*2);c.stroke();
    line([[701,187],[731,210],[701,233],[701,187]]);
    /* The progress bar. It used to be drawn at a fixed 286 of 438 -- a picture
       OF a progress bar, frozen at sixty-one percent, which is the one thing a
       progress bar should never be. The interior is drawn full now and the
       scene hides the part that has not filled yet, so it fills as the reader
       scrolls through the beat. The rectangle below is the region that hides:
       it is returned with the mask so the geometry stays next to the drawing
       that owns it rather than being restated as pixel numbers somewhere else. */
    box(266,332,466,30); c.fillRect(FILL_BAR.x0,FILL_BAR.y0,FILL_BAR.x1-FILL_BAR.x0,FILL_BAR.y1-FILL_BAR.y0);
    line([[480,405],[480,448],[242,448],[718,448]]);
    for(const x of [242,480,718]){line([[x,448],[x,470]]);box(x-64,470,128,64);line([[x-24,499],[x-6,515],[x+27,488]]);}
  }else if(kind===1){
    const labels=language==='ar'?['متدرّب','دورة','شريك استراتيجي','مجتمعات']:['TRAINEES','COURSES','PARTNERS','COMMUNITIES'];
    const values=['5,000+','120+','30+','9'];
    for(let i=0;i<4;i++){
      const x=i%2?706:254, y=i<2?150:393;
      text(values[i],x,y,116,900); text(labels[i],x,y+92,50,900);
    }
    c.lineWidth=7;line([[480,54],[480,523]]);line([[92,282],[868,282]]);
  }else{
    // The initiative keeps a distinct fruit and a distinct particle quantity.
    text('1,000,000',480,246,150,900);
    text(language==='ar'?'مستخدم سوري للذكاء الاصطناعي':'SYRIAN AI USERS',480,378,58,900);
    /* A row of connected seeds echoes the tree's fruit before its
       reconstruction. Drawn heavy: at 5px the rule and its 10px seeds sampled
       into a smear of static under the number rather than a line of nodes. */
    c.lineWidth=9;line([[190,462],[770,462]]);
    for(const x of [190,335,480,625,770]){c.beginPath();c.arc(x,462,17,0,Math.PI*2);c.fill();}
  }
  const d=c.getImageData(0,0,canvas.width,canvas.height).data;
  const a=new Float32Array(canvas.width*canvas.height);
  for(let i=0;i<a.length;i++)a[i]=d[i*4+3]/255;
  return {a,w:canvas.width,h:canvas.height,aspect:canvas.width/canvas.height,
    fillBar:kind===0?FILL_BAR:null};
}
