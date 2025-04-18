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

$(document).ready(function(){
  $('.testimonial-carousel').slick({
    slidesToShow: 1,   // Mostra 1 depoimento por vez
    slidesToScroll: 1,  // Avança 1 depoimento por vez
    autoplay: true,     // Define que o carrossel vai rodar automaticamente
    autoplaySpeed: 3000, // Intervalo de 3 segundos entre cada troca de slide
    arrows: true,       // Ativa as setas de navegação
    dots: true,         // Ativa os pontos de navegação
    responsive: [
      {
        breakpoint: 768, // Para mobile
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        }
      },
      {
        breakpoint: 1024, // Para desktop
        settings: {
          slidesToShow: 4,  // Exibe 4 depoimentos por vez no desktop
          slidesToScroll: 1,
        }
      }
    ]
  });
});
