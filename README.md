# Crest Tours and Safaris — Uganda

A responsive, single-page tourism website for showcasing Ugandan destinations and helping visitors contact the tour guide.

## Main features
- Destination cards for Murchison Falls, Queen Elizabeth, Bwindi, Rwenzori, Lake Mburo, Kibale, Lake Bunyonyi and Semuliki.
- Destination text search and category filters.
- Responsive mobile navigation.
- Existing photographs and Crest Tours and Safaris logo.
- Trip enquiry planner that prepares a WhatsApp message using the contact number already displayed on the site.
- FAQ section explaining indicative prices, multi-park trips, permits and enquiries.
- Social sharing metadata, accessible form labels and mobile-friendly layout.

## Files
- `index.html` — website structure, styling and destination information.
- `enhancements.js` — trip enquiry form behavior.
- `photos/` — existing logo and photographs.

## Trip enquiry form
The form does not store personal details on a server and does not make a booking. It validates the required fields in the browser and prepares a WhatsApp message for the visitor to review and send. A WhatsApp conversation or enquiry is not a confirmed reservation. Confirm itinerary, park fees, permit availability and final prices directly before payment.

## Editing destinations and prices
Edit the relevant destination card in `index.html`. Keep the displayed prices clearly described as indicative estimates unless they have been confirmed as current quotations. Check all image paths against the filenames in `photos/`.

## Publish with GitHub Pages
1. Open the repository's **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select the `main` branch and `/(root)` folder.
4. Save and wait for GitHub Pages to publish the site.

The website is static HTML/CSS/JavaScript. It does not include a server-side booking system, payment processing or administrator dashboard.
