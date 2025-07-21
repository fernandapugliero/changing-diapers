document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.newsletter-form');
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        const email = form.querySelector('input[name="email"]').value;

        if (email) {
            // Aqui você pode enviar os dados para o seu backend ou para o Airtable
            console.log('Email enviado:', email); // Exemplo de ação, você pode fazer o que precisar aqui

            // Após o envio, limpar o campo de entrada
            form.querySelector('input[name="email"]').value = '';
            alert('Thank you for subscribing!');
        } else {
            alert('Please enter a valid email address!');
        }
    });
});
