'use strict';
// Kleine interactielaag bovenop app.js: menu over het hele scherm, rustige verschijning, werkwijzeroute.
(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const root=document.documentElement;
const nav=document.getElementById('nav');
const toggle=document.querySelector('.menu-toggle');

// Menu (mobiel): scroll blokkeren, rest van de pagina inert, focus in het menu, sluiten met Escape.
if(nav&&toggle){
  const header=document.querySelector('header');
  const label=toggle.querySelector('.menu-label');
  const outside=[document.getElementById('main'),document.querySelector('footer'),document.querySelector('.prototype')].filter(Boolean);
  new MutationObserver(()=>{
    const open=nav.classList.contains('open');
    root.classList.toggle('menu-open',open);
    root.style.setProperty('--menu-top',header.getBoundingClientRect().bottom+'px');
    outside.forEach(el=>el.inert=open);
    if(label)label.textContent=open?'Sluiten':'Menu';
    if(open){const first=nav.querySelector('a');first&&first.focus()}
  }).observe(nav,{attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');toggle.focus()}});
}

// Cv afdrukken; uitgeklapte functies meenemen in de print.
addEventListener('beforeprint',()=>document.querySelectorAll('.cv-older').forEach(d=>d.open=true));
document.querySelectorAll('.cv-print').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.cv-older').forEach(d=>d.open=true);print()}));

// COPAFIJTH: aspect in de lijst licht het bijbehorende knooppunt in het wiel op; zonder interactie loopt een rustige rondgang.
const cop=document.querySelector('.copafijth');
if(cop){
  const lis=[...cop.querySelectorAll('.cop-list li')];let auto=0,timer=null,user=false;
  const hot=k=>{cop.querySelectorAll('.is-hot').forEach(e=>e.classList.remove('is-hot'));if(k)cop.querySelectorAll(`[data-k="${k}"]`).forEach(e=>e.classList.add('is-hot'))};
  lis.forEach(li=>{['mouseenter','focus'].forEach(ev=>li.addEventListener(ev,()=>{user=true;clearInterval(timer);hot(li.dataset.k)}));li.addEventListener('mouseleave',()=>hot(null))});
  if(!reduce&&'IntersectionObserver' in window){
    new IntersectionObserver(([e])=>{clearInterval(timer);if(e.isIntersecting&&!user){timer=setInterval(()=>{hot(lis[auto%lis.length].dataset.k);auto++;if(auto>=lis.length){clearInterval(timer);hot(null)}},1400)}},{threshold:.4}).observe(cop);
  }
}

if(reduce||!('IntersectionObserver' in window))return;
root.classList.add('js-motion');

// Verschijnen bij scrollen: alleen blokken onder de vouw, eenmalig.
const targets=document.querySelectorAll('.section-heading,.services article,.cases article,.engagements article,.why-grid article,.control-grid article,.process li,.talent-grid>*,.founder>*,.ai-section>*,.insights details,.network-intro,.expertise-map,.explore-list li,.balance-figure');
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
targets.forEach(el=>{
  const siblings=[...el.parentElement.children].filter(c=>c.matches(el.tagName));
  const i=Math.max(0,siblings.indexOf(el));
  if(el.getBoundingClientRect().top<innerHeight)return; // bovenin: direct zichtbaar
  el.dataset.reveal='';el.style.transitionDelay=Math.min(i,5)*50+'ms';io.observe(el);
});

// Werkwijze: de route loopt mee met het scrollen.
const route=document.querySelector('.process ol');
if(route){
  const steps=[...route.children];
  let ticking=false;
  const update=()=>{ticking=false;const r=route.getBoundingClientRect();const mark=innerHeight*.6;
    const p=Math.min(1,Math.max(0,(mark-r.top)/r.height));route.style.setProperty('--progress',p.toFixed(3));
    steps.forEach(li=>li.classList.toggle('is-past',li.getBoundingClientRect().top+31<mark));};
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}},{passive:true});
  update();
}
})();
