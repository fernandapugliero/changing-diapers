
(() => {
  const BASE_ID = 'apppSigVLt8ICVUA5';      
  const TABLE   = 'Newsletter';             
  const PAT     = 'patQoqoniXW6vJqZU';  

  const form   = document.getElementById('nl-form');
  const nameEl = document.getElementById('nl-name');
  const mailEl = document.getElementById('nl-email');
  const btn    = document.getElementById('nl-submit');
  const status = document.getElementById('nl-status');

  if (!form || !nameEl || !mailEl || !btn || !status) {
    console.error('Newsletter form: elementos não encontrados (IDs errados?).');
    return;
  }

  const endpoint = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`;

  function setStatus(msg, ok = true) {
    status.textContent = msg;
    status.style.color = ok ? '#2e7d32' : '#c62828';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');
    btn.disabled = true;

    const name  = nameEl.value.trim();
    const email = mailEl.value.trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setStatus('Please enter a valid email.', false);
      btn.disabled = false;
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAT}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Name': name || '',
            'Email': email,
            'Created at': new Date().toISOString()
          }
        })
      });

      // 🔍 LOGS DEPOIS DA RESPOSTA
      console.log('Airtable response status:', res.status);
      const text = await res.text();
      let payload = null;
      try { payload = JSON.parse(text); } catch { /* deixa como string */ }
      console.log('Airtable response body:', payload || text);

      if (!res.ok) {
        // Mostra a mensagem real do Airtable na UI
        const msg = (payload && payload.error && payload.error.message) 
          ? payload.error.message 
          : `HTTP ${res.status}`;
        setStatus(`Something went wrong: ${msg}`, false);

        // Dicas específicas p/ 401
        if (res.status === 401) {
          console.warn('DICA: 401 costuma ser PAT inválido, sem acesso à base, ou sem Allowed origins.');
          console.warn('Verifique: scopes (read/write), base selecionada, Allowed origins e se o BASE_ID é da base Newsletter.');
        }

        btn.disabled = false;
        return;
      }

      setStatus('You’re in! Thanks for subscribing 💌');
      form.reset();
    } catch (err) {
      console.error('Fetch error:', err);
      setStatus('Network error. Please try again.', false);
    } finally {
      btn.disabled = false;
    }
  });
})();
