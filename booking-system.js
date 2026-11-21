(() => {
  "use strict";

  const config = window.CREST_SUPABASE_CONFIG || {};
  const configured = config.url && config.anonKey &&
    !config.url.includes("YOUR_SUPABASE") &&
    !config.anonKey.includes("YOUR_SUPABASE");

  const form = document.querySelector("#trip-enquiry-form");
  if (!form) return;

  if (!configured || !window.supabase) {
    console.warn("Crest booking system: add Supabase settings in supabase-config.js.");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const note = form.querySelector(".form-note");
      if (note) note.textContent = "Online booking is being connected. Please contact Crest Tours and Safaris on WhatsApp for now.";
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
  const note = form.querySelector(".form-note");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const values = new FormData(form);
    if (String(values.get("website") || "").trim()) {
      form.reset();
      if (note) note.textContent = "Thank you. Your request has been received.";
      return;
    }

    const token = form.querySelector('[name="cf-turnstile-response"]')?.value || "";
    if (!token) {
      if (note) note.textContent = "Please complete the security check before submitting.";
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
    if (note) note.textContent = "Checking your request securely…";

    let result;
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
      result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Your request could not be submitted.");
    } catch (error) {
      console.error("Booking submission failed:", error);
      if (note) note.textContent = error.message || "We could not submit your request. Please try again or contact us on WhatsApp.";
      if (window.turnstile) window.turnstile.reset();
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = 'Submit booking request <span aria-hidden="true">↗</span>';
      }
      return;
    }

    form.reset();
    if (window.turnstile) window.turnstile.reset();
    const phone = booking.phone.replace(/[^0-9]/g, "");
    const internationalPhone = phone.startsWith("0") ? "256" + phone.slice(1) : phone;
    const message = "Hello Crest Tours and Safaris, I just submitted a trip request for " + booking.destination + ". Please contact me about the next steps.";
    if (note) {
      note.textContent = "Your request has been received and is pending confirmation. You can also continue the conversation on WhatsApp.";
      const link = document.createElement("a");
      link.href = "https://wa.me/" + internationalPhone + "?text=" + encodeURIComponent(message);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Continue on WhatsApp";
      link.style.display = "inline-block";
      link.style.marginTop = "8px";
      note.appendChild(document.createTextNode(" "));
      note.appendChild(link);
    }
    form.querySelector("#traveller-count").value = "2";
    if (submit) {
      submit.disabled = false;
      submit.innerHTML = 'Submit booking request <span aria-hidden="true">↗</span>';
    }
  });
})();