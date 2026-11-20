(() => {
  const form=document.getElementById('listing-form');
  let signupOpen=false;
  let loginOpen=false;
  const value=id=>document.getElementById(id)?.value?.trim()||'';
  const api=async(path,options={})=>{const response=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'No se pudo completar la solicitud.');return data;};
  const readFile=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{const scale=Math.min(1,1600/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.84));};image.onerror=reject;image.src=reader.result;};reader.onerror=reject;reader.readAsDataURL(file);});
  function showOwnerLogin(){
    const panel=document.getElementById('login-panel');panel.hidden=false;
    if(loginOpen)return;loginOpen=true;
    const oldButton=document.getElementById('login-owner');oldButton?.remove();
    const login=document.createElement('form');login.id='owner-login-form';login.innerHTML='<div class="field-grid" style="margin-top:12px"><div class="field"><label for="owner-login-email">Correo</label><input id="owner-login-email" type="email" autocomplete="email" required></div><div class="field"><label for="owner-login-password">Contraseña</label><input id="owner-login-password" type="password" autocomplete="current-password" required></div></div><p id="owner-login-error" style="color:#a33;font-size:12px"></p><button class="btn" type="submit">Ingresar y continuar</button>';
    panel.appendChild(login);
    login.onsubmit=async e=>{e.preventDefault();try{const user=(await api('/api/login',{method:'POST',body:JSON.stringify({email:document.getElementById('owner-login-email').value,password:document.getElementById('owner-login-password').value})})).user;if(!user.roles.includes('owner'))throw new Error('Esta cuenta no tiene perfil de propietario.');form.requestSubmit();}catch(error){document.getElementById('owner-login-error').textContent=error.message;}};
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    event.stopImmediatePropagation();
    if(!form.reportValidity())return;
    const mode=document.querySelector('input[name="account-status"]:checked')?.value;
    let owner={};
    if(mode==='existing'){
      try{
        const result=await api('/api/me');
        if(!result.user?.roles?.includes('owner')){showOwnerLogin();return;}
      }catch{showOwnerLogin();return;}
    }else{
      const panel=document.getElementById('account-create-panel');
      if(!signupOpen){
        panel.hidden=false; signupOpen=true;
        ['account-name','account-phone','account-email','account-password'].forEach(id=>document.getElementById(id).required=id!=='account-phone');
        document.getElementById('submit-listing').textContent='Crear cuenta y publicar →';
        panel.scrollIntoView({behavior:'smooth',block:'center'});return;
      }
      owner={full_name:value('account-name'),phone:value('account-phone'),email:value('account-email'),password:value('account-password')};
    }
    const make=value('make')==='Otra'?value('make-other'):value('make');
    const model=value('make')==='Otra'||value('model')==='__other__'?value('model-other'):value('model');
    const condition=document.querySelector('input[name="condition"]:checked')?.parentElement?.textContent?.trim()||'';
    const photos=await Promise.all([...document.getElementById('photos').files].map(readFile));
    owner.share_contact=Boolean(document.getElementById('share-contact')?.checked);const payload={owner,vehicle:{make,model,trim:value('trim'),model_year:Number(value('year')),body_type:value('body'),color:value('color'),owner_count:Number(value('owners'))||null,maintenance_history:value('maintenance-history'),mileage_km:Number(value('km')),transmission:value('gear'),fuel:value('fuel'),condition,description:value('details'),city:value('city'),asking_price:Number(value('price'))},listing:{commission_value:Number(value('commission')),commission_type:'fixed'},photos};
    const button=document.getElementById('submit-listing');button.disabled=true;button.textContent='Guardando publicación…';
    try{
      await api('/api/listings',{method:'POST',body:JSON.stringify(payload)});if(mode==='existing')await api('/api/me/contact-preference',{method:'POST',body:JSON.stringify({share_contact:owner.share_contact})});localStorage.removeItem('rueda-listing-draft');
      const toast=document.getElementById('toast');toast.textContent='Tu publicación se guardó y ya aparece en el catálogo.';toast.style.display='block';
      form.reset();window.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>location.href='index.html',1500);
    }catch(error){
      const toast=document.getElementById('toast');toast.textContent=error.message;toast.style.display='block';toast.scrollIntoView({behavior:'smooth',block:'center'});
      button.disabled=false;button.textContent='Crear cuenta y publicar →';
    }
  },true);
})();

