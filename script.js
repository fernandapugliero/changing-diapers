fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const displayedCoordinates = new Set(); // Para armazenar as coordenadas já exibidas

    data.forEach(place => {
      if (!place.latitude || !place.longitude) return; // Ignorar locais sem coordenadas

      // Gerar uma string única para as coordenadas
      let coordsKey = `${place.latitude},${place.longitude}`;

      // Se as coordenadas já foram exibidas, aplica um deslocamento leve
      if (displayedCoordinates.has(coordsKey)) {
        // Desloca levemente a latitude e longitude
        const offsetLat = (Math.random() - 0.5) * 0.001; // Desloca entre -0.0005 e +0.0005
        const offsetLon = (Math.random() - 0.5) * 0.001; // Desloca entre -0.0005 e +0.0005

        // Aplica o deslocamento nas coordenadas
        place.latitude += offsetLat;
        place.longitude += offsetLon;
        coordsKey = `${place.latitude},${place.longitude}`; // Atualiza a chave com as novas coordenadas
      }

      // Adiciona a nova coordenada ao conjunto para evitar repetições
      displayedCoordinates.add(coordsKey);

      // Gerar o conteúdo do popup
      const popupContent = `
        <strong>${place.name || 'Unnamed Place'}</strong><br>
        ${place.type || 'Not Specified'}
      `;

      // Adiciona o marcador (pin) no mapa com o novo local (se as coordenadas foram ajustadas)
      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });
  })
  .catch(error => {
    console.error("Erro ao carregar os dados dos locais:", error);
  });
