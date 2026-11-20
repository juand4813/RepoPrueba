const RuedaApp = (() => {
  let me = null;
  let previewRole = null;
  const money = n => '$ ' + Number(n || 0).toLocaleString('es-CO');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  async function api(path, options={}) {
    const response = await fetch(path, {credentials:'same-origin', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud.');
    return data;
  }
  function modal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').style.display = 'grid';
  }
  function showAuth(mode='register', role='seller') {
    const registering = mode === 'register';
    modal(`<h2>${registering?'Crea tu cuenta':'Qué bueno verte'}</h2><p>${registering?'Elige cómo participar en Rueda.':'Ingresa para continuar.'}</p>
      <form id="auth-form">${registering?`<label style="display:block;font-size:12px;font-weight:700;margin:12px 0 5px">Tipo de perfil</label><select name="role" required style="width:100%;padding:12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink);margin-bottom:10px"><option value="seller" ${role==='seller'?'selected':''}>Vendedor</option><option value="owner">Propietario</option><option value="buyer" ${role==='buyer'?'selected':''}>Comprador</option></select><input name="full_name" placeholder="Nombre completo" autocomplete="name" required>`:''}
      <input name="email" type="email" placeholder="Correo electrónico" autocomplete="email" required><input name="password" type="password" placeholder="${registering?'Contraseña (mínimo 10 caracteres)':'Contraseña'}" autocomplete="${registering?'new-password':'current-password'}" ${registering?'minlength="10"':''} required>${registering?'<input name="phone" type="tel" placeholder="Teléfono (opcional)" autocomplete="tel">':''}<p id="auth-error" style="color:#a33;font-size:12px"></p><button class="btn" type="submit">${registering?'Crear cuenta':'Ingresar'}</button><button class="btn outline" type="button" id="auth-switch" style="margin-left:8px">${registering?'Ya tengo cuenta':'Crear cuenta'}</button></form>`);
    document.getElementById('auth-switch').onclick = () => showAuth(registering?'login':'register', role);
    document.getElementById('auth-form').onsubmit = async e => {
      e.preventDefault(); const f = new FormData(e.currentTarget); const data = Object.fromEntries(f.entries());
      try { const result = await api(registering?'/api/register':'/api/login',{method:'POST',body:JSON.stringify(data)}); me=result.user; window.ruedaUser=me; closeModal(); window.dispatchEvent(new CustomEvent('rueda-authenticated',{detail:me})); await loadListings(); }
      catch(error){ document.getElementById('auth-error').textContent=error.message; }
    };
  }
  function closeModal(){ document.getElementById('modal').style.display='none'; }
  function renderListings(rows) {
    const grid=document.getElementById('grid'); if(!grid)return;
    if(!rows.length){grid.innerHTML='<p class="catalog-status" role="status">No encontramos vehículos con esos criterios. Prueba otra búsqueda o vuelve pronto.</p>';grid.setAttribute('aria-busy','false');return;}
    grid.innerHTML=rows.map(v=>{
      const title=[v.make,v.model,v.trim].filter(Boolean).join(' ');
      const isSeller=previewRole==='seller'||me?.roles?.includes('seller');
      const commission=isSeller?(v.commission_type==='percentage'?`${Number(v.commission_value)}% (aprox. ${money(v.commission_estimate)})`:money(v.commission_value)):'';
      const image=v.cover_url?`<img src="${esc(v.cover_url)}" alt="Foto de ${esc(title)}" style="width:100%;height:100%;object-fit:cover">`:'<div aria-hidden="true" style="font-size:52px;opacity:.35">🚘</div>';
      const demoTag=v.id.startsWith('demo-listing-')?'<span style="position:absolute;left:10px;top:10px;background:#fff;border-radius:20px;padding:6px 9px;font-size:10px;font-weight:700;color:#385b27">Vehículo de prueba</span>':'';
      let action=`<button class="btn listing-details" data-id="${esc(v.id)}">Ver publicación</button>`;
      if(me?.roles?.some(role=>['seller','buyer'].includes(role))) action+=`<button class="btn outline listing-favorite" aria-pressed="${v.is_favorite?'true':'false'}" data-saved="${v.is_favorite?'1':'0'}" data-id="${esc(v.id)}">${v.is_favorite?'♥ Guardado':'♡ Guardar'}</button>`;
      if(me?.roles?.includes('seller')) action+=`<button class="btn outline listing-interest" data-id="${esc(v.id)}" style="margin-left:6px">${v.seller_interested?'Interés registrado':'Me interesa'}</button>`;
      return `<article class="car-card"><div class="car-photo" style="position:relative;background:linear-gradient(145deg,#e6e9de,#d8e3d4);background-size:cover;background-position:center;display:grid;place-items:center">${image}${demoTag}${isSeller?`<span class="commission">Comisión ${esc(commission)}</span>`:''}<span class="city-chip">${esc(v.city)}</span></div><div class="card-body"><div class="card-title"><h3>${esc(title)}</h3><span class="year">${esc(v.model_year)}</span></div><div class="specs"><span>${Number(v.mileage_km).toLocaleString('es-CO')} km</span><span>${esc(v.transmission||'')}</span><span>${esc(v.fuel||'')}</span></div><div class="price-row"><div><span class="price-label">${v.is_demo?'Precio de referencia':'Precio del vehículo'}</span><b class="price">${money(v.asking_price)}</b></div><div class="owner"><span class="verified">${v.is_demo?'◎':'●'}</span><span>${v.is_demo?'Dato público<br><b>de referencia':'Publicado por<br><b>su propietario'}</b></span></div></div><div class="card-actions" style="padding:0 16px 16px">${action}</div></div></article>`;
    }).join('');
    grid.setAttribute('aria-busy','false');
    window.dispatchEvent(new CustomEvent('rueda-listings-rendered',{detail:{count:rows.length}}));
    grid.querySelectorAll('.car-photo img').forEach(img=>img.addEventListener('error',()=>{const fallback=document.createElement('img');fallback.className='image-fallback';fallback.src='car-placeholder.svg';fallback.alt='Foto de vehículo de referencia';fallback.style.cssText='width:100%;height:100%;object-fit:cover';img.replaceWith(fallback);},{once:true}));
    grid.querySelectorAll('.listing-details').forEach(b=>b.onclick=()=>openListing(b.dataset.id));
    grid.querySelectorAll('.listing-favorite').forEach(b=>b.onclick=async()=>{try{const saved=b.dataset.saved==='1';await api(`/api/listings/${b.dataset.id}/favorite`,{method:saved?'DELETE':'POST',body:'{}'});b.dataset.saved=saved?'0':'1';b.setAttribute('aria-pressed',saved?'false':'true');b.textContent=saved?'♡ Guardar':'♥ Guardado';}catch(e){if(e.message.includes('Inicia sesión'))showAuth('login');else alert(e.message);}});
    grid.querySelectorAll('.listing-interest').forEach(b=>b.onclick=async()=>{
      try { await api(`/api/listings/${b.dataset.id}/interest`,{method:'POST',body:'{}'}); await loadListings(); }
      catch(e){ if(e.message.includes('Inicia sesión'))showAuth('login');else alert(e.message); }
    });
    grid.querySelectorAll('.listing-contact').forEach(b=>b.onclick=()=>contactSeller(b.dataset.id,rows.find(v=>v.id===b.dataset.id)));
    grid.querySelectorAll('.listing-buyer').forEach(b=>b.onclick=()=>contactBuyer(b.dataset.id));
  }
  async function openListing(id){
    try{
      const {listing:v}=await api(`/api/listings/${encodeURIComponent(id)}${previewRole==='seller'?'?preview_role=seller':''}`);
      const title=[v.make,v.model,v.trim].filter(Boolean).join(' ');
      const photos=v.photos||[v.cover_url].filter(Boolean);
      const image=photos.length?`<img id="detail-main-photo" src="${esc(photos[0])}" alt="Foto de ${esc(title)}" style="width:100%;max-height:340px;object-fit:cover;border-radius:14px">${photos.length>1?`<div class="detail-gallery">${photos.map((src,index)=>`<button type="button" class="gallery-thumb" data-photo="${esc(src)}" aria-label="Ver foto ${index+1}"><img src="${esc(src)}" alt=""></button>`).join('')}</div>`:''}`:'';
      const isSeller=previewRole==='seller'||me?.roles?.includes('seller');
      const commission=isSeller?(v.commission_type==='percentage'?`${Number(v.commission_value)}% (aprox. ${money(v.commission_estimate)})`:money(v.commission_value)):'';
      const ownListing=Boolean(me&&v.owner?.id===me.id);
      const ownerBlock=me&&!ownListing?`<section class="owner-contact"><h3>Contacto del propietario</h3><p>${esc(v.owner?.full_name||'Propietario')}</p>${v.owner?.phone?`<p>Teléfono: <a href="tel:${esc(v.owner.phone)}">${esc(v.owner.phone)}</a></p>`:''}${v.owner?.email?`<p>Correo: <a href="mailto:${esc(v.owner.email)}">${esc(v.owner.email)}</a></p>`:''}<button class="btn owner-chat" data-owner="${esc(v.owner.id)}" data-listing="${esc(v.id)}">Chatear con el propietario</button></section>`:'';
      const guestPrompt=!me&&!previewRole?'<section style="padding:14px;background:var(--soft);border-radius:12px;margin-top:14px"><b>¿Quieres contactar al propietario?</b><p>Inicia sesión o crea una cuenta para ver sus datos de contacto y chatear.</p><button class="btn detail-login">Iniciar sesión</button> <button class="btn outline detail-register">Crear cuenta</button></section>':'';
      const previewContact=previewRole&&!me?'<section style="padding:14px;background:var(--soft);border-radius:12px;margin-top:14px"><b>Vista simulada de perfil</b><p>Los datos reales de contacto requieren iniciar sesión.</p></section>':'';
      const sellerLink=me?.roles?.includes('buyer')&&v.sellers?.length?'<button class="btn outline detail-seller-chat" style="margin:12px 0 0">Contactar a un vendedor interesado</button>':'';
      const reportButton=me?`<button class="btn outline detail-report" data-id="${esc(v.id)}">Reportar publicación</button>`:'';
      const detailSpecs=[v.body_type&&`Carrocería: ${v.body_type}`,v.color&&`Color: ${v.color}`,v.owner_count&&`${v.owner_count} propietario(s)`,v.condition&&`Estado: ${v.condition}`].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');
      modal(`<div class="listing-detail"><h2>${esc(title)} · ${esc(v.model_year)}</h2>${image}<div class="detail-facts"><span>${esc(v.city)}</span><span>${Number(v.mileage_km||0).toLocaleString('es-CO')} km</span><span>${esc(v.transmission||'')}</span><span>${esc(v.fuel||'')}</span>${detailSpecs}</div><p><span class="price-label">${v.is_demo?'Precio de referencia':'Precio del vehículo'}</span><br><b class="price">${money(v.asking_price)}</b></p>${isSeller?`<p><b>Comisión para el vendedor:</b> ${esc(commission)}</p>`:''}<p>${esc(v.description||'Consulta más detalles de este vehículo al propietario.')}</p>${v.maintenance_history?`<section class="owner-contact"><h3>Historial de mantenimiento</h3><p>${esc(v.maintenance_history)}</p></section>`:''}${ownerBlock}${guestPrompt}${previewContact}${sellerLink}${reportButton}</div>`);
      document.querySelectorAll('.gallery-thumb').forEach(button=>button.onclick=()=>{const main=document.getElementById('detail-main-photo');if(main)main.src=button.dataset.photo;});
      document.querySelectorAll('.listing-detail img').forEach(img=>img.addEventListener('error',()=>{if(img.closest('.gallery-thumb'))img.closest('.gallery-thumb').remove();else{const fallback=document.createElement('img');fallback.className='image-fallback detail-image-fallback';fallback.src='car-placeholder.svg';fallback.alt='Foto de vehículo de referencia';fallback.style.cssText='width:100%;max-height:340px;object-fit:contain;border-radius:14px';img.replaceWith(fallback);}},{once:true}));
      document.querySelector('.detail-report')?.addEventListener('click',async()=>{const reason=prompt('¿Qué debemos revisar?\n1. Información engañosa\n2. Precio sospechoso\n3. Posible fraude\n4. Publicación duplicada\n5. Otro');const options=['Información engañosa','Precio sospechoso','Posible fraude','Publicación duplicada','Otro'];const selected=options[Number(reason)-1];if(!selected)return;try{await api('/api/reports',{method:'POST',body:JSON.stringify({listing_id:v.id,reason:selected})});alert('Gracias. El reporte quedó registrado para revisión.');}catch(error){alert(error.message);}});
      document.querySelector('.detail-login')?.addEventListener('click',()=>showAuth('login','buyer'));
      document.querySelector('.detail-register')?.addEventListener('click',()=>showAuth('register','buyer'));
      document.querySelector('.owner-chat')?.addEventListener('click',()=>chatWithOwner(v.id,v.owner.id));
      document.querySelector('.detail-seller-chat')?.addEventListener('click',()=>contactSeller(v.id,v));
    }catch(error){alert(error.message);}
  }
  async function chatWithOwner(listingId,ownerId){
    if(!me){showAuth('login','buyer');return;}
    if(me.id===ownerId){alert('Esta es tu publicación.');return;}
    try{
      const result=await api(`/api/listings/${encodeURIComponent(listingId)}/conversations`,{method:'POST',body:JSON.stringify({seller_id:ownerId,buyer_id:me.id})});
      modal('<h2>Chat con el propietario</h2><div id="chat-window"></div>');
      await openChat(result.conversation_id);
    }catch(error){alert(error.message);}
  }
  async function loadListings(){
    try { const q=document.getElementById('car-search')?.value.trim()||''; const selects=document.querySelectorAll('.searchbar .search-item select'); const city=selects[0]?.value||'';const commissionText=selects[1]?.value||'';const min=(commissionText.includes('3.000.000')?3000000:commissionText.includes('1.000.000')?1000000:0);const filters=new URLSearchParams({q,city:city==='Toda Colombia'?'':city,min_commission:String(min),preview_role:previewRole==='seller'?'seller':''});document.querySelectorAll('[data-filter]').forEach(input=>{if(input.value)filters.set(input.dataset.filter,input.value)});const sort=document.querySelector('[data-sort]')?.value;if(sort)filters.set('sort',sort); const data=await api(`/api/listings?${filters}`); renderListings(data.listings); }
    catch(e){console.error(e);const grid=document.getElementById('grid');if(grid){grid.innerHTML='<p class="catalog-status" role="status">No pudimos cargar los vehículos. Revisa tu conexión e inténtalo de nuevo.</p>';grid.setAttribute('aria-busy','false');}}
  }
  async function contactSeller(listingId, listing){
    if(!listing?.sellers?.length){alert('Todavía no hay vendedores interesados en este auto.');return;}
    const choices=listing.sellers.map(s=>`<option value="${esc(s.id)}">${esc(s.full_name)}</option>`).join('');
    modal(`<h2>Escribe al vendedor</h2><p>Elige un vendedor interesado en este auto. Tus datos de contacto no se muestran.</p><form id="contact-form"><select name="seller_id" required style="width:100%;padding:12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink)">${choices}</select><textarea name="message" required maxlength="10000" placeholder="Cuéntale qué te interesa del vehículo" style="width:100%;min-height:110px;padding:12px;margin-top:10px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink)"></textarea><p id="contact-error" style="color:#a33;font-size:12px"></p><button class="btn">Enviar mensaje</button></form>`);
    document.getElementById('contact-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api(`/api/listings/${listingId}/conversations`,{method:'POST',body:JSON.stringify({seller_id:f.get('seller_id'),buyer_id:me.id,message:f.get('message')})});await showChats();}catch(err){document.getElementById('contact-error').textContent=err.message;}};
  }
  async function contactBuyer(listingId){
    try {
      const data=await api('/api/users/buyers');
      if(!data.buyers.length){alert('Aún no hay perfiles de comprador. Invita a tu posible comprador a crear una cuenta para conversar aquí.');return;}
      modal(`<h2>Contacta a tu comprador</h2><p>Selecciona el perfil del comprador que ya encontraste. La conversación será privada dentro de Rueda.</p><form id="seller-contact-form"><select name="buyer_id" required style="width:100%;padding:12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink)">${data.buyers.map(b=>`<option value="${esc(b.id)}">${esc(b.full_name)}</option>`).join('')}</select><textarea name="message" required maxlength="10000" placeholder="Cuéntale al comprador sobre este vehículo" style="width:100%;min-height:100px;padding:12px;margin-top:10px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink)"></textarea><p id="seller-contact-error" style="color:#a33;font-size:12px"></p><button class="btn">Iniciar conversación</button></form>`);
      document.getElementById('seller-contact-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api(`/api/listings/${listingId}/conversations`,{method:'POST',body:JSON.stringify({seller_id:me.id,buyer_id:f.get('buyer_id'),message:f.get('message')})});await showChats();}catch(err){document.getElementById('seller-contact-error').textContent=err.message;}};
    } catch(e){if(e.message.includes('Inicia sesión'))showAuth('login');else alert(e.message);}
  }
  async function showChats(){
    try { const data=await api('/api/conversations'); const rows=data.conversations;
      if(!rows.length){modal('<h2>Mis conversaciones</h2><p>Aún no tienes conversaciones. Contacta a un vendedor desde un vehículo disponible.</p>');return;}
      modal(`<h2>Mis conversaciones</h2><div id="chat-list">${rows.map(c=>`<button class="btn outline chat-open" data-id="${esc(c.id)}" style="display:block;width:100%;text-align:left;margin:8px 0">${esc(c.make)} ${esc(c.model)} ${esc(c.model_year)} · ${esc(c.peer_name)} · ${esc(c.last_message||'Abrir conversación')}</button>`).join('')}</div><div id="chat-window"></div>`);
      document.querySelectorAll('.chat-open').forEach(b=>b.onclick=()=>openChat(b.dataset.id));
    } catch(e){ if(e.message.includes('Inicia sesión'))showAuth('login');else alert(e.message); }
  }
  async function openChat(id){
    const data=await api(`/api/conversations/${id}/messages`); const box=document.getElementById('chat-window');
    box.innerHTML=`<div style="max-height:260px;overflow:auto;padding:10px;background:var(--soft);border-radius:10px">${data.messages.map(m=>`<p><b>${m.sender_id===me.id?'Tú':'Participante'}:</b> ${esc(m.body)}<br><small>${new Date(m.sent_at+'Z').toLocaleString('es-CO')}</small></p>`).join('')}</div><form id="send-message"><textarea name="body" required maxlength="10000" placeholder="Escribe un mensaje" style="width:100%;min-height:70px;padding:10px;margin:10px 0;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink)"></textarea><button class="btn">Enviar</button></form>`;
    document.getElementById('send-message').onsubmit=async e=>{e.preventDefault();const body=new FormData(e.currentTarget).get('body');await api(`/api/conversations/${id}/messages`,{method:'POST',body:JSON.stringify({body})});await openChat(id);};
  }
  async function init(){
    const session=await api('/api/me').catch(()=>({user:null}));me=session.user;window.ruedaUser=me;
    window.dispatchEvent(new CustomEvent('rueda-session-ready',{detail:me}));
    const devPreview=await api('/api/dev-preview').catch(()=>({enabled:false}));
    if(devPreview.enabled){
      const control=document.getElementById('dev-preview');
      const select=document.getElementById('dev-preview-role');
      control.hidden=false;
      previewRole=localStorage.getItem('rueda-dev-preview-role')||'';
      select.value=previewRole;
      select.onchange=()=>{previewRole=select.value;localStorage.setItem('rueda-dev-preview-role',previewRole);loadListings();};
    }
    if(document.getElementById('grid')){
      await loadListings();
      const searchSelects=document.querySelectorAll('.searchbar .search-item select');
      searchSelects.forEach(x=>x.addEventListener('change',loadListings));
      if(!me?.roles?.includes('seller')) searchSelects[1]?.closest('.search-item')?.setAttribute('hidden','');
      document.getElementById('car-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadListings();}});
      const searchButton=document.querySelector('.searchbar .btn');if(searchButton)searchButton.onclick=loadListings;
      const oldOpen=window.openModal; window.openModal=(type)=>{
        if(type==='publish'){location.href='publicar-vehiculo.html';return;}
        if(type==='login'){showAuth('login');return;}
        if(type==='join'){showAuth('register','seller');return;}
        if(type==='chats'){showChats();return;}
        oldOpen?.(type);
      };
      const navActions=document.querySelector('.nav-actions'); if(navActions&&me){const button=document.createElement('button');button.className='btn outline';button.textContent='Mis chats';button.onclick=showChats;navActions.appendChild(button);}
    }
  }
  return {init,api,showAuth,loadListings,openListing,closeModal};
})();
window.RuedaApp=RuedaApp;
document.addEventListener('DOMContentLoaded',RuedaApp.init);

