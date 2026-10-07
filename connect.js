'use strict';
// Verbindingslijn: één lijn in de linkermarge die alle secties van de pagina met elkaar verbindt.
// Bij elke sectiekop een knooppunt met een korte aftakking; de lijn tekent mee met het scrollen
// en er loopt een signaal overheen. Alleen op brede schermen; stil bij 'minder beweging'.
(()=>{
const main=document.getElementById('main');
if(!main)return;
const NS='http://www.w3.org/2000/svg';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const wide=matchMedia('(min-width: 1101px)');
let svg,live,pulse,nodes=[],len=0,startY=0,endY=0,x=0,raf=0,t0=performance.now(),lastScroll=0;

function anchors(){
  // eerste kop per sectie (paginatitel, sectiekop of contactkop)
  return [...main.querySelectorAll(':scope > section')]
    .map(sec=>({sec,h:sec.querySelector('.page-title, .section-heading, h1, h2')}))
    .filter(a=>a.h);
}

function build(){
  if(svg){svg.remove();svg=null}
  cancelAnimationFrame(raf);
  if(!wide.matches)return;
  const mr=main.getBoundingClientRect();
  const pts=anchors().map(({sec,h})=>{const r=h.getBoundingClientRect(),sr=sec.getBoundingClientRect();
    const edge=sr.left-mr.left+parseFloat(getComputedStyle(sec).paddingLeft);
    return{y:r.top-mr.top+14,hx:Math.min(r.left-mr.left,edge)}}).filter(p=>p.hx>60);
  if(pts.length<2)return;
  x=Math.max(24,Math.min(...pts.map(p=>p.hx))/2);
  startY=pts[0].y;endY=pts[pts.length-1].y;
  svg=document.createElementNS(NS,'svg');svg.setAttribute('class','spine');svg.setAttribute('aria-hidden','true');
  svg.style.height=main.scrollHeight+'px';
  const mk=(n,a)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);svg.append(e);return e};
  const d=`M${x},${startY} V${endY}`;
  mk('path',{d,class:'spine-base'});
  live=mk('path',{d,class:'spine-live'});
  len=endY-startY;live.style.strokeDasharray=len;live.style.strokeDashoffset=len;
  nodes=pts.map(p=>({y:p.y,
    stub:mk('path',{d:`M${x},${p.y} H${p.hx-14}`,class:'spine-stub'}),
    dot:mk('circle',{cx:x,cy:p.y,r:5,class:'spine-node'})}));
  pulse=reduce?null:mk('circle',{cx:x,cy:startY,r:3.5,class:'spine-pulse'});
  main.prepend(svg);
  update();
  if(pulse)raf=requestAnimationFrame(tick);
}

function progressY(){
  const mr=main.getBoundingClientRect();
  return Math.min(endY,Math.max(startY,innerHeight*.62-mr.top));
}

function update(){
  if(!svg)return;
  const y=reduce?endY:progressY();
  live.style.strokeDashoffset=len-(y-startY);
  nodes.forEach(n=>{const lit=n.y<=y+1;n.dot.classList.toggle('is-lit',lit);n.stub.classList.toggle('is-lit',lit)});
}

function tick(now){
  // signaal loopt van het begin naar het huidige punt en begint dan opnieuw
  const y=progressY(),span=Math.max(1,y-startY),dur=Math.max(1400,span*2.2);
  const k=((now-t0)%dur)/dur;
  pulse.setAttribute('cy',(startY+span*k).toFixed(1));
  pulse.style.opacity=(span<20||now-lastScroll>2500)?0:1;
  raf=requestAnimationFrame(tick);
}

let st;const rebuild=()=>{clearTimeout(st);st=setTimeout(build,150)};
addEventListener('scroll',()=>{lastScroll=performance.now();requestAnimationFrame(update)},{passive:true});
addEventListener('resize',rebuild);
wide.addEventListener?.('change',rebuild);
if('ResizeObserver' in window)new ResizeObserver(rebuild).observe(main);
document.fonts&&document.fonts.ready.then(rebuild);
addEventListener('load',rebuild);
build();
})();
