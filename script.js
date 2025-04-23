fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const map = L.map('map').setView([52.52, 13.405], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Remover a lógica de agrupamento por nome, agora vamos exibir todos os locais
    data.forEach(place => {
      if (!place.latitude || !place.longitude) return; // Se não tiver latitude ou longitude, ignora

      // Verificar se o tipo do local existe antes de exibir
      const type = place.type || 'Not Specified';
      const popupContent = `<strong>${place.name || 'Unnamed Place'}</strong><br>
                            ${type}`;

      // Criar o marcador (pin) no mapa para cada local
      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });
  })
  .catch(error => {
    console.error("Erro ao carregar os dados dos locais:", error);
  });
