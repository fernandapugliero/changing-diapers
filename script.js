fetch('places.json')
  .then(res => res.json())
  .then(data => {
    // ===== MAPA =====
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // ===== GEOCODER + "USE MY LOCATION" =====
    const input = document.getElementById('geo-input');
    const goBtn = document.getElementById('geo-go');
    const meBtn = document.getElementById('geo-me');

    // Estado global de localização e rota
    let youMarker = null;          
    let routingControl = null;     
    let geoWatchId = null;         
    let lastRouteAt = 0;           

    // Limites de recalculo de rota
    const MIN_ROUTE_INTERVAL_MS = 20000; // 20s
    const MIN_MOVE_METERS = 50;          // 50 m

    // Estilo do "pontinho azul"
    const youStyle = {
      radius: 6,
      color: '#3388ff',
      weight: 2,
      fillColor: '#3388ff',
      fillOpacity: 0.9
    };

    function centerMap(lat, lng) {
      map.setView([lat, lng], 14);
      if (!youMarker) {
        youMarker = L.circleMarker([lat, lng], youStyle).addTo(map);
        youMarker.bindTooltip('You', { direction: 'top', offset: [0, -2] });
        youMarker.on('click', () => youMarker.openTooltip());
      } else {
        youMarker.setLatLng([lat, lng]);
      }
    }

    // Distância em metros
    function haversine(a, b) {
      const R = 6371000;
      const toRad = d => d * Math.PI / 180;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const s = Math.sin(dLat/2) ** 2 +
                Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) *
                Math.sin(dLng/2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    }

    // Escolhe melhor resultado do geocoder
    function pickBestResult(query, results) {
      const q = (query || '').trim().toLowerCase();
      const placeTypes = new Set([
        'city','town','village','hamlet','municipality',
        'state','county','suburb','neighbourhood'
      ]);

      const prioritized = results.filter(r => r.class === 'place' && placeTypes.has(r.type));
      const pool = prioritized.length ? prioritized : results;

      const scored = pool.map(r => {
        const label = (r.display_name || '').split(',')[0].trim().toLowerCase();
        const exact = label === q ? 1 : 0;
        const startsWith = label.startsWith(q) ? 1 : 0;
        const importance = Number(r.importance || 0);
        const score = exact * 100 + startsWith * 10 + importance;
        return { r, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.length ? scored[0].r : null;
    }

    // Geocodificação global
    async function geocodeAndCenter(query) {
      if (!query) return;

      const m = query.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        centerMap(lat, lng);
        return;
      }

      const params = new URLSearchParams({
        format: 'json',
        q: query,
        addressdetails: '1',
        limit: '5'
      });
      const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

      try {
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const results = await res.json();

        if (!Array.isArray(results) || results.length === 0) {
          alert('Location not found. Try a more specific address or ZIP/CEP.');
          return;
        }

        const best = pickBestResult(query, results) || results[0];
        centerMap(parseFloat(best.lat), parseFloat(best.lon));
      } catch (err) {
        console.error('Geocoding error:', err);
        alert('Could not look up this location now. Please try again later.');
      }
    }

    // Eventos do campo e botões
    if (input && goBtn) {
      goBtn.addEventListener('click', () => geocodeAndCenter(input.value.trim()));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') geocodeAndCenter(input.value.trim());
      });
    }

    if (meBtn) {
      meBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          alert('Geolocation is not supported in this browser.');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            centerMap(latitude, longitude);
            startWatchingPosition();
          },
          (err) => {
            console.warn('Geolocation error:', err);
            alert('Could not get your location. Please check permissions and try again.');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
      });
    }

    // Acompanha movimento e atualiza rota se necessário
    function startWatchingPosition() {
      if (!navigator.geolocation || geoWatchId) return;
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const cur = L.latLng(pos.coords.latitude, pos.coords.longitude);
          if (youMarker) youMarker.setLatLng(cur);

          if (routingControl && routingControl.getWaypoints().length === 2) {
            const now = Date.now();
            const prevStart = routingControl.getWaypoints()[0].latLng;
            const moved = haversine(prevStart, cur);

            if (now - lastRouteAt >= MIN_ROUTE_INTERVAL_MS && moved >= MIN_MOVE_METERS) {
              const dest = routingControl.getWaypoints()[1].latLng;
              routingControl.setWaypoints([cur, dest]);
              lastRouteAt = now;
            }
          }
        },
        (err) => console.warn('watchPosition error', err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    }

    // Cria rota a pé no mapa
    function routeTo(destLat, destLng) {
      if (!L.Routing || !L.Routing.control) {
        alert('Routing unavailable. Make sure Leaflet Routing Machine is included.');
        return;
      }
      if (!youMarker) {
        alert('Click “Use my location” or search your location first.');
        return;
      }

      const start = youMarker.getLatLng();
      const end = L.latLng(destLat, destLng);

      if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
      }

      routingControl = L.Routing.control({
        waypoints: [start, end],
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        show: false,
        router: L.Routing.osrmv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'foot',
          timeout: 15000
        }),
        lineOptions: { styles: [{ opacity: 0.9, weight: 6 }] }
      }).addTo(map);

      lastRouteAt = Date.now();
      startWatchingPosition();
    }

    // ===== PINS / POPUPS =====
    const displayedCoordinates = new Map();
    const uniquePlaces = {};
    const pinOffset = 0.0003;

    console.log(`📥 Received total places from JSON: ${data.length}`);

    function buildPopup(place) {
      const name = place.name || 'Unnamed Place';
      const type = place.type || 'Not specified';
      const address = place.address || '';
      const score10 = (typeof place.overall_user_experience === 'number')
        ? place.overall_user_experience
        : null;

      let html = `<strong>${name}</strong><br>${type}`;
      if (address) html += `<br>${address}`;
      if (score10 !== null) {
        const stars = Math.round((score10 / 2) * 10) / 10;
        html += `<br>⭐️ ${stars}/5 (${score10}/10)`;
      }

      html += `
        <div style="margin-top:8px;">
          <button class="route-btn"
                  data-lat="${place.latitude}"
                  data-lng="${place.longitude}"
                  style="padding:6px 12px;border:1px solid #ddd;border-radius:8px;background:#fff;cursor:pointer;font-size:0.9rem;">
            👣 Calcular rota
          </button>
        </div>`;
      return html;
    }

    data.forEach(place => {
      if (!place.latitude || !place.longitude) return;

      const coordsKey = `${place.latitude},${place.longitude}`;
      const placeKey = `${place.name},${coordsKey}`;

      if (uniquePlaces[placeKey]) return;

      if (displayedCoordinates.has(coordsKey)) {
        if (place.name !== displayedCoordinates.get(coordsKey)) {
          place.latitude += (Math.random() - 0.5) * pinOffset;
          place.longitude += (Math.random() - 0.5) * pinOffset;
        }
      }

      uniquePlaces[placeKey] = true;
      displayedCoordinates.set(coordsKey, place.name);

      const popupContent = buildPopup(place);
      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });

    // Captura cliques do botão no popup
    map.on('popupopen', (e) => {
      const root = e.popup._contentNode;
      const routeBtn = root.querySelector('.route-btn');
      if (routeBtn) {
        routeBtn.addEventListener('click', () => {
          const lat = parseFloat(routeBtn.getAttribute('data-lat'));
          const lng = parseFloat(routeBtn.getAttribute('data-lng'));
          routeTo(lat, lng);
        });
      }
    });
  })
  .catch(error => {
    console.error("❌ Error loading places.json:", error);
  });
