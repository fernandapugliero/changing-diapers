document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.newsletter-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const email = form.querySelector('input[name="email"]').value;
        const name = form.querySelector('input[name="name"]').value; // Se você também tiver um campo de nome

        if (email && name) {
            // Enviar os dados para o Airtable
            const AIRTABLE_API_KEY = 'YpatIvzlvp30wnC7VO';  // Substitua por seu token de acesso
            const BASE_ID = 'appjWF7WnC8DRWaXM';  // Já está correto, esse é o seu ID da base
            const TABLE_NAME = 'Newsletter';  // Nome da sua tabela no Airtable
            const AIRTABLE_URL = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`;

            const data = {
                fields: {
                    Name: name,
                    Email: email
                }
            };

            // Enviar os dados para o Airtable
            fetch(AIRTABLE_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,  // Usando o Personal Access Token
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('message').textContent = "Thank you for subscribing!";
                form.reset(); // Limpa o formulário após a inscrição
            })
            .catch(error => {
                document.getElementById('message').textContent = "There was an error. Please try again.";
                console.error("Error:", error);
            });
        } else {
            alert('Please enter a valid name and email address!');
        }
    });
});
