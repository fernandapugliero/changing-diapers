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
      const currentDate = new Date(place.created_at || 0);
      const existingDate = grouped[place.name]
        ? new Date(grouped[place.name].created_at || 0)
        : null;

      if (!grouped[place.name] || currentDate > existingDate) {
        grouped[place.name] = place;
      }
    });

    // Criar marcadores e popups com o nome e tipo do local
    Object.values(grouped).forEach(place => {
      if (!place.latitude || !place.longitude) return;

      // Verificar se o tipo do local existe antes de exibir
      const type = place.type || 'Not Specified';
      const popupContent = `<strong>${place.name || 'Unnamed Place'}</strong><br>
                            ${type}`;

      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(popupContent);
    });
  })
  .catch(error => {
    console.error("Error loading places data:", error);
  });

const swiper = new Swiper('.swiper-container', {
  slidesPerView: 1, // 1 slide por vez no mobile
  spaceBetween: 10,  // Espaço entre os slides
  autoplay: {
    delay: 3000, // Intervalo entre as trocas de slides
  },
  navigation: {
    nextEl: '.swiper-button-next', // Botão de navegação para frente
    prevEl: '.swiper-button-prev', // Botão de navegação para trás
  },
  breakpoints: {
    // Para telas menores, no mobile, exibe 1 depoimento
    768: {
      slidesPerView: 1,
      spaceBetween: 10,
    },
    // Para telas maiores, no desktop, exibe 4 depoimentos
    1024: {
      slidesPerView: 4,
      spaceBetween: 20,
    }
  }
});
