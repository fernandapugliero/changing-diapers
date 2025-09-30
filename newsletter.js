(function () {
  const BASE_ID = 'apppSigVLt8ICVUA5';
  const TABLE = 'Newsletter';
  const PAT = 'patIvzlvp30wnC7VO';

  const form = document.getElementById('nl-form');
  const nameEl = document.getElementById('nl-name');
  const emailEl = document.getElementById('nl-email');
  const statusEl = document.getElementById('nl-status');
  const submitBtn = document.getElementById('nl-submit');

  if (!form || !emailEl || !submitBtn || !statusEl) return;

  function setStatus(msg, ok = true) {
    statusEl.textContent = msg || '';
    statusEl.classList.remove('ok', 'err');
    statusEl.classList.add(ok ? 'ok' : 'err');
  }

  function validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');

    const name = (nameEl?.value || '').trim();
    const email = (emailEl?.value || '').trim();

    if (!email || !validateEmail(email)) {
      setStatus('Please enter a valid email.', false);
      emailEl.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAT}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            Name: name,
            Email: email,
            "Created at": new Date().toISOString()
          }
        })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Airtable error:', text);
        throw new Error('Airtable returned ' + res.status);
      }

      setStatus('🎉 You’re in! Thanks for subscribing.', true);
      form.reset();
    } catch (err) {
      console.error(err);
      setStatus('❌ Something went wrong. Please try again.', false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Subscribe';
    }
  });
})();
