fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const displayedCoordinates = new Map(); // Para armazenar coordenadas já exibidas
    const uniquePlaces = {}; // Para garantir que locais duplicados sejam evitados
    const pinOffset = 0.0003; // Distância máxima do deslocamento em metros (~30 metros)

    data.forEach(place => {
      // Se não tiver coordenadas, ignora
      if (!place.latitude || !place.longitude) return;

      const coordsKey = `${place.latitude},${place.longitude}`; // Chave com coordenadas únicas
      const placeKey = `${place.name},${coordsKey}`; // Chave com nome e coordenadas para eliminar duplicatas

      // Se o local já foi exibido (mesmo nome e coordenadas), ignora
      if (uniquePlaces[placeKey]) return;

      // Se o local já foi exibido com as mesmas coordenadas, desloca levemente
      if (displayedCoordinates.has(coordsKey)) {
        place.latitude += (Math.random() - 0.5) * pinOffset;
        place.longitude += (Math.random() - 0.5) * pinOffset;
      }

      // Marca o local como exibido
      uniquePlaces[placeKey] = true;
      displayedCoordinates.set(coordsKey, true); // Marca as coordenadas como já exibidas

      // Gerar o conteúdo do popup
      const popupContent = `
        <strong>${place.name || 'Unnamed Place'}</strong><br>
        ${place.type || 'Not Specified'}
      `;

      // Adicionar o marcador no mapa
      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });

    console.log(`Total de locais únicos exibidos: ${Object.keys(uniquePlaces).length}`);
  })
  .catch(error => {
    console.error("Erro ao carregar os dados dos locais:", error);
  });
