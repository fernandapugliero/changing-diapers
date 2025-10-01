document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("nl-form");
  const nameInput = document.getElementById("nl-name");
  const emailInput = document.getElementById("nl-email");
  const statusEl = document.getElementById("nl-status");

  // 🛠️ Configurações do Airtable
  const BASE_ID = "apppSigVLt8ICVUA5"; 
  const TABLE = "Newsletter";
  const PAT = "patQoqoniXW6vJqZU"; 

  if (!form || !nameInput || !emailInput || !statusEl) {
    console.error("❌ Newsletter form elements not found. Check IDs in HTML.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();

    if (!name || !email) {
      statusEl.textContent = "Please enter your name and email.";
      statusEl.style.color = "#d9534f";
      return;
    }

    statusEl.textContent = "Submitting...";
    statusEl.style.color = "#555";

    try {
      const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                Name: name,
                Email: email,
                "Created at": new Date().toISOString(),
              },
            },
          ],
        }),
      });

      console.log("📡 Airtable response status:", res.status);
      const data = await res.json();
      console.log("📡 Airtable response body:", data);

      if (res.status === 200 || res.status === 201) {
        statusEl.textContent = "✅ Thank you for subscribing!";
        statusEl.style.color = "#28a745";
        form.reset();
      } else if (res.status === 401) {
        statusEl.textContent = "❌ Authentication error. Check your API key and permissions.";
        statusEl.style.color = "#d9534f";
        console.error("Airtable error:", data);
      } else {
        statusEl.textContent = "⚠️ Something went wrong. Please try again later.";
        statusEl.style.color = "#d9534f";
        console.error("Airtable error:", data);
      }
    } catch (err) {
      console.error("❌ Network or script error:", err);
      statusEl.textContent = "⚠️ Network error. Please try again.";
      statusEl.style.color = "#d9534f";
    }
  });
});
