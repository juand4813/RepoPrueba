/* Adapt the existing Rueda interface to a public, read-only GitHub Pages demo. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  let catalogPromise;

  function getCatalog() {
    if (!catalogPromise) {
      catalogPromise = nativeFetch(new URL('catalog.json', document.baseURI))
        .then(response => {
          if (!response.ok) throw new Error('No se pudo cargar el catálogo de muestra.');
          return response.json();
        })
        .then(rows => rows.map((row, index) => ({
          id: `demo-${index + 1}`,
          make: row.make,
          model: row.model,
          trim: row.trim,
          model_year: row.year,
          mileage_km: row.km,
          asking_price: row.price,
          city: row.city,
          body_type: row.body,
          fuel: row.fuel,
          transmission: row.transmission,
          description: 'Vehículo de referencia tomado de un aviso público. Verifica disponibilidad y condiciones con la fuente.',
          cover_url: row.photo,
          photos: row.photo ? [row.photo] : [],
          is_demo: true,
          source_url: row.source,
          source_checked_at: '2026-11-20',
          commission_reference_rate: 3,
          commission_reference_amount: Math.round(row.price * 0.03 / 1000) * 1000
        })));
    }
    return catalogPromise;
  }

  function response(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    if (!url.pathname.includes('/api/')) return nativeFetch(input, init);

    const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    if (method !== 'GET') {
      return response({ error: 'Esta demostración es de solo lectura. No se guardaron cambios.' }, 403);
    }

    const route = url.pathname.slice(url.pathname.indexOf('/api/') + 5);
    if (route === 'me') return response({ user: null });
    if (route === 'dev-preview') return response({ enabled: true });

    const rows = await getCatalog();
    if (route === 'listings' || route.startsWith('listings?')) {
      const params = url.searchParams;
      const query = (params.get('q') || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      let listings = rows.filter(car => {
        const searchable = `${car.make} ${car.model} ${car.trim} ${car.city} ${car.body_type}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return (!query || searchable.includes(query))
          && (!params.get('city') || car.city === params.get('city'))
          && (!params.get('body_type') || car.body_type === params.get('body_type'))
          && (!params.get('min_price') || car.asking_price >= Number(params.get('min_price')))
          && (!params.get('max_price') || car.asking_price <= Number(params.get('max_price')))
          && (!params.get('min_year') || car.model_year >= Number(params.get('min_year')))
          && (!params.get('max_year') || car.model_year <= Number(params.get('max_year')))
          && (!params.get('max_km') || car.mileage_km <= Number(params.get('max_km')));
      });
      const sort = params.get('sort');
      if (sort === 'price_asc') listings.sort((a, b) => a.asking_price - b.asking_price);
      if (sort === 'price_desc') listings.sort((a, b) => b.asking_price - a.asking_price);
      if (sort === 'year_desc') listings.sort((a, b) => b.model_year - a.model_year);
      return response({ listings });
    }

    const detail = route.match(/^listings\/([^/]+)$/);
    if (detail) {
      const listing = rows.find(car => car.id === decodeURIComponent(detail[1]));
      return listing ? response({ listing }) : response({ error: 'No se encontró el vehículo.' }, 404);
    }

    if (route.startsWith('search-suggestions')) {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const suggestions = [...new Set(rows.flatMap(car => [car.make, car.model, car.trim, car.city]).filter(Boolean))]
        .filter(item => item.toLowerCase().includes(q)).slice(0, 8);
      return response({ suggestions });
    }
    return response({ error: 'Esta función no está disponible en la demostración.' }, 404);
  };
})();

