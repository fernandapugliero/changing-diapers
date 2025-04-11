fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Agrupar por nome e manter só o mais recente
    const grouped = {};
    data.forEach(place => {
      if (!place.name) return;
      const existing = grouped[place.name];
      const currentDate = new Date(place.created_at || 0);
      const existingDate = existing ? new Date(existing.created_at || 0) : null;

      if (!existing || currentDate > existingDate) {
        grouped[place.name] = place;
      }
    });

    Object.values(grouped).forEach(place => {
      if (!place.latitude || !place.longitude) return;

      const popupContent = \`
        <strong>\${place.name}</strong><br>
        <em>\${place.type || ''}</em><br>
        \${place.address}<br>
        \${place.city}<br>
        \${place.site ? '<a href="' + place.site + '" target="_blank">Website</a>' : ''}
      \`;

      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });
  });
