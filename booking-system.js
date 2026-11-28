(() => {
  "use strict";

  const config = window.CREST_SUPABASE_CONFIG || {};
  const configured = config.url && config.anonKey &&
    !config.url.includes("YOUR_SUPABASE") &&
    !config.anonKey.includes("YOUR_SUPABASE");

  const form = document.querySelector("#trip-enquiry-form");
  if (!form) return;

  const status = form.querySelector("#form-status");
  const setStatus = (message, type = "success") => {
    if (!status) return;
    status.hidden = false;
    status.classList.toggle("error", type === "error");
    status.textContent = message;
  };

  if (!configured || !window.supabase) {
    console.warn("Crest booking system: add Supabase settings in supabase-config.js.");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      setStatus("Online booking is being connected. Please contact Crest Tours and Safaris on WhatsApp for now.", "error");
    });
    return;
  }

  const client = window.supabase.createClient(config.url, config.anonKey);
  window.crestSupabase = client;

  const dateInput = form.querySelector("#trip-date");
  if (dateInput) {
    const now = new Date();
    dateInput.min = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  }

  const submit = form.querySelector('[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const values = new FormData(form);
    if (String(values.get("website") || "").trim()) {
      form.reset();
      setStatus("Thank you. Your request has been received.");
      return;
    }

    const token = form.querySelector('[name="cf-turnstile-response"]')?.value || "";
    if (!token) {
      setStatus("Please complete the security check before submitting.", "error");
      return;
    }

    const booking = {
      customer_name: String(values.get("name") || "").trim(),
      phone: String(values.get("phone") || "").trim(),
      email: String(values.get("email") || "").trim() || null,
      destination: String(values.get("destination") || "").trim(),
      start_date: String(values.get("date") || "") || null,
      travellers: Number(values.get("travellers")),
      experience: String(values.get("style") || "").trim() || null,
      message: String(values.get("message") || "").trim() || null,
      website: String(values.get("website") || ""),
      turnstile_token: token
    };

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Sending booking request…";
    }
    setStatus("Checking your request securely…");

    try {
      const response = await fetch(config.url + "/functions/v1/submit-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.anonKey,
          "Authorization": "Bearer " + config.anonKey
        },
        body: JSON.stringify(booking)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your request could not be submitted.");

      form.reset();
      if (window.turnstile) window.turnstile.reset();
      setStatus("Your request has been received and is pending confirmation. No payment has been taken. The team will contact you to confirm availability, permits and final pricing.");

      const link = document.createElement("a");
      link.href = "https://wa.me/256700900395?text=" + encodeURIComponent("Hello Crest Tours and Safaris, I just submitted a trip request for " + booking.destination + ". Please contact me about the next steps.");
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Continue on WhatsApp";
      link.style.display = "inline-block";
      link.style.marginTop = "8px";
      status.appendChild(document.createTextNode(" "));
      status.appendChild(link);

      form.querySelector("#traveller-count").value = "2";
    } catch (error) {
      console.error("Booking submission failed:", error);
      setStatus(error.message || "We could not submit your request. Please try again or contact us on WhatsApp.", "error");
      if (window.turnstile) window.turnstile.reset();
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = 'Submit booking request <span aria-hidden="true">↗</span>';
      }
    }
  });
})();
