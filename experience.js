(() => {
  const $ = (selector, root=document) => root.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const api = (path, options) => window.RuedaApp.api(path, options);
  const modal = (title, content) => {
    $('#modal-content').innerHTML = `<h2>${esc(title)}</h2><div class="workspace-panel">${content}</div>`;
    $('#modal').style.display = 'grid';
  };
  const money = value => '$ ' + Number(value || 0).toLocaleString('es-CO');
  const filters = () => {
    const values = {q:$('#car-search')?.value.trim() || '',city:$('.searchbar .search-item select')?.value || ''};
    const selects=[...document.querySelectorAll('.searchbar .search-item select')];
    const commission=selects[1]?.value||'';
    values.min_commission=commission.includes('3.000.000')?'3000000':commission.includes('1.000.000')?'1000000':'';
    document.querySelectorAll('[data-filter]').forEach(field => { if(field.value) values[field.dataset.filter] = field.value; });
    if(values.city === 'Toda Colombia') values.city = '';
    return values;
  };
  const requireLogin = role => { window.RuedaApp.showAuth('login', role); };
  const savedSearchCards = (searches, matches) => {
    const cards = searches.map(search => {
      const c=search.criteria, summary=[c.q,c.city,c.body_type,c.min_price&&`desde ${money(c.min_price)}`,c.max_price&&`hasta ${money(c.max_price)}`,c.min_year&&`desde ${c.min_year}`,c.max_year&&`hasta ${c.max_year}`,c.max_km&&`hasta ${Number(c.max_km).toLocaleString('es-CO')} km`,c.min_commission&&`comisión desde ${money(c.min_commission)}`].filter(Boolean).join(' · ') || 'Todos los vehículos';
      const count=matches.filter(item=>item.saved_search_id===search.id).length;
      return `<article class="workspace-card"><div class="workspace-row"><div><h3>${esc(summary)}</h3><p>${count?`${count} vehículo(s) nuevo(s) coinciden`:'Te avisaremos cuando haya nuevas coincidencias'}</p></div><button class="btn outline" data-delete-search="${esc(search.id)}">Eliminar</button></div></article>`;
    }).join('');
    const notices=matches.slice(0,5).map(item=>`<article class="workspace-card"><h3>${esc(item.make)} ${esc(item.model)} ${esc(item.model_year)}</h3><p>${esc(item.city)} · ${money(item.asking_price)}</p></article>`).join('');
    return `${matches.length?`<div class="workspace-card"><h3>Novedades para ti</h3><p>Vehículos publicados desde que guardaste tus búsquedas.</p>${notices}</div>`:''}${cards||'<p class="workspace-empty">Todavía no guardas búsquedas.</p>'}`;
  };
  async function openWorkspace() {
    const user=window.ruedaUser;
    if(!user){requireLogin('buyer');return;}
    const roles=user.roles||[];
    let content='';
    if(roles.includes('owner')){
      const data=await api('/api/my-listings');
      content+=`<article class="workspace-card"><h3>Tus publicaciones</h3><p>Cambia su disponibilidad cuando recibas una oferta o termines la venta.</p><label><input type="checkbox" id="share-contact-pref" ${data.share_contact?'checked':''}> Mostrar mi teléfono y correo a quienes inicien sesión</label></article>`;
      content+=data.listings.map(listing=>`<article class="workspace-card"><div class="workspace-row"><div><h3>${esc(listing.make)} ${esc(listing.model)} · ${esc(listing.model_year)}</h3><p>${esc(listing.city)} · ${money(listing.asking_price)} · Estado: ${esc(listing.status)}</p></div><select data-listing-status="${esc(listing.id)}"><option value="available" ${listing.status==='available'?'selected':''}>Disponible</option><option value="paused" ${listing.status==='paused'?'selected':''}>Pausada</option><option value="sold" ${listing.status==='sold'?'selected':''}>Vendida</option></select><input type="number" min="1" data-listing-price="${esc(listing.id)}" value="${esc(listing.asking_price)}" aria-label="Nuevo precio"><button class="btn outline" data-save-price="${esc(listing.id)}">Actualizar precio</button></div></article>`).join('')||'<p class="workspace-empty">Aún no tienes publicaciones. Publica tu primer vehículo para verlo aquí.</p>';
    }
    if(roles.includes('seller')){
      const [favs,ops,buyers,listings]=await Promise.all([api('/api/favorites'),api('/api/opportunities'),api('/api/users/buyers'),api('/api/listings')]);
      content+=`<article class="workspace-card"><div class="workspace-row"><div><h3>Seguimiento de compradores</h3><p>Organiza cada oportunidad y agrega notas para el siguiente paso.</p></div><button class="btn" id="new-opportunity">Agregar seguimiento</button></div><div id="new-opportunity-form" hidden><form id="opportunity-create"><label>Vehículo<select name="listing_id" required>${listings.listings.map(v=>`<option value="${esc(v.id)}">${esc(v.make)} ${esc(v.model)} ${esc(v.model_year)}</option>`).join('')}</select></label><label>Comprador<select name="buyer_id" required>${buyers.buyers.map(b=>`<option value="${esc(b.id)}">${esc(b.full_name)}</option>`).join('')}</select></label><button class="btn" type="submit">Crear seguimiento</button></form></div></article>`;
      content+=ops.opportunities.map(op=>`<article class="workspace-card"><div class="workspace-row"><div><h3>${esc(op.make)} ${esc(op.model)} · ${esc(op.buyer_name)}</h3><p>${money(op.asking_price)} · actualizado ${esc(op.updated_at)}</p></div><select data-op-status="${esc(op.id)}"><option value="nuevo" ${op.status==='nuevo'?'selected':''}>Nuevo</option><option value="contactado" ${op.status==='contactado'?'selected':''}>Contactado</option><option value="visita" ${op.status==='visita'?'selected':''}>Visita agendada</option><option value="negociacion" ${op.status==='negociacion'?'selected':''}>En negociación</option><option value="cerrado" ${op.status==='cerrado'?'selected':''}>Cerrado</option><option value="descartado" ${op.status==='descartado'?'selected':''}>Descartado</option></select><input data-op-notes="${esc(op.id)}" value="${esc(op.notes)}" placeholder="Próximo paso o nota"><button class="btn outline" data-save-op="${esc(op.id)}">Guardar</button></div></article>`).join('')||'<p class="workspace-empty">Aún no tienes seguimientos. Vincula un comprador con un vehículo para empezar.</p>';
      content+=`<article class="workspace-card"><h3>Vehículos guardados</h3>${favs.favorites.map(v=>`<p>${esc(v.make)} ${esc(v.model)} ${esc(v.model_year)} · ${money(v.asking_price)} ${v.previous_price>v.latest_price?`<b>El precio bajó desde ${money(v.previous_price)}</b>`:''} <button class="btn outline" data-open-listing="${esc(v.id)}">Ver</button> <button class="btn outline" data-remove-favorite="${esc(v.id)}">Quitar</button></p>`).join('')||'<p>No has guardado vehículos todavía.</p>'}</article>`;
    }
    if(roles.includes('buyer')){
      const favs=await api('/api/favorites');
      content+=`<article class="workspace-card"><h3>Tus favoritos</h3>${favs.favorites.map(v=>`<p>${esc(v.make)} ${esc(v.model)} ${esc(v.model_year)} · ${esc(v.city)} · ${money(v.asking_price)} ${v.previous_price>v.latest_price?`<b>El precio bajó desde ${money(v.previous_price)}</b>`:''} <button class="btn outline" data-open-listing="${esc(v.id)}">Ver</button> <button class="btn outline" data-remove-favorite="${esc(v.id)}">Quitar</button></p>`).join('')||'<p>Aún no has guardado vehículos.</p>'}</article>`;
    }
    const saved=await api('/api/saved-searches');
    content+=`<article class="workspace-card"><h3>Búsquedas guardadas y alertas</h3><p>Las coincidencias nuevas aparecen aquí cuando abras tu espacio.</p>${savedSearchCards(saved.saved_searches,saved.new_matches)}</article>`;
    content+='<article class="workspace-card"><button class="btn outline" id="open-conversations">Abrir mis conversaciones</button></article>';
    modal('Mi espacio en Rueda',content);
    $('#share-contact-pref')?.addEventListener('change',async event=>{try{await api('/api/me/contact-preference',{method:'POST',body:JSON.stringify({share_contact:event.target.checked})});}catch(error){event.target.checked=!event.target.checked;alert(error.message);}});
    document.querySelectorAll('[data-listing-status]').forEach(select=>select.onchange=async()=>{try{await api(`/api/listings/${select.dataset.listingStatus}/status`,{method:'POST',body:JSON.stringify({status:select.value})});}catch(error){alert(error.message);}});
    document.querySelectorAll('[data-save-price]').forEach(button=>button.onclick=async()=>{const id=button.dataset.savePrice;const price=$(`[data-listing-price="${id}"]`).value;try{await api(`/api/listings/${id}/price`,{method:'POST',body:JSON.stringify({asking_price:price})});button.textContent='Precio actualizado';}catch(error){alert(error.message);}});
    $('#new-opportunity')?.addEventListener('click',()=>{$('#new-opportunity-form').hidden=false;});
    $('#opportunity-create')?.addEventListener('submit',async event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));try{await api('/api/opportunities',{method:'POST',body:JSON.stringify(values)});await openWorkspace();}catch(error){alert(error.message);}});
    document.querySelectorAll('[data-save-op]').forEach(button=>button.onclick=async()=>{const id=button.dataset.saveOp;const status=$(`[data-op-status="${id}"]`).value;const notes=$(`[data-op-notes="${id}"]`).value;try{await api(`/api/opportunities/${id}`,{method:'POST',body:JSON.stringify({status,notes})});button.textContent='Guardado';}catch(error){alert(error.message);}});
    document.querySelectorAll('[data-delete-search]').forEach(button=>button.onclick=async()=>{try{await api(`/api/saved-searches/${button.dataset.deleteSearch}`,{method:'DELETE'});await openWorkspace();}catch(error){alert(error.message);}});
    document.querySelectorAll('[data-remove-favorite]').forEach(button=>button.onclick=async()=>{try{await api(`/api/listings/${button.dataset.removeFavorite}/favorite`,{method:'DELETE'});await openWorkspace();}catch(error){alert(error.message);}});
    document.querySelectorAll('[data-open-listing]').forEach(button=>button.onclick=()=>{window.RuedaApp.closeModal();window.RuedaApp.openListing(button.dataset.openListing);});
    $('#open-conversations')?.addEventListener('click',()=>window.openModal?.('chats'));
  }
  function init() {
    const actions=$('.nav-actions');
    const addWorkspace=()=>{if(!window.ruedaUser||!actions||$('#workspace-button'))return;const button=document.createElement('button');button.id='workspace-button';button.className='btn outline';button.textContent='Mi espacio';button.onclick=()=>openWorkspace().catch(error=>alert(error.message));actions.prepend(button);};
    addWorkspace();window.addEventListener('rueda-authenticated',addWorkspace);
    $('#apply-filters')?.addEventListener('click',()=>window.RuedaApp.loadListings());
    $('#clear-filters')?.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(field=>field.value='');$('[data-sort]').value='recent';const selects=document.querySelectorAll('.searchbar .search-item select');if(selects[0])selects[0].value='Toda Colombia';if(selects[1])selects[1].value='Cualquier comisión';$('#car-search').value='';window.RuedaApp.loadListings();renderChips();});
    document.querySelectorAll('[data-filter],[data-sort]').forEach(field=>field.addEventListener('change',()=>window.RuedaApp.loadListings()));
    $('#save-search')?.addEventListener('click',async()=>{if(!window.ruedaUser){requireLogin('buyer');return;}try{await api('/api/saved-searches',{method:'POST',body:JSON.stringify(filters())});alert('Búsqueda guardada. Verás nuevas coincidencias en Mi espacio.');}catch(error){alert(error.message);}});
    api('/api/filter-options').then(options=>{
      const city=$('.searchbar .search-item select');
      if(city&&options.cities?.length){const selected=city.value;city.innerHTML='<option>Toda Colombia</option>'+options.cities.map(name=>`<option>${esc(name)}</option>`).join('');city.value=[...city.options].some(option=>option.value===selected)?selected:'Toda Colombia';}
      const body=$('[data-filter="body_type"]');
      if(body&&options.body_types?.length){const selected=body.value;body.innerHTML='<option value="">Cualquiera</option>'+options.body_types.map(name=>`<option>${esc(name)}</option>`).join('');body.value=selected;}
    }).catch(()=>{});
    const renderChips=()=>{const container=$('#active-filter-chips');if(!container)return;const labels={q:'Texto',city:'Ciudad',body_type:'Carrocería',min_price:'Precio desde',max_price:'Precio hasta',min_year:'Año desde',max_year:'Año hasta',max_km:'Km máximo',min_commission:'Comisión desde'};container.innerHTML=Object.entries(filters()).filter(([,value])=>value).map(([key,value])=>`<button class="filter-chip" data-clear-filter="${esc(key)}">${esc(labels[key]||key)}: ${esc(value)}　×</button>`).join('');container.querySelectorAll('[data-clear-filter]').forEach(button=>button.onclick=()=>{const key=button.dataset.clearFilter;if(key==='q')$('#car-search').value='';else if(key==='city')document.querySelectorAll('.searchbar .search-item select')[0].value='Toda Colombia';else if(key==='min_commission')document.querySelectorAll('.searchbar .search-item select')[1].value='Cualquier comisión';else{const input=$(`[data-filter="${key}"]`);if(input)input.value='';}window.RuedaApp.loadListings();renderChips();});};
    $('#apply-filters')?.addEventListener('click',renderChips);
    document.querySelectorAll('[data-filter],.searchbar .search-item select,#car-search').forEach(field=>{field.addEventListener('change',renderChips);field.addEventListener('input',renderChips);});
    window.addEventListener('rueda-listings-rendered',event=>{const count=$('#result-count');if(count)count.textContent=`${event.detail.count} vehículo(s) encontrados`;});
  }
  document.addEventListener('DOMContentLoaded',init);
})();

