const map = L.map('map').setView([-23.561684, -46.625378], 12); // Centered in São Paulo

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Load JSON
fetch('places.json')
  .then(res => res.json())
  .then(data => {
    data.forEach(place => {
      const marker = L.marker([place.latitude, place.longitude]).addTo(map);
      const popupContent = `
        <strong>${place.name}</strong><br>
        ${place.address}<br>
        Type: ${place.type}<br>
        City: ${place.city}, Neighborhood: ${place.neighborhood}<br>
        Changing Table: ${place.has_changing_table}<br>
        Location: ${place.changing_table_location}<br>
        Supplies: ${place.supplies_available.join(', ')}<br>
        Conditions: ${place.conditions.join(', ')}
      `;
      marker.bindPopup(popupContent);
    });
  });