document.getElementById("newsletter-submit").addEventListener("click", async (e) => {
  e.preventDefault();
  const email = document.getElementById("newsletter-email").value.trim();
  const successMsg = document.getElementById("newsletter-success");

  if (!email) {
    alert("Please enter a valid email.");
    return;
  }

  try {
    const res = await fetch("https://api.airtable.com/v0/tblCkhBLqSlysvp5K/Newsletter", {
      method: "POST",
      headers: {
        "Authorization": "Bearer patIvzlvp30wnC7VO",
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
      successMsg.style.display = "block";
      document.getElementById("newsletter-email").value = "";
    } else {
      alert("Something went wrong. Please try again.");
    }
  } catch (err) {
    console.error("❌ Error submitting email:", err);
    alert("Could not subscribe. Please try again later.");
  }
});
