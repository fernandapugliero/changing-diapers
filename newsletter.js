const AIRTABLE_API_KEY = 'patIvzlvp30wnC7VO';  // Substitua com seu token
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
        document.getElementById('message').style.color = "green"; // Muda a cor para verde
        form.reset(); // Limpa o formulário
        form.style.display = "none"; // Oculta o formulário após o envio
      })
      .catch(error => {
        document.getElementById('message').textContent = "There was an error. Please try again.";
        document.getElementById('message').style.color = "red"; // Muda a cor para vermelho
        console.error("Error:", error);
      });
    } else {
      alert('Please enter both name and email!');
    }
  });
});
