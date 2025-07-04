fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const displayedCoordinates = new Map();
    const uniquePlaces = {};
    const pinOffset = 0.0003;

    let skipped = 0;
    const skippedPlaces = []; // Coletar nomes pulados

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
      const blob = new Blob([skippedPlaces.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'places_missing.log';
      a.click();
      URL.revokeObjectURL(url);
      console.log(`📄 Generated places_missing.log with ${skippedPlaces.length} entries`);
    } else {
      console.log('✅ No places missing coordinates — nothing to log.');
    }

  })
  .catch(error => {
    console.error("❌ Error loading places.json:", error);
  });
