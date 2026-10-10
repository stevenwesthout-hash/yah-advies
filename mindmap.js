'use strict';
// Vaardigheden als mindmap: middelpunt, zes takken in een cirkel, onderdelen klappen per tak uit.
// Smaller dan 900px: dezelfde gegevens als uitklapbare boom.
(()=>{
const EN=document.documentElement.lang==='en';
const panel=document.getElementById('profielkaart');
const map=panel&&panel.querySelector('.mindmap');
if(!map)return;
const NS='http://www.w3.org/2000/svg';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const triggers=document.querySelectorAll('[aria-controls="profielkaart"]');

// Gegevens uit de HTML-lijst lezen
const data=[...map.querySelectorAll('.mm-data>li')].map(li=>({
  label:li.querySelector(':scope>span').textContent,
  items:[...li.querySelectorAll(':scope>ul>li')].map(x=>x.textContent)
}));
map.querySelector('.mm-data').remove();

// Opbouw
const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','mm-lines');svg.setAttribute('aria-hidden','true');
const center=document.createElement('div');center.className='mm-center';center.textContent=map.dataset.center||'';
map.append(svg,center);
const branches=data.map((d,i)=>{
  const btn=document.createElement('button');btn.type='button';btn.className='mm-branch';btn.textContent=d.label;
  btn.setAttribute('aria-expanded','false');btn.id='mm-b'+i;
  const ul=document.createElement('ul');ul.className='mm-leaves';ul.id='mm-l'+i;ul.setAttribute('aria-labelledby',btn.id);ul.hidden=true;
  btn.setAttribute('aria-controls',ul.id);
  d.items.forEach((t,j)=>{const li=document.createElement('li');li.textContent=t;li.style.setProperty('--i',j);ul.append(li)});
  map.append(btn,ul);
  btn.addEventListener('click',()=>activate(active===i?-1:i));
  return{btn,ul};
});

let active=-1,mode='';
const pos=(el)=>{const r=el.getBoundingClientRect(),m=map.getBoundingClientRect();return{x:r.left-m.left,y:r.top-m.top,w:r.width,h:r.height}};

function layout(){
  const W=map.clientWidth;
  mode=W>=900?'map':'tree';
  map.classList.toggle('is-map',mode==='map');map.classList.toggle('is-tree',mode==='tree');
  svg.replaceChildren();
  if(mode==='tree'){map.style.height='';branches.forEach(b=>{b.btn.style.cssText='';b.ul.style.cssText=''});return}
  const H=480;map.style.height=H+'px';
  const cx=W/2,cy=H/2,rx=Math.min(250,W*.19),ry=140;
  center.style.left=cx+'px';center.style.top=cy+'px';
  branches.forEach((b,i)=>{
    const a=(i*60)*Math.PI/180; // 0° = rechts, met de klok mee; nooit recht boven of onder
    const x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;
    b.btn.style.left=x+'px';b.btn.style.top=y+'px';
    b.side=Math.cos(a)>0?1:-1;b.x=x;b.y=y;
  });
  draw(false);
}

function curve(x1,y1,x2,y2,cls,delay){
  const p=document.createElementNS(NS,'path');
  const mx=(x1+x2)/2;
  p.setAttribute('d',`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
  p.setAttribute('class',cls);svg.append(p);
  if(!reduce&&delay!==false){const L=p.getTotalLength();p.style.strokeDasharray=L;p.style.strokeDashoffset=L;
    p.getBoundingClientRect();p.style.transition=`stroke-dashoffset .5s ease ${delay||0}ms`;p.style.strokeDashoffset=0}
  return p;
}

function draw(animate){
  if(mode!=='map')return;
  svg.replaceChildren();
  const c=pos(center),C={x:c.x+c.w/2,y:c.y+c.h/2};
  branches.forEach((b,i)=>{
    const r=pos(b.btn);const bx=b.side>0?r.x:r.x+r.w,by=r.y+r.h/2;
    curve(C.x+b.side*c.w/2*.9,C.y,bx,by,'mm-trunk'+(i===active?' is-active':''),animate&&i===active?0:false);
  });
  if(active<0)return;
  const b=branches[active],r=pos(b.btn);
  const sx=b.side>0?r.x+r.w:r.x,sy=r.y+r.h/2;
  [...b.ul.children].forEach((li,j)=>{
    const l=pos(li);const tx=b.side>0?l.x:l.x+l.w,ty=l.y+l.h/2;
    curve(sx,sy,tx,ty,'mm-twig',animate?120+j*45:false);
  });
}

function place(){
  if(mode!=='map'||active<0)return;
  const b=branches[active],W=map.clientWidth,H=map.clientHeight;
  const ul=b.ul,gap=56;
  ul.style.left='';ul.style.right='';ul.style.setProperty('--from',b.side>0?'8px':'-8px');
  const r=pos(b.btn);
  // kolom voorbij de buitenste tak aan deze kant, zodat niets overlapt
  const same=branches.filter(o=>o.side===b.side).map(o=>pos(o.btn));
  const outer=b.side>0?Math.max(...same.map(o=>o.x+o.w)):Math.min(...same.map(o=>o.x));
  if(b.side>0)ul.style.left=(outer+gap)+'px';else ul.style.right=(W-outer+gap)+'px';
  const h=ul.offsetHeight;let top=r.y+r.h/2-h/2;top=Math.max(8,Math.min(H-h-8,top));ul.style.top=top+'px';
}

function activate(i){
  if(active>=0){const o=branches[active];o.ul.hidden=true;o.ul.classList.remove('is-open');o.btn.setAttribute('aria-expanded','false');o.btn.classList.remove('is-active')}
  active=i;map.classList.toggle('has-active',i>=0);
  if(i>=0){const b=branches[i];b.ul.hidden=false;b.btn.setAttribute('aria-expanded','true');b.btn.classList.add('is-active');
    place();requestAnimationFrame(()=>b.ul.classList.add('is-open'))}
  draw(true);
}

function setOpen(open){
  panel.hidden=!open;
  triggers.forEach(t=>t.setAttribute('aria-expanded',String(open)));
  document.querySelectorAll('.founder-visual').forEach(v=>v.classList.toggle('is-open',open));
  document.querySelectorAll('.fv-skills em').forEach(e=>e.textContent=open?(EN?'Close −':'Sluit −'):(EN?'View all +':'Bekijk alles +'));
  if(open){layout();activate(active<0?0:active);panel.scrollIntoView({behavior:reduce?'auto':'smooth',block:'nearest'})}
}
triggers.forEach(t=>t.addEventListener('click',()=>setOpen(panel.hidden)));
let rt;addEventListener('resize',()=>{if(panel.hidden)return;clearTimeout(rt);rt=setTimeout(()=>{layout();if(active>=0){place();draw(false)}},120)});
})();
