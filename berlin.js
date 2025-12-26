// berlin.js
// Gera cards automáticos para locais em Berlin com foto + review
// usando places.json (mesma fonte do mapa).

// Converte nota 0–10 (overall_user_experience) para 0–5 estrelas (.0 ou .5)
function starsFromScore10(rawScore) {
  if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) return null;
  let stars = Math.max(0, Math.min(5, rawScore / 2));
  stars = Math.round(stars * 2) / 2;
  return stars;
}

// Pega o texto da review a partir da coluna "Changing Table Review"
function getReviewText(place) {
  const raw = place['Changing Table Review'] || '';
  return String(raw).trim();
}

// Pega a URL da foto a partir do campo de anexos "Photos"
function getPhotoUrl(place) {
  // Caso mais comum: campo "Photos" vem do Airtable com um array de anexos
  // ex.: "Photos": [ { url: "https://..." , ... } ]
  if (Array.isArray(place.Photos) && place.Photos.length > 0) {
    const first = place.Photos[0];
    if (first.thumbnails && first.thumbnails.large && first.thumbnails.large.url) {
      // se estiver usando thumbnails otimizados, use este (melhor pra web)
      return first.thumbnails.large.url;
    }
    if (first.url) {
      // senão, usa o URL original do Airtable (pode ser mais pesado)
      return first.url;
    }
  }

  // Se não tiver nada, retorna null (card será filtrado)
  return null;
}

// Cria um <article> com o card
function createBerlinCard(place) {
  const article = document.createElement('article');
  article.className = 'recent-card';

  // Imagem
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.src = getPhotoUrl(place);
  img.alt = `${place.name || 'Baby changing place'} changing table`;
  article.appendChild(img);

  // Estrelas
  const stars = starsFromScore10(place.overall_user_experience);
  const starDiv = document.createElement('div');
  starDiv.className = 'star-rating';
  starDiv.style.setProperty('--rating', stars || 0);
  article.appendChild(starDiv);

  const starNote = document.createElement('span');
  starNote.className = 'star-note';
  starNote.textContent = stars ? `${stars}/5` : 'Not rated yet';
  article.appendChild(starNote);

  // Review
  const reviewText = getReviewText(place);
  if (reviewText) {
    const pQuote = document.createElement('p');
    pQuote.className = 'recent-quote';
    pQuote.textContent = `“${reviewText}”`;
    article.appendChild(pQuote);
  }

  // Meta: nome + endereço
  const metaDiv = document.createElement('div');
  metaDiv.className = 'recent-meta';

  const strongName = document.createElement('strong');
  strongName.textContent = place.name || 'Unnamed place';
  metaDiv.appendChild(strongName);
  metaDiv.appendChild(document.createElement('br'));

  const addressText = document.createTextNode(place.address || '');
  metaDiv.appendChild(addressText);

  article.appendChild(metaDiv);

  return article;
}

fetch('places.json')
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById('berlin-card-grid');
    if (!container) return;

    // Filtra apenas locais em Berlin com review + foto
    let berlinPlaces = data.filter(place => {
      const city = (place.city || '').toLowerCase().trim();
      const isBerlin =
        city === 'berlin' ||
        city === 'berlin,' ||
        city === 'berlin ' ||
        city === 'berlin, germany';

      const reviewText = getReviewText(place);
      const hasReview = !!reviewText;
      const photoUrl = getPhotoUrl(place);
      const hasPhoto = !!photoUrl;

      return isBerlin && hasReview && hasPhoto;
    });

    // Ordena por overall_user_experience (0–10) descrescente
    berlinPlaces.sort((a, b) => {
      const sa =
        typeof a.overall_user_experience === 'number'
          ? a.overall_user_experience
          : -1;
      const sb =
        typeof b.overall_user_experience === 'number'
          ? b.overall_user_experience
          : -1;
      return sb - sa;
    });

    console.log('📍 Berlin places with photo + review:', berlinPlaces.length);

    if (berlinPlaces.length === 0) {
      const info = document.createElement('p');
      info.className = 'top5-explanation';
      info.textContent =
        'No Berlin locations with photo and written review yet. Check back soon!';
      container.appendChild(info);
      return;
    }

    berlinPlaces.forEach(place => {
      const card = createBerlinCard(place);
      container.appendChild(card);
    });
  })
  .catch(err => {
    console.error('Error loading places.json on Berlin page:', err);
  });
