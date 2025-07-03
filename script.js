fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const displayedCoordinates = new Map();
    const uniquePlaces = {};
    const pinOffset = 0.0003; // ~30 metros

    data.forEach(place => {
      if (!place.latitude || !place.longitude) {
        console.log(`⚠️ Skipping '${place.name}' — missing coordinates`);
        return;
      }

      const coordsKey = `${place.latitude.toFixed(6)},${place.longitude.toFixed(6)}`;
      const placeKey = `${place.name},${coordsKey}`;

      if (uniquePlaces[placeKey]) {
        console.log(`⏭️ Duplicate found for '${place.name}' at ${coordsKey}`);
        return;
      }

      if (displayedCoordinates.has(coordsKey)) {
        if (place.name !== displayedCoordinates.get(coordsKey)) {
          const oldLat = place.latitude;
          const oldLon = place.longitude;
          place.latitude += (Math.random() - 0.5) * pinOffset;
          place.longitude += (Math.random() - 0.5) * pinOffset;
          console.log(`📍 Adjusted pin for '${place.name}' to avoid overlap: [${oldLat}, ${oldLon}] ➜ [${place.latitude.toFixed(6)}, ${place.longitude.toFixed(6)}]`);
        }
      }

      uniquePlaces[placeKey] = true;
      displayedCoordinates.set(coordsKey, place.name);

      const popupContent = `
        <strong>${place.name || 'Unnamed Place'}</strong><br>
        ${place.type || 'Type: N/A'}<br>
        ${place.city || ''} ${place.country || ''}
      `;

      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent.trim());
    });

    console.log(`✅ Total unique pins on map: ${Object.keys(uniquePlaces).length}`);
  })
  .catch(error => {
    console.error("❌ Error loading places.json:", error);
  });
