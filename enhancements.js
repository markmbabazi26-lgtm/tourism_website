(() => {
  "use strict";

  const form = document.querySelector("#trip-enquiry-form");
  if (!form) return;

  const dateInput = form.querySelector("#trip-date");
  if (dateInput) {
    const now = new Date();
    const localToday = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
    dateInput.min = localToday;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const values = new FormData(form);
    const lines = [
      "Hello Crest Tours and Safaris, I'd like to enquire about a Uganda trip.",
      "",
      "Name: " + (values.get("name") || ""),
      "Email: " + (values.get("email") || "Not provided"),
      "Destination: " + (values.get("destination") || ""),
      "Preferred start date: " + (values.get("date") || "Flexible / not decided"),
      "Travellers: " + (values.get("travellers") || ""),
      "Experience: " + (values.get("style") || ""),
      "Additional details: " + (values.get("message") || "None")
    ];

    const whatsappUrl = "https://wa.me/256783809579?text=" + encodeURIComponent(lines.join("\n"));
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  });
})();
