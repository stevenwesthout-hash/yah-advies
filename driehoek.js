'use strict';
// Duivelse driehoek en ijzeren vierkant als bewegende technische tekening.
// De kwaliteitscirkel volgt de verhouding tussen middelen (tijd × geld) en vraag (scope × kwaliteitseisen).
// Naast de vaste stappen kan de bezoeker zelf randvoorwaarden verschuiven ('Zelf verkennen').
(()=>{
const EN=document.documentElement.lang==='en';
// Weergavenamen; de Nederlandse aslabels blijven de interne sleutels.
const AXIS_EN={Tijd:'Time',Geld:'Money',Scope:'Scope',Kwaliteit:'Quality'};
const tr=l=>EN?(AXIS_EN[l]||l):l;
const root=document.getElementById('spanningsveld');
if(!root)return;
const svg=root.querySelector('.balance-svg');
const stepsEl=root.querySelector('.balance-steps');
const caption=root.querySelector('.balance-caption');
const playBtn=root.querySelector('.balance-play');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS='http://www.w3.org/2000/svg';
let C={x:260,y:240};const R=150;

const MODELS={
  driehoek:{
    axes:[{label:'Tijd',a:-90},{label:'Geld',a:30},{label:'Scope',a:150}],
    steps:[
      {title:EN?'Balance':'Balans',r:[1,1,1],hl:[],text:EN?'Time, money and scope keep each other in balance. Quality sits in the middle.':'Tijd, geld en scope houden elkaar in evenwicht. De kwaliteit zit in het midden.'},
      {title:EN?'Earlier deadline':'Deadline eerder',r:[.62,1,1],hl:[0],text:EN?'The deadline moves forward. Without corrective action the room shrinks, and with it the quality.':'De deadline schuift naar voren. Zonder bijsturen krimpt de ruimte, en daarmee de kwaliteit.'},
      {title:EN?'Control':'Regie',r:[.62,1.47,1],hl:[0,1],text:EN?'Deliberate corrective action: extra budget or capacity absorbs the shorter lead time. Quality is maintained.':'Bewust bijsturen: extra budget of capaciteit vangt de kortere doorlooptijd op. De kwaliteit blijft overeind.'}
    ]
  },
  vierkant:{
    axes:[{label:'Tijd',a:-90},{label:'Geld',a:0},{label:'Kwaliteit',a:90},{label:'Scope',a:180}],
    steps:[
      {title:EN?'Balance':'Balans',r:[1,1,1,1],hl:[],text:EN?'The iron square: time, money, quality and scope are interconnected. The area represents what a team can deliver in a given period.':'Het ijzeren vierkant: tijd, geld, kwaliteit en scope hangen samen. Het oppervlak staat voor wat een team in een periode kan leveren.'},
      {title:EN?'More scope':'Meer scope',r:[1,1,.7,1.45],hl:[3,2],text:EN?'Scope is added, but time and budget stay the same. Then something else quietly gives way: usually the quality.':'Er komt scope bij, maar tijd en budget blijven gelijk. Dan wijkt er stilzwijgend iets anders: meestal de kwaliteit.'},
      {title:EN?'Control':'Regie',r:[1.25,1.2,1,1.45],hl:[3,0,1],text:EN?'A deliberate choice: more time or budget for the extra scope, or a reduced scope. We never quietly sacrifice quality.':'Bewust kiezen: meer tijd of budget voor de extra scope, of de scope terugbrengen. Kwaliteit leveren we niet stilzwijgend in.'}
    ]
  }
};

const el=(n,a={},p=svg)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);p.append(e);return e};
const pt=(ax,r)=>{const t=ax.a*Math.PI/180;return[C.x+Math.cos(t)*R*r,C.y+Math.sin(t)*R*r]};
const area=ps=>Math.abs(ps.reduce((s,p,i)=>{const q=ps[(i+1)%ps.length];return s+p[0]*q[1]-q[0]*p[1]},0))/2;

let model='driehoek',step=0,cur=null,timer=null,playing=!reduce,inView=false,raf=0,explore=null;
// Zelf verkennen: drie standen per hoek
const LEVELS=EN?{Tijd:['Shorter','Same','Longer'],Geld:['Lower','Same','Higher'],Scope:['Smaller','Same','Larger'],Kwaliteit:['Lower','Same','Higher']}:{Tijd:['Korter','Gelijk','Langer'],Geld:['Lager','Gelijk','Hoger'],Scope:['Kleiner','Gelijk','Groter'],Kwaliteit:['Lager','Gelijk','Hoger']};
const VAL=[.72,1,1.3];
const ratio=r=>{const ax=MODELS[model].axes.map(a=>a.label),v=l=>{const i=ax.indexOf(l);return i<0?1:r[i]};return (v('Tijd')*v('Geld'))/(v('Scope')*v('Kwaliteit'))};
let g={};

function build(){
  svg.querySelectorAll(':scope>:not(title)').forEach(n=>n.remove());
  const m=MODELS[model];
  C={x:260,y:model==='driehoek'?268:240};
  const grid=el('g',{class:'bs-grid'});
  m.axes.forEach(ax=>{const[x,y]=pt(ax,1.62);el('line',{x1:C.x,y1:C.y,x2:x,y2:y},grid)});
  [.5,1,1.5].forEach(r=>el('polygon',{points:m.axes.map(ax=>pt(ax,r).join(',')).join(' '),class:'bs-ring'},grid));
  g.ghost=el('polygon',{class:'bs-ghost',points:m.axes.map(ax=>pt(ax,1).join(',')).join(' ')});
  g.shape=el('polygon',{class:'bs-shape'});
  g.quality=model==='driehoek'?el('circle',{class:'bs-quality',cx:C.x,cy:C.y,r:0}):null;
  g.qlabel=model==='driehoek'?el('text',{class:'bs-qlabel',x:C.x,y:C.y+5,'text-anchor':'middle'}):null;
  if(g.qlabel)g.qlabel.textContent=EN?'Quality':'Kwaliteit';
  g.nodes=m.axes.map(()=>el('circle',{class:'bs-node',r:7}));
  g.labels=m.axes.map(ax=>{const t=el('text',{class:'bs-label'});t.textContent=tr(ax.label);return t});
  cur=m.steps[0].r.slice();
  stepsEl.replaceChildren(...m.steps.map((s,i)=>{const li=document.createElement('li');const b=document.createElement('button');b.type='button';b.textContent=s.title;b.onclick=()=>{announce();go(i);stop()};li.append(b);return li}));
}

function draw(r){
  const m=MODELS[model],s=explore?{hl:explore.hl}:m.steps[step];
  const ps=m.axes.map((ax,i)=>pt(ax,r[i]));
  g.shape.setAttribute('points',ps.map(p=>p.join(',')).join(' '));
  ps.forEach((p,i)=>{
    const hot=s.hl.includes(i);
    g.nodes[i].setAttribute('cx',p[0]);g.nodes[i].setAttribute('cy',p[1]);
    g.nodes[i].classList.toggle('is-hot',hot);
    const ax=m.axes[i],t=ax.a*Math.PI/180,off=26;
    const lx=p[0]+Math.cos(t)*off,ly=p[1]+Math.sin(t)*off+5;
    const anchor=Math.abs(Math.cos(t))<.3?'middle':(Math.cos(t)>0?'start':'end');
    Object.entries({x:lx,y:ly,'text-anchor':anchor}).forEach(([k,v])=>g.labels[i].setAttribute(k,v));
    g.labels[i].classList.toggle('is-hot',hot);
  });
  if(g.quality){
    const q=46*Math.sqrt(ratio(r));
    g.quality.setAttribute('r',q.toFixed(1));
    g.quality.classList.toggle('is-low',q<40);
  }
  g.shape.classList.toggle('is-changed',explore?explore.hl.length>0:step>0);
}

function go(i){
  explore=null;syncExplore();
  const m=MODELS[model];step=(i+m.steps.length)%m.steps.length;
  const s=m.steps[step];
  [...stepsEl.children].forEach((li,j)=>li.firstChild.setAttribute('aria-current',j===step?'step':'false'));
  caption.textContent=s.text;
  cancelAnimationFrame(raf);
  animateTo(s.r.slice());
}

function animateTo(to){
  const from=cur.slice(),t0=performance.now(),dur=reduce?0:1100;
  const tick=now=>{const k=dur?Math.min(1,(now-t0)/dur):1;const e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
    cur=from.map((v,j)=>v+(to[j]-v)*e);draw(cur);if(k<1)raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);
  // Vangnet als de browser animatieframes pauzeert (tab op de achtergrond).
  clearTimeout(go.t);go.t=setTimeout(()=>{if(cur.some((v,j)=>Math.abs(v-to[j])>1e-3)){cancelAnimationFrame(raf);cur=to.slice();draw(cur)}},dur+120);
}

// Zelf verkennen: knoppen per hoek, standen Korter/Gelijk/Langer enz.
const bx=document.createElement('fieldset');bx.className='bx';
const note=document.createElement('p');note.className='bx-note';
note.textContent=EN?'A schematic trade-off: the effect depends on the assignment, capacity and risks.':'Een schematische afweging: het effect hangt af van de opdracht, capaciteit en risico’s.';
stepsEl.after(bx);
function buildExplore(){
  const m=MODELS[model];
  bx.replaceChildren();
  const lg=document.createElement('legend');lg.textContent=EN?'Explore for yourself':'Zelf verkennen';bx.append(lg);
  m.axes.forEach((ax,i)=>{
    const row=document.createElement('div');row.className='bx-row';row.setAttribute('role','group');row.setAttribute('aria-label',tr(ax.label));
    const name=document.createElement('span');name.className='bx-name';name.textContent=ax.label==='Kwaliteit'?(EN?'Quality requirements':'Kwaliteitseisen'):tr(ax.label);row.append(name);
    LEVELS[ax.label].forEach((lab,j)=>{const b=document.createElement('button');b.type='button';b.textContent=lab;b.dataset.i=i;b.dataset.j=j;
      b.addEventListener('click',()=>setLevel(i,j));row.append(b)});
    bx.append(row);
  });
  const reset=document.createElement('button');reset.type='button';reset.className='back bx-reset';reset.textContent=EN?'Restore starting position':'Herstel uitgangssituatie';
  reset.addEventListener('click',()=>{announce();stop();go(0)});
  bx.append(reset,note);
  syncExplore();
}
function setLevel(i,j){
  announce();stop();
  const m=MODELS[model];
  if(!explore)explore={lv:m.axes.map(()=>1),hl:[]};
  explore.lv[i]=j;explore.hl=explore.lv.map((v,k)=>v!==1?k:-1).filter(k=>k>=0);
  [...stepsEl.children].forEach(li=>li.firstChild.setAttribute('aria-current','false'));
  const r=explore.lv.map(v=>VAL[v]);
  const q=ratio(r),kw=model==='vierkant'?(EN?' or lower quality requirements':' of lagere kwaliteitseisen'):'';
  caption.textContent=q>1.08?(EN?'There is room: the time and budget set comfortably cover the scope. Use that room deliberately, for example for extra testing or faster delivery.':'Er is ruimte: de ingestelde tijd en het budget dekken de scope ruim. Benut die ruimte bewust, bijvoorbeeld voor extra testen of een snellere oplevering.')
    :q<0.92?(EN?'This is getting tight. Without corrective action quality comes under pressure: more time or budget, or less scope'+kw+'.':'Dit wordt krap. Zonder bijsturen staat de kwaliteit onder druk: meer tijd of budget, of minder scope'+kw+'.')
    :(EN?'In balance: timeline, budget and scope match the agreed quality.':'In balans: planning, budget en scope passen bij de afgesproken kwaliteit.');
  syncExplore();animateTo(r);
}
function syncExplore(){
  bx.querySelectorAll('.bx-row button').forEach(b=>b.setAttribute('aria-pressed',String((explore?explore.lv[b.dataset.i]:1)==+b.dataset.j)));
}

function schedule(){clearTimeout(timer);if(playing&&inView&&!document.hidden)timer=setTimeout(()=>{go(step+1);schedule()},4600)}
function stop(){playing=false;clearTimeout(timer);syncPlay()}
function syncPlay(){playBtn.textContent=playing?(EN?'Pause animation':'Pauzeer animatie'):(EN?'Play animation':'Speel animatie af')}
const announce=()=>caption.setAttribute('aria-live','polite');

root.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>{
  announce();model=b.dataset.model;root.querySelectorAll('[data-model]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  build();buildExplore();step=0;go(0);schedule();
}));
playBtn.addEventListener('click',()=>{playing=!playing;caption.setAttribute('aria-live',playing?'off':'polite');syncPlay();if(playing){go(step+1)}schedule()});

build();buildExplore();go(0);syncPlay();
document.addEventListener('visibilitychange',schedule);
if('IntersectionObserver' in window){
  new IntersectionObserver(([e])=>{inView=e.isIntersecting;schedule()},{threshold:.35}).observe(root);
}else{inView=true;schedule()}
})();
