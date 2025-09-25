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

    // Marcador de "você" como bolinha azul
    let youMarker = null;
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

    // Escolhe melhor resultado do geocoder (prioriza city/town/etc e match do início)
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

    // Geocodificação global (sem countrycodes)
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
          },
          (err) => {
            console.warn('Geolocation error:', err);
            alert('Could not get your location. Please check permissions and try again.');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
      });
    }

    // ===== ESTRELAS (0–5) a partir do overall_user_experience (0–10) =====
function starSpanFromScore10(rawScore) {
  if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) {
    // 🚨 Sem nota: 5 estrelas vazias + texto "Not rated yet"
    return `
      <span class="star-rating is-empty" aria-hidden="true" style="--rating:0;"></span>
      <span class="star-note">Not rated yet</span>
    `;
  }

  // ✅ Converte 0–10 para 0–5 e arredonda em .0 ou .5
  let stars = Math.max(0, Math.min(5, rawScore / 2));
  stars = Math.round(stars * 2) / 2;

  return `<span class="star-rating" aria-hidden="true" style="--rating:${stars}"></span>`;
}

function buildPopup(place) {
  const name = place.name || 'Unnamed Place';
  const type = place.type || 'Not specified';
  const address = place.address || '';
  const starsHTML = starSpanFromScore10(place.overall_user_experience);

  let html = `<strong>${name}</strong><br>${type}`;
  if (address) html += `<br>${address}`;
  if (starsHTML) html += `<br>${starsHTML}`;
  return html;
}

    // ===== PLOTAGEM DOS PINS =====
    const displayedCoordinates = new Map();
    const uniquePlaces = {};
    const pinOffset = 0.0003;

    console.log(`📥 Received total places from JSON: ${data.length}`);

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

      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(buildPopup(place));
    });

    console.log(`✅ Total unique pins on map: ${Object.keys(uniquePlaces).length}`);
  })
  .catch(error => {
    console.error("❌ Error loading places.json:", error);
  });
