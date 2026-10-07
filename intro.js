'use strict';
// Intro-animatie 'Ontzorgen en waarde creëren': van losse partijen met verwarde lijnen,
// via één regie (YAH-Advies in het midden), naar een geordend netwerk met resultaat.
(()=>{
const root=document.getElementById('wat-wij-doen');
if(!root)return;
const svg=root.querySelector('.intro-svg');
const caption=root.querySelector('.intro-caption');
const playBtn=root.querySelector('.intro-play');
const stepBtns=[...root.querySelectorAll('[data-scene]')];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS='http://www.w3.org/2000/svg';
const CX=280,CY=212,RAD=158;

const LABELS=['Leveranciers','Locaties','Planning','Budget','Beheer','Gebruikers','Techniek','Risico’s'];
// willekeurig ogende, vaste beginposities (zorgen)
const CHAOS=[[118,96],[432,74],[262,176],[470,262],[96,292],[336,352],[178,392],[458,392]];
const ORDER=LABELS.map((_,i)=>{const a=(-90+i*45)*Math.PI/180;return[CX+Math.cos(a)*RAD,CY+Math.sin(a)*RAD]});
const TANGLE=[[0,3],[1,4],[2,7],[5,1],[6,2],[4,5],[0,7],[3,6],[1,2]];
const CAPTIONS=['Veel partijen, veel zorgen.','Eén regie neemt de zorg over.','Rust, overzicht en een werkend resultaat.'];

const el=(n,a={},p=svg)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);p.append(e);return e};
const g={};
g.ring=el('circle',{class:'it-ring',cx:CX,cy:CY,r:RAD});
g.tangle=TANGLE.map(()=>el('path',{class:'it-tangle'}));
g.spokes=LABELS.map(()=>el('path',{class:'it-spoke'}));
g.pulses=LABELS.map(()=>el('circle',{class:'it-pulse',r:3.5}));
g.hub=el('g',{class:'it-hub'});
el('circle',{cx:CX,cy:CY,r:46,class:'it-hub-bg'},g.hub);
el('image',{href:'assets/brand/yah-advies-embleem.png',x:CX-30,y:CY-24,width:60,height:47},g.hub);
g.nodes=LABELS.map((lab,i)=>{
  const n=el('g',{class:'it-node'});
  el('circle',{r:10},n);
  const warn=el('text',{class:'it-warn','text-anchor':'middle',y:4},n);warn.textContent='!';
  const t=el('text',{class:'it-label','text-anchor':'middle',y:28},n);t.textContent=lab;
  return n;
});
const outcomes=[...root.querySelectorAll('.intro-outcomes li')];

let pos=CHAOS.map(p=>p.slice()),mix=0,scene=0,raf=0,timer=null,playing=!reduce,inView=false,cycles=0,t0=performance.now();
const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
const curve=(a,b,bend)=>{const mx=(a[0]+b[0])/2+bend,my=(a[1]+b[1])/2-bend;return`M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`};

function render(now){
  g.tangle.forEach((p,k)=>{const[a,b]=TANGLE[k];p.setAttribute('d',curve(pos[a],pos[b],(k%2?1:-1)*40*(1-mix)));p.style.opacity=(1-mix).toFixed(2)});
  g.spokes.forEach((p,i)=>{p.setAttribute('d',`M${CX},${CY} L${pos[i][0].toFixed(1)},${pos[i][1].toFixed(1)}`);p.style.opacity=mix.toFixed(2)});
  g.ring.style.opacity=(mix*.9).toFixed(2);
  g.hub.style.opacity=mix.toFixed(2);g.hub.style.transform=`scale(${(.6+.4*mix).toFixed(3)})`;
  g.nodes.forEach((n,i)=>{n.setAttribute('transform',`translate(${pos[i][0].toFixed(1)},${pos[i][1].toFixed(1)})`);
    n.classList.toggle('is-worry',scene===0);n.classList.toggle('is-value',scene===2)});
  // signalen over de spaken in de resultaatfase
  g.pulses.forEach((c,i)=>{
    if(scene!==2||reduce){c.style.opacity=0;return}
    const k=((now-t0)/1600+i/LABELS.length)%1;
    c.setAttribute('cx',(CX+(pos[i][0]-CX)*k).toFixed(1));c.setAttribute('cy',(CY+(pos[i][1]-CY)*k).toFixed(1));
    c.style.opacity=(k<.9?1:0)});
}

function go(s){
  scene=s;
  stepBtns.forEach((b,i)=>b.setAttribute('aria-current',i===s?'step':'false'));
  caption.textContent=CAPTIONS[s];
  outcomes.forEach(o=>o.classList.toggle('is-on',s===2));
  root.classList.toggle('scene-2',s===2);
  const from=pos.map(p=>p.slice()),to=s===0?CHAOS:ORDER,m0=mix,m1=s===0?0:1,start=performance.now(),dur=reduce?0:1400;
  cancelAnimationFrame(raf);
  const tick=now=>{const k=dur?Math.min(1,(now-start)/dur):1,e=ease(k);
    pos=from.map((p,i)=>[p[0]+(to[i][0]-p[0])*e,p[1]+(to[i][1]-p[1])*e]);mix=m0+(m1-m0)*e;render(now);
    if(k<1||(scene===2&&!reduce))raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);
  clearTimeout(go.t);go.t=setTimeout(()=>{if(Math.abs(mix-m1)>.01){pos=to.map(p=>p.slice());mix=m1;render(performance.now())}},dur+150);
}

function schedule(){
  clearTimeout(timer);
  if(!playing||!inView||document.hidden)return;
  timer=setTimeout(()=>{
    if(scene===2){cycles++;if(cycles>=2){playing=false;syncPlay();return}}
    go((scene+1)%3);schedule();
  },scene===2?6000:4200);
}
function syncPlay(){playBtn.textContent=playing?'Pauzeer animatie':'Speel animatie af'}
stepBtns.forEach((b,i)=>b.addEventListener('click',()=>{caption.setAttribute('aria-live','polite');playing=false;syncPlay();clearTimeout(timer);go(i)}));
playBtn.addEventListener('click',()=>{playing=!playing;cycles=0;syncPlay();if(playing){go((scene+1)%3)}schedule()});
document.addEventListener('visibilitychange',schedule);

render(performance.now());
if(reduce){go(2);syncPlay()}
else{go(0);syncPlay()}
if('IntersectionObserver' in window)new IntersectionObserver(([e])=>{inView=e.isIntersecting;schedule()},{threshold:.35}).observe(root);
else{inView=true;schedule()}
})();
