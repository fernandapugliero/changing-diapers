document.getElementById("newsletter-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;

  try {
    const res = await fetch("https://api.airtable.com/v0/apppSigVLt8ICVUA5/Newsletter%20Subscribers", {
      method: "POST",
      headers: {
        "Authorization": "Bearer YOUR_AIRTABLE_PAT",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fields: {
          "Email": email,
          "Created At": new Date().toISOString()
        }
      })
    });

    if (res.ok) {
      document.getElementById("newsletter-success").style.display = "block";
      document.getElementById("newsletter-form").reset();
    } else {
      alert("Something went wrong. Please try again.");
    }
  } catch (err) {
    console.error("❌ Error submitting email:", err);
    alert("Could not subscribe. Please try again later.");
  }
});
