fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const displayedCoordinates = new Set(); // Para armazenar as coordenadas já exibidas
    const uniquePlaces = {}; // Usamos um objeto para garantir que locais duplicados sejam evitados

    data.forEach(place => {
      if (!place.latitude || !place.longitude) return; // Ignorar locais sem coordenadas

      const coordsKey = `${place.latitude},${place.longitude}`;
      const placeKey = `${place.name},${coordsKey}`; // Chave única com nome + coordenadas

      // Verificar se o local já foi exibido (mesmo nome e coordenadas)
      if (uniquePlaces[placeKey]) return; // Se o local já foi exibido, ignorar

      // Se o local tiver coordenadas duplicadas e o nome for diferente, aplica deslocamento
      if (displayedCoordinates.has(coordsKey)) {
        const offsetLat = (Math.random() - 0.5) * 0.0005; // Desloca levemente na latitude
        const offsetLon = (Math.random() - 0.5) * 0.0005; // Desloca levemente na longitude

        place.latitude += offsetLat;
        place.longitude += offsetLon;

        // Atualiza a chave com as novas coordenadas deslocadas
        const newCoordsKey = `${place.latitude},${place.longitude}`;
        coordsKey = newCoordsKey; // Atualiza a chave para refletir o deslocamento
      }

      // Marca o local como exibido (mesmo coordenadas e nome)
      uniquePlaces[placeKey] = true;

      // Adiciona as coordenadas ao conjunto para evitar repetição
      displayedCoordinates.add(coordsKey);

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
