(() => {
  "use strict";

  const config = window.CREST_SUPABASE_CONFIG || {};
  const configured = config.url && config.anonKey &&
    !config.url.includes("YOUR_SUPABASE") &&
    !config.anonKey.includes("YOUR_SUPABASE");

  if (!configured || !window.supabase) {
    console.warn("Crest booking system: add Supabase settings in supabase-config.js.");
    return;
  }

  const client = window.supabase.createClient(config.url, config.anonKey);
  window.crestSupabase = client;

  const form = document.querySelector("#trip-enquiry-form");
  if (!form) return;

  const dateInput = form.querySelector("#trip-date");
  if (dateInput) {
    const now = new Date();
    dateInput.min = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
  }

  const submit = form.querySelector('[type="submit"]');
  const note = form.querySelector(".form-note");
  const originalNote = note ? note.textContent : "";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const values = new FormData(form);
    const booking = {
      customer_name: String(values.get("name") || "").trim(),
      email: String(values.get("email") || "").trim() || null,
      destination: String(values.get("destination") || "").trim(),
      start_date: String(values.get("date") || "") || null,
      travellers: Number(values.get("travellers")),
      experience: String(values.get("style") || "").trim() || null,
      message: String(values.get("message") || "").trim() || null,
      status: "pending"
    };

    if (submit) {
      submit.disabled = true;
      submit.textContent = "Sending booking request…";
    }
    if (note) note.textContent = "Submitting securely…";

    const { error } = await client.from("bookings").insert(booking);

    if (submit) {
      submit.disabled = false;
      submit.innerHTML = 'Submit booking request <span aria-hidden="true">↗</span>';
    }

    if (error) {
      console.error("Booking submission failed:", error);
      if (note) note.textContent = "We could not submit your request. Please try again or contact us on WhatsApp.";
      return;
    }

    form.reset();
    if (note) note.textContent = "Your request has been received. It is pending confirmation; the team will contact you to confirm availability, permits and the final price. No payment has been taken.";
    form.querySelector("#traveller-count").value = "2";
  });
})();