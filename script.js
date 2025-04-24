fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const displayedCoordinates = new Map(); // Usar um mapa para armazenar coordenadas e verificar duplicatas
    const uniquePlaces = {}; // Para garantir que locais duplicados sejam evitados

    data.forEach(place => {
      if (!place.latitude || !place.longitude) return; // Ignorar locais sem coordenadas

      const coordsKey = `${place.latitude},${place.longitude}`;
      const placeKey = `${place.name},${coordsKey}`; // Chave única com nome + coordenadas

      // Se o local já foi exibido com o mesmo nome e coordenadas, ignora
      if (uniquePlaces[placeKey]) return;

      // Se as coordenadas já foram exibidas e o nome é diferente, desloca levemente
      if (displayedCoordinates.has(coordsKey)) {
        const offsetLat = (Math.random() - 0.5) * 0.0005; // Deslocamento leve na latitude
        const offsetLon = (Math.random() - 0.5) * 0.0005; // Deslocamento leve na longitude

        // Atualiza as coordenadas do local com o deslocamento
        place.latitude += offsetLat;
        place.longitude += offsetLon;

        // Atualiza a chave de coordenadas com as novas coordenadas deslocadas
        const newCoordsKey = `${place.latitude},${place.longitude}`;
        coordsKey = newCoordsKey;
      }

      // Marca o local como exibido
      uniquePlaces[placeKey] = true;
      displayedCoordinates.set(coordsKey, true); // Registra as coordenadas como exibidas

      // Criar conteúdo para o popup
      const popupContent = `
        <strong>${place.name || 'Unnamed Place'}</strong><br>
        ${place.type || 'Not Specified'}
      `;

      // Adiciona o marcador (pin) no mapa
      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });

    console.log(`Total de locais únicos exibidos: ${Object.keys(uniquePlaces).length}`);
  })
  .catch(error => {
    console.error("Erro ao carregar os dados dos locais:", error);
  });
