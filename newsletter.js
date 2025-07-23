const AIRTABLE_API_KEY = 'YpatIvzlvp30wnC7VO';  // Substitua com seu token
const BASE_ID = 'appjWF7WnC8DRWaXM';  // Substitua pelo seu Base ID
const TABLE_NAME = 'Newsletter';  // Nome da tabela no Airtable
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('.newsletter-form');
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    const name = form.querySelector('input[name="name"]').value;  // Obtém o valor do campo nome
    const email = form.querySelector('input[name="email"]').value;  // Obtém o valor do campo email

    if (name && email) {
      const data = {
        fields: {
          Name: name,
          Email: email
        }
      };

      fetch(AIRTABLE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(data => {
        document.getElementById('message').textContent = "Thank you for subscribing!";
        form.reset(); // Limpa o formulário
      })
      .catch(error => {
        document.getElementById('message').textContent = "There was an error. Please try again.";
        console.error("Error:", error);
      });
    } else {
      alert('Please enter both name and email!');
    }
  });
});
