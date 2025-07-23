// Definir variáveis de API do Airtable
const AIRTABLE_API_KEY = 'appjWF7WnC8DRWaXM';  // Substitua pelo seu token
const BASE_ID = 'patIvzlvp30wnC7VO';  // Substitua pelo seu Base ID
const TABLE_NAME = 'Newsletter';  // Nome da tabela no Airtable
const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

// Espera a página carregar
document.addEventListener('DOMContentLoaded', function() {
  const form = document.querySelector('.newsletter-form');
  const messageContainer = document.getElementById('message');  // Para mostrar a mensagem

  form.addEventListener('submit', function(event) {
    event.preventDefault();

    // Obtém os valores de nome e email
    const name = form.querySelector('input[name="name"]').value;
    const email = form.querySelector('input[name="email"]').value;

    if (name && email) {
      const data = {
        fields: {
          Name: name,
          Email: email
        }
      };

      // Envia os dados para o Airtable
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
        messageContainer.textContent = "Thank you for subscribing!";
        messageContainer.style.color = "green"; // Muda a cor da mensagem para verde
        form.reset(); // Limpa o formulário
        form.style.display = "none"; // Esconde o formulário após o envio
      })
      .catch(error => {
        messageContainer.textContent = "There was an error. Please try again.";
        messageContainer.style.color = "red"; // Muda a cor da mensagem para vermelho
        console.error("Error:", error);
      });
    } else {
      alert('Please enter both name and email!');
    }
  });
});
