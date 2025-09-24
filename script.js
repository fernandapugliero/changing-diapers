fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // ========== ADIÇÃO: busca por localização ==========
    const input = document.getElementById('geo-input');
    const goBtn = document.getElementById('geo-go');
    const meBtn = document.getElementById('geo-me');

    let youMarker = null; // marcador do "sua localização"

    function centerMap(lat, lng) {
      map.setView([lat, lng], 14);
      if (!youMarker) {
        youMarker = L.marker([lat, lng], { title: 'Your location' }).addTo(map);
      } else {
        youMarker.setLatLng([lat, lng]);
      }
    }

    async function geocodeAndCenter(query) {
      if (!query) return;

      // Se o usuário digitar "lat,lng", aceita direto
      const m = query.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        centerMap(lat, lng);
        return;
      }

      // Geocoding via Nominatim (OSM) — ótimo para MVP, sem chave
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1&countrycodes=de,pt`;

      try {
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const results = await res.json();

        if (!Array.isArray(results) || results.length === 0) {
          alert('Location not found. Try a more specific address or ZIP/CEP.');
          return;
        }

        const { lat, lon } = results[0];
        centerMap(parseFloat(lat), parseFloat(lon));
      } catch (err) {
        console.error('Geocoding error:', err);
        alert('Could not look up this location now. Please try again in a moment.');
      }
    }

    // Listeners — só conectam se os elementos existem no HTML
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
    // ========== FIM DA ADIÇÃO ==========

    const displayedCoordinates = new Map();
    const uniquePlaces = {};
    const pinOffset = 0.0003;

    let skipped = 0;
    const skippedPlaces = [];

    console.log(`📥 Received total places from JSON: ${data.length}`);

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
          console.log(`📍 Adjusted pin for "${place.name}" to avoid overlap: [${origLat}, ${origLon}] ➜ [${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}]`);
        }
      }

      uniquePlaces[placeKey] = true;
      displayedCoordinates.set(coordsKey, place.name);

      const popupContent = `
        <strong>${place.name || 'Unnamed Place'}</strong><br>
        ${place.type || 'Not Specified'}
      `;

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
