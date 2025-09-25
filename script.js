fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // ====== Geolocalização por texto + botão "Use my location" ======
    const input = document.getElementById('geo-input');
    const goBtn = document.getElementById('geo-go');
    const meBtn = document.getElementById('geo-me');

    let youMarker = null; // marcador da sua localização (bolinha azul)

    // bolinha azul discreta (mesma cor padrão do Leaflet)
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

    // Escolhe o melhor resultado do Nominatim, priorizando cidades/towns/villages
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
        // peso simples: exato > começa com > importância
        const score = exact * 100 + startsWith * 10 + importance;
        return { r, score };
      });

      scored.sort((a, b) => b.score - a.score);
      return scored.length ? scored[0].r : null;
    }

    async function geocodeAndCenter(query) {
      if (!query) return;

      // aceita "lat,lng"
      const m = query.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        centerMap(lat, lng);
        return;
      }

      // Geocoding via Nominatim (MUNDO INTEIRO — sem countrycodes)
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
        const lat = parseFloat(best.lat);
        const lon = parseFloat(best.lon);
        centerMap(lat, lon);
      } catch (err) {
        console.error('Geocoding error:', err);
        alert('Could not look up this location now. Please try again in a moment.');
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
          },
          (err) => {
            console.warn('Geolocation error:', err);
            alert('Could not get your location. Please check permissions and try again.');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
      });
    }
    // ====== FIM geolocalização ======

    // ====== PLOTAGEM DOS PINS ======
    const displayedCoordinates = new Map();
    const uniquePlaces = {};
    const pinOffset = 0.0003;

    let skipped = 0;
    const skippedPlaces = [];

    console.log(`📥 Received total places from JSON: ${data.length}`);

    // Monta o conteúdo do popup com nome, tipo, endereço e nota (se houver)
    function buildPopup(place) {
      const name = place.name || 'Unnamed Place';
      const type = place.type || 'Not specified';
      const address = place.address || '';
      const score10 = typeof place.overall_user_experience === 'number'
        ? place.overall_user_experience
        : null;

      let html = `<strong>${name}</strong><br>${type}`;
      if (address) html += `<br>${address}`;
      if (score10 !== null) {
        const stars = Math.round((score10 / 2) * 10) / 10; // 0–5 com 1 casa
        html += `<br>⭐️ ${stars}/5 (${score10}/10)`;
      }
      return html;
    }

    data.forEach(place => {
      if (!place.latitude || !place.longitude) {
        console.log(`⏭️ Skipped "${place.name}" → Missing coordinates`);
        skippedPlaces.push(place.name);
        skipped++;
        return;
      }

      const coordsKey = `${place.latitude},${place.longitude}`;
      const placeKey = `${place.name},${coordsKey}`;

      if (uniquePlaces[placeKey]) return;

      if (displayedCoordinates.has(coordsKey)) {
        if (place.name !== displayedCoordinates.get(coordsKey)) {
          const origLat = place.latitude;
          const origLon = place.longitude;
          place.latitude += (Math.random() - 0.5) * pinOffset;
          place.longitude += (Math.random() - 0.5) * pinOffset;
          console.log(
            `📍 Adjusted pin for "${place.name}" to avoid overlap: [${origLat}, ${origLon}] ➜ [${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}]`
          );
        }
      }

      uniquePlaces[placeKey] = true;
      displayedCoordinates.set(coordsKey, place.name);

      const popupContent = buildPopup(place);

      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });

    console.log(`✅ Total unique pins on map: ${Object.keys(uniquePlaces).length}`);
    console.log(`⏭️ Total skipped (missing coordinates): ${skipped}`);
    if (skippedPlaces.length > 0) {
      console.log(`🔍 Skipped places: ${skippedPlaces.join(', ')}`);
    } else {
      console.log('✅ No places missing coordinates.');
    }
  })
  .catch(error => {
    console.error("❌ Error loading places.json:", error);
  });
