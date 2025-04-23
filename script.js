fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const displayedCoordinates = new Set(); // Para armazenar as coordenadas já exibidas
    const uniquePlaces = []; // Para garantir que não exibimos locais duplicados

    data.forEach(place => {
      if (!place.latitude || !place.longitude) return; // Ignorar locais sem coordenadas

      // Gerar uma chave única para as coordenadas
      let coordsKey = `${place.latitude},${place.longitude}`;

      // Verificar se o local já foi exibido
      if (displayedCoordinates.has(coordsKey)) {
        // Se o local já existe, desloca as coordenadas um pouco
        const offsetLat = (Math.random() - 0.5) * 0.0005; // Desloca levemente na latitude
        const offsetLon = (Math.random() - 0.5) * 0.0005; // Desloca levemente na longitude

        place.latitude += offsetLat;
        place.longitude += offsetLon;

        coordsKey = `${place.latitude},${place.longitude}`; // Atualiza a chave com as novas coordenadas
      }

      // Adiciona as coordenadas ao conjunto para não repetir
      displayedCoordinates.add(coordsKey);

      // Adiciona o local à lista de locais únicos
      uniquePlaces.push(place);

      // Gerar o conteúdo do popup
      const popupContent = `
        <strong>${place.name || 'Unnamed Place'}</strong><br>
        ${place.type || 'Not Specified'}
      `;

      // Adiciona o marcador no mapa
      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });

    console.log(`Total de locais únicos exibidos: ${uniquePlaces.length}`);
  })
  .catch(error => {
    console.error("Erro ao carregar os dados dos locais:", error);
  });
