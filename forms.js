'use strict';
// Formulieren die direct bij YAH-Advies binnenkomen (via FormSubmit naar info@yah-advies.nl).
// Als verzenden mislukt, valt het formulier terug op een mail
// vanuit het eigen e-mailprogramma van de bezoeker, zodat er nooit een aanvraag verloren gaat.
(()=>{
const TO='info@yah-advies.nl'; // zichtbaar adres voor de terugval-mail
// Ontvanger formulieren: Gmail van Steven (activatie FormSubmit 8 okt 2026), kopie naar info@.
// Adres wordt pas in de browser samengesteld om adresverzamelaars te ontmoedigen.
const RCPT=['steven','westhout'].join('.')+String.fromCharCode(64)+['gmail','com'].join('.');
const ENDPOINT='https://formsubmit.co/ajax/'+RCPT;
const today=new Date().toISOString().slice(0,10);
document.querySelectorAll('input[type=date]').forEach(i=>i.min=today);

function bodyText(form,extra){
  const fd=new FormData(form),lines=[];
  for(const[k,v] of fd){if(['botcheck','toestemming'].includes(k)||!String(v).trim())continue;lines.push(k.replace(/_/g,' ')+': '+v)}
  if(extra)lines.push('',extra);
  return lines.join('\n');
}
function mailFallback(form,subject,extra){
  const body=bodyText(form,extra).slice(0,1800);
  location.href='mailto:'+TO+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
}

document.querySelectorAll('form[data-send]').forEach(form=>{
  const status=form.querySelector('.form-status');
  const btn=form.querySelector('button[type=submit]');
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!form.reportValidity())return;
    if(form.botcheck&&form.botcheck.checked)return; // spam
    const subject=form.dataset.subject||'Aanvraag via yah-advies.nl';
    const extraEl=form.dataset.extra?document.querySelector(form.dataset.extra):null;
    const extra=extraEl?extraEl.value:'';
    btn.disabled=true;status.textContent='Bezig met versturen…';status.className='form-status';
    const fd=new FormData(form);
    fd.delete('botcheck');fd.append('_subject',subject);fd.append('_template','table');fd.append('_captcha','false');fd.append('_cc',TO);
    if(form.email&&form.email.value)fd.append('_replyto',form.email.value);
    if(extra)fd.append('gespreksvoorbereiding',extra);
    try{
      const r=await fetch(ENDPOINT,{method:'POST',headers:{Accept:'application/json'},body:fd});
      const j=await r.json().catch(()=>({}));
      if(!r.ok||String(j.success)==='false')throw new Error(j.message||r.status);
      form.reset();
      status.className='form-status is-ok';
      status.textContent='Dank u. Uw bericht is verstuurd. YAH-Advies neemt zo snel mogelijk contact met u op.';
    }catch(err){
      status.className='form-status is-err';
      status.innerHTML='Verzenden lukte niet. <a href="#">Mail uw bericht dan via uw eigen e-mailprogramma</a> of bel 06 20 69 53 44.';
      status.querySelector('a').addEventListener('click',ev=>{ev.preventDefault();mailFallback(form,subject,extra)});
    }finally{btn.disabled=false}
  });
});
})();
