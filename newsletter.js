<script>
(function(){
  const form    = document.getElementById('nl-form');
  const nameEl  = document.getElementById('nl-name');
  const emailEl = document.getElementById('nl-email');
  const btn     = document.getElementById('nl-submit');
  const okMsg   = document.getElementById('nl-success');
  const errMsg  = document.getElementById('nl-error');

  // 👉 Cole aqui a URL do seu "Incoming Webhook" da Automação do Airtable
  const WEBHOOK_URL = 'YOUR_AIRTABLE_AUTOMATION_WEBHOOK_URL';

  function show(el){ el.style.display = 'block'; }
  function hide(el){ el.style.display = 'none'; }

  function isValidEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());
  }

  async function postToAirtable(name, email){
    // Payload que sua Automação deve mapear para criar o record
    const body = JSON.stringify({ name, email });

    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });

    // A Automação costuma responder 200/202; trate qualquer 2xx como sucesso
    if (!res.ok) throw new Error('non-2xx');
    return true;
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hide(okMsg); hide(errMsg);

      const name  = (nameEl.value || '').trim();
      const email = (emailEl.value || '').trim();

      if (!isValidEmail(email)) {
        show(errMsg);
        errMsg.textContent = 'Please enter a valid email.';
        return;
      }

      btn.disabled = true;
      const oldLabel = btn.textContent;
      btn.textContent = 'Subscribing…';

      try {
        await postToAirtable(name, email);
        form.reset();
        show(okMsg);
      } catch (err) {
        console.error('Newsletter error:', err);
        show(errMsg);
        errMsg.textContent = 'Something went wrong. Please try again.';
      } finally {
        btn.disabled = false;
        btn.textContent = oldLabel;
      }
    });
  }
})();
</script>
