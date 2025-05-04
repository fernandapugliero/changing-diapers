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
      // Preservar coordenadas manuais
      if (!place.latitude || !place.longitude) {
        console.log(`Skipping ${place.name} due to missing coordinates`);
        return; // Se coordenadas estiverem ausentes, ignora o local
      }

      const coordsKey = `${place.latitude},${place.longitude}`; // Chave com coordenadas únicas
      const placeKey = `${place.name},${coordsKey}`; // Chave com nome e coordenadas para eliminar duplicatas

      // Se o local já foi exibido (mesmo nome e coordenadas), ignora
      if (uniquePlaces[placeKey]) return;

      // Se o local com as mesmas coordenadas foi exibido antes
      if (displayedCoordinates.has(coordsKey)) {
        // Se o nome for diferente, desloca as coordenadas ligeiramente para evitar sobreposição de pins
        if (place.name !== displayedCoordinates.get(coordsKey)) {
          // Desloca as coordenadas para não sobrepor
          place.latitude += (Math.random() - 0.5) * pinOffset;
          place.longitude += (Math.random() - 0.5) * pinOffset;
        }
      }

      // Marca o local como exibido
      uniquePlaces[placeKey] = true;
      displayedCoordinates.set(coordsKey, place.name); // Marca as coordenadas e nome como já exibidos

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
