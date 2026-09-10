import * as THREE from './three.module.min.js';

const clamp = x => Math.max(0, Math.min(1, x));
/* Smootherstep, not smoothstep. Both start and end at rest, but smoothstep
   still has a jerk at each end -- its ACCELERATION jumps from zero to full the
   instant a window opens, which is what makes a transition feel like it starts
   abruptly however long you give it. 6t^5-15t^4+10t^3 has zero first AND
   second derivative at both ends, so a beat eases into moving and eases out of
   it. Same endpoints, same reversibility, softer shoulders. */
const smooth = (a, b, x) => { const t = clamp((x-a)/(b-a)); return t*t*t*(t*(t*6-15)+10); };
// Anchors and paths are traced in the official logo's 301.81 × 339 viewBox.
export const ROOTS = [[93,324],[103,335],[130,337],[171,337],[199,335],[209,324]];
export const FRUITS = [[271.48,183.02],[271.33,66.82],[150.92,6.34]];
// Separate destinations: lower-right LMS, upper-right statistics, top initiative.
/* Each visit is: travel to the fruit, assemble the content, HOLD it, dissolve.
   The hold is the only part a reader actually reads, and it used to be the
   shortest: assembled at .435 and already dissolving at .466 is 0.031 of the
   journey, about 330px of a 10,800px hero, which is under a second at any
   ordinary scroll speed. The pictograms were resolving correctly and nobody
   was getting to see them -- passing through one looked like drifting dust.

   The budget per visit is unchanged, so the schedule still ends where the
   finale expects it. The time comes out of `travel`, which is a camera move
   with nothing to read in it, and goes into the hold: 0.052 to fly, 0.026 to
   assemble, 0.062 at rest, 0.024 to dissolve. The legible window is now twice
   what it was, and it is the largest part of each visit rather than the
   smallest. */
export const FRUIT_VISITS = [
  { travel:[.320,.372], source:[151,314], sourceZoom:12.6, zoom:11.4, reveal:[.380,.406], restore:[.468,.492] },
  { travel:[.492,.544], source:FRUITS[0], sourceZoom:11.4, zoom:10.8, reveal:[.552,.578], restore:[.640,.664] },
  { travel:[.664,.716], source:FRUITS[1], sourceZoom:10.8, zoom:11.2, reveal:[.724,.750], restore:[.812,.836] }
];
const mix=(a,b,t)=>t===0?a:t===1?b:a+(b-a)*t;

export function treeStoryState(progress) {
  const p=clamp(progress);
  let focus=[151,169.5], zoom=29.6;
  const rootEntry=smooth(.055,.135,p);
  focus=[151,169.5+(314-169.5)*rootEntry];
  zoom=29.6+(12.6-29.6)*rootEntry;
  let contentIndex=0, content=0, hold=0;
  FRUIT_VISITS.forEach((visit,i)=>{
    const [a,b]=visit.travel;
    if(p<a)return;
    const t=clamp((p-a)/(b-a));
    // First retreat from the current node to the whole tree. Hold that wider
    // framing briefly, then approach the next actual branch endpoint.
    const out=smooth(0,.43,t), into=smooth(.55,1,t);
    const overview=[151,169.5];
    focus=visit.source.map((v,j)=>mix(mix(v,overview[j],out),FRUITS[i][j],into));
    zoom=mix(mix(visit.sourceZoom,33.5,out),visit.zoom,into);
    contentIndex=i;
    content=smooth(...visit.reveal,p)*(1-smooth(...visit.restore,p));
    /* Where we are ACROSS the hold, 0 at the moment the content finishes
       assembling and 1 at the moment it starts dissolving. The hold is nearly
       a full screen of scrolling now, and a held frame that does not move at
       all for a screen stops reading as a paused camera and starts reading as
       a stalled page. A function of p, so it retraces on the way back up. */
    hold=clamp((p-visit.reveal[1])/(visit.restore[0]-visit.reveal[1]));
  });
  return {
    focus, zoom, entry:rootEntry, contentIndex, content, hold,
    rootIndex:Math.min(5,Math.floor(clamp((p-.135)/.18)*6)),
    roots:smooth(.09,.14,p)*(1-smooth(.31,.36,p)),
    /* Each fruit marker lights as its own travel ends and goes out as the
       next one begins, so these track the visit table above rather than
       carrying their own schedule. */
    fruitWeights:[
      smooth(.352,.372,p)*(1-smooth(.492,.512,p)),
      smooth(.524,.544,p)*(1-smooth(.664,.684,p)),
      smooth(.696,.716,p)*(1-smooth(.876,.926,p))
    ],
    /* The collapse and the map OVERLAP on purpose. Run end to end they leave
       a stretch where the tree has already gone and the country has barely
       started, and the last band's copy is on screen by then -- roughly a
       screen and a half of scroll reading "From our roots, to all of Syria"
       over an empty frame. Starting the country while the last of the tree is
       still folding in means the dots travel straight from one into the
       other, and the map is whole by .928 with the rest of the journey to
       hold it. */
    collapse:smooth(.836,.874,p),
    map:smooth(.866,.928,p),
    mapCamera:smooth(.852,.928,p)
  };
}

export function createTreeStory(scene, toWorld, color) {
  const group=new THREE.Group(); scene.add(group);
  const geometry=new THREE.PlaneGeometry(1,1);
  const items=[];
  /* The roots no longer get markers. They were there to say WHICH community
     the scroll had landed on, and the scroll does not choose one any more --
     the reader does, from a card, out of nine. Six rings that point at nothing
     are just six blue dots on the drawing, so the roots are lit by a rising
     band of light in the flight shader instead, which needs no geometry here.
     The fruit markers stay: those still mark real destinations. */
  for(const [kind,points] of [['fruit',FRUITS]]) {
    points.forEach((point,index)=>{
      const material=new THREE.ShaderMaterial({
        uniforms:{uFade:{value:0},uTime:{value:0},uColor:{value:color}},
        vertexShader:`varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader:`precision mediump float; varying vec2 vUv; uniform float uFade,uTime; uniform vec3 uColor;
        void main(){
          float r=length(vUv-.5)*2.;
          float core=1.-smoothstep(.10,.23,r);
          float ring=(1.-smoothstep(.018,.045,abs(r-.48)))*.8;
          float breath=.5+.5*sin(uTime*1.6);
          float halo=exp(-r*r*4.)*(.18+.1*breath);
          float a=(core+ring+halo)*uFade;
          if(r>1.||a<.005) discard;
          gl_FragColor=vec4(mix(uColor,vec3(.93,1.,1.),core),a);
        }`,
        transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending
      });
      const mesh=new THREE.Mesh(geometry,material);
      mesh.position.copy(toWorld(point));
      const size=kind==='root'?.60:1.55;
      mesh.scale.setScalar(size); mesh.renderOrder=3;
      group.add(mesh); items.push({mesh,kind,index});
    });
  }
  return {
    update(state,time,entrance){
      group.visible=state.entry>0 && state.map<1;
      for(const {mesh,index} of items){
        const alpha=state.fruitWeights[index]*(index===state.contentIndex?1-state.content:1);
        mesh.material.uniforms.uFade.value=alpha*entrance;
        mesh.material.uniforms.uTime.value=time;
      }
    },
    dispose(){ geometry.dispose(); items.forEach(({mesh})=>mesh.material.dispose()); scene.remove(group); }
  };
}
