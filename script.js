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

    console.log(`📌 Places received from JSON: ${data.length}`);

    let skipped = 0;

    data.forEach(place => {
      if (!place.latitude || !place.longitude) {
        console.log(`⏭️ Skipped "${place.name}" → Missing coordinates`);
        skipped++;
        return;
      }

      const coordsKey = `${place.latitude},${place.longitude}`;
      const placeKey = `${place.name},${coordsKey}`;

      if (uniquePlaces[placeKey]) return;

      if (displayedCoordinates.has(coordsKey)) {
        if (place.name !== displayedCoordinates.get(coordsKey)) {
          place.latitude += (Math.random() - 0.5) * pinOffset;
          place.longitude += (Math.random() - 0.5) * pinOffset;
          console.log(`📍 Adjusted pin for "${place.name}" to avoid overlap`);
        }
      }

      uniquePlaces[placeKey] = true;
      displayedCoordinates.set(coordsKey, place.name);

      const emoji = getEmojiForType(place.type);

      const popupContent = `
        ${emoji} <strong>${place.name || 'Unnamed Place'}</strong><br>
        ${place.type || 'Not Specified'}
      `;

      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });

    console.log(`✅ Unique pins on map: ${Object.keys(uniquePlaces).length}`);
    console.log(`⏭️ Skipped (missing coordinates): ${skipped}`);
  })
  .catch(error => {
    console.error("❌ Error loading places.json:", error);
  });

// Helper function for emojis
function getEmojiForType(type) {
  if (!type) return '';
  type = type.toLowerCase();
  if (type.includes('cafe')) return '☕';
  if (type.includes('restaurant')) return '🍽️';
  if (type.includes('shopping') || type.includes('shop')) return '🛍️';
  if (type.includes('public toilet')) return '🚻';
  if (type.includes('biergarten')) return '🍺';
  return '';
}
