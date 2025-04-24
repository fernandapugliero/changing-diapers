fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Para armazenar as coordenadas já exibidas e garantir que locais duplicados não apareçam
    const displayedCoordinates = {}; // Mudança para garantir a contagem correta dos locais
    const uniquePlaces = {}; // Para garantir que locais duplicados sejam evitados

    data.forEach(place => {
      if (!place.latitude || !place.longitude) return; // Ignorar locais sem coordenadas

      // Criar uma chave única com base nas coordenadas
      const coordsKey = `${place.latitude},${place.longitude}`;
      
      // Criar uma chave combinada para nome e coordenadas
      const placeKey = `${place.name || 'Unnamed Place'},${coordsKey}`;

      // Se o local já foi exibido, não adiciona novamente
      if (uniquePlaces[placeKey]) return;

      // Se o local com a mesma coordenada foi exibido, aplica um deslocamento
      if (displayedCoordinates[coordsKey]) {
        const offsetLat = (Math.random() - 0.5) * 0.0005; // Desloca levemente na latitude
        const offsetLon = (Math.random() - 0.5) * 0.0005; // Desloca levemente na longitude

        place.latitude += offsetLat;
        place.longitude += offsetLon;

        // Atualizar chave para coordenadas deslocadas
        const newCoordsKey = `${place.latitude},${place.longitude}`;
        coordsKey = newCoordsKey;
      }

      // Marca o local como exibido
      uniquePlaces[placeKey] = true;
      displayedCoordinates[coordsKey] = true; // Marcar as coordenadas como já exibidas

      // Gerar o conteúdo do popup
      const popupContent = `
        <strong>${place.name || 'Unnamed Place'}</strong><br>
        ${place.type || 'Not Specified'}
      `;

      // Adicionar o marcador (pin) no mapa
      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });

    console.log(`Total de locais únicos exibidos: ${Object.keys(uniquePlaces).length}`);
  })
  .catch(error => {
    console.error("Erro ao carregar os dados dos locais:", error);
  });
