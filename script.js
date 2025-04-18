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

let currentIndex = 0;
const testimonials = document.querySelectorAll('.testimonial');
const totalTestimonials = testimonials.length;
const testimonialWrapper = document.querySelector('.testimonial-wrapper');

// Função para ir para o próximo depoimento
function nextTestimonial() {
  if (currentIndex < totalTestimonials - 1) {
    currentIndex++;
  } else {
    currentIndex = 0; // Volta ao primeiro depoimento
  }
  updateCarousel();
}

// Função para ir para o depoimento anterior
function prevTestimonial() {
  if (currentIndex > 0) {
    currentIndex--;
  } else {
    currentIndex = totalTestimonials - 1; // Vai para o último depoimento
  }
  updateCarousel();
}

// Atualiza o carrossel com a nova posição
function updateCarousel() {
  const offset = -currentIndex * 100; // Mover o carrossel para a esquerda ou direita
  testimonialWrapper.style.transform = `translateX(${offset}%)`;
}

// Adiciona eventos de navegação
document.querySelector('.testimonial-carousel::before').addEventListener('click', prevTestimonial);
document.querySelector('.testimonial-carousel::after').addEventListener('click', nextTestimonial);

// Inicializa o carrossel com o primeiro depoimento
updateCarousel();
