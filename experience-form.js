(() => {
  const form=document.getElementById('listing-form');
  if(!form)return;
  const draftKey='rueda-listing-draft';
  const skip=element=>element.type==='file'||element.type==='password'||element.id==='plate'||element.closest('#account-section')||element.id==='owner-confirm'||element.id==='commission-confirm';
  const status=document.createElement('p');
  status.className='draft-status';
  status.setAttribute('role','status');
  status.textContent='Los datos del vehículo se guardan como borrador en este navegador.';
  document.querySelector('.steps')?.after(status);
  let saveTimer;
  const save=()=>{
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>{
      const fields={};
      form.querySelectorAll('input,select,textarea').forEach(element=>{if(!skip(element)&&(element.type!=='radio'||element.checked))fields[element.id||element.name]=element.type==='checkbox'?element.checked:element.value;});
      localStorage.setItem(draftKey,JSON.stringify(fields));
      status.textContent='Borrador guardado en este navegador.';
    },350);
  };
  const raw=localStorage.getItem(draftKey);
  if(raw){
    try{
      const fields=JSON.parse(raw);
      Object.entries(fields).forEach(([id,value])=>{
        const named=form.querySelectorAll(`[name="${CSS.escape(id)}"]`);
        if(named.length&&named[0].type==='radio'){named.forEach(element=>element.checked=element.value===value);return;}
        const element=document.getElementById(id)||named[0];
        if(!element||skip(element))return;
        if(element.type==='checkbox')element.checked=Boolean(value);else if(element.type==='radio'){if(element.value===value)element.checked=true;}else{element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));}
      });
      status.innerHTML='Recuperamos un borrador de este navegador. Las fotos se deben volver a seleccionar. <button type="button" class="draft-clear">Borrar borrador</button>';
    }catch{localStorage.removeItem(draftKey);}
  }
  form.addEventListener('input',save);
  form.addEventListener('change',save);
  status.addEventListener('click',event=>{if(!event.target.closest('.draft-clear'))return;localStorage.removeItem(draftKey);status.textContent='Borrador eliminado.';});
  const cards=[...document.querySelectorAll('#listing-form .form-card')];
  const steps=[...document.querySelectorAll('.steps .step')];
  const stepCard=[cards[0],cards[1],cards[3]];
  steps.forEach((step,index)=>step.addEventListener('click',()=>stepCard[index]?.scrollIntoView({behavior:'smooth',block:'start'})));
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      const current=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!current)return;
      const index=current.target===cards[0]?0:current.target===cards[1]||current.target===cards[2]?1:2;
      steps.forEach((step,i)=>step.classList.toggle('active',i===index));
    },{rootMargin:'-20% 0px -60% 0px',threshold:[0,.25,.5]});
    cards.forEach(card=>observer.observe(card));
  }
})();

