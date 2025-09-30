document.getElementById('nl-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('nl-name').value;
  const email = document.getElementById('nl-email').value;

  const res = await fetch(`https://api.airtable.com/v0/apppSigVLt8ICVUA5/Newsletter`, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer patIvzlvp30wnC7VO',
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

  if (res.ok) {
    alert('🎉 Thank you for subscribing!');
    e.target.reset();
  } else {
    alert('❌ Something went wrong.');
    console.error(await res.text());
  }
});
