# Crest Tours and Safaris — Uganda

A responsive tourism website with a shared online booking database and an administrator dashboard.

## Website features
- Existing Uganda destination cards, search/filter, photographs and Crest branding.
- Customer trip request form connected to Supabase.
- Administrator sign-in, booking status management and summary counts.
- Tour package management (add, show/hide).
- Payment record viewing.

## Connect the live database

The code is prepared for Supabase, but real booking storage will not work until a Supabase project is connected and the SQL is applied.

1. Create a project at https://supabase.com/ and keep the database password private.
2. In Supabase, open **SQL Editor**, create a query, paste all of `supabase/schema.sql`, and run it.
3. Open **Project Settings → API** (or API Keys) and copy the Project URL and anon/publishable key.
4. Add those two public values to `supabase-config.js`, replacing the placeholders. Never put a service-role key or database password in browser code or GitHub.
5. In Supabase **Authentication → Users**, create the first administrator with a strong password. Disable public sign-ups in Auth settings.
6. Copy that user's UUID. In SQL Editor, run this after replacing the example UUID:
   ```sql
   insert into public.admin_users (user_id)
   values ('PASTE-ADMIN-USER-UUID-HERE');
   ```
7. Publish with GitHub Pages: **Settings → Pages → Deploy from a branch → main → /(root)**.

The admin area is at `/admin.html`. Only user IDs listed in `admin_users` can access it. Do not share administrator passwords.

## Customer email notifications

The admin dashboard can notify customers when a booking is marked **confirmed** or **cancelled**. Email delivery uses a Supabase Edge Function and Resend; no email-provider secret is placed in the public website.

1. Create a Resend account at https://resend.com/ and verify a domain you control. A sender address on an unverified domain will not work for normal customer delivery.
2. In Supabase, open **Edge Functions → Deploy a new function → Via Editor**. Name it `send-booking-status-email`, then copy the complete code from [the GitHub function file](https://github.com/markmbabazi26-lgtm/tourism_website/blob/main/supabase/functions/send-booking-status-email/index.ts) into the editor and deploy it. You can also deploy from the Supabase CLI.
3. Open **Edge Function Secrets** and add:
   - `RESEND_API_KEY` — your private Resend API key.
   - `EMAIL_FROM` — a sender address on your verified Resend domain, for example `Crest Tours <bookings@your-verified-domain.com>`.
   Supabase automatically provides project URL and key environment variables. The function supports both current publishable/secret keys and legacy anon/service-role variables.
4. In the function's settings, turn off the gateway's legacy **Verify JWT** check if it rejects the project's newer JWT format. The function itself validates the user's session and checks `public.admin_users` before sending any email. Do not make the function publicly trusted just because gateway verification is off.
5. In the admin dashboard, change a booking to **Confirmed** or **Cancelled**. The dashboard reports whether the email was sent. Pending status changes do not send an email.

Never paste the Resend API key or any Supabase secret key into GitHub or the browser.

Never put the Resend API key or Supabase service-role key in `admin.js`, `supabase-config.js`, HTML, or any public GitHub file. A status update remains saved even if email delivery fails; the dashboard will show a warning.

## Booking workflow and limitations
- Public visitors can submit booking requests. New requests are saved as **pending** and are visible to signed-in administrators.
- Staff can mark requests pending, confirmed or cancelled and add/hide tour packages.
- Payment records are stored in the database and shown in the dashboard. This first version does not yet include a payment-entry form or collect online/mobile-money payments.
- Submitting a request does not confirm a reservation or take payment. Staff must verify dates, park/permit availability, itinerary and final quotation directly.
- Before accepting public traffic, add CAPTCHA/spam protection, email notifications, database backups, and test policies with anonymous and admin accounts.

## Main files
- `index.html` — public website and trip planner.
- `booking-system.js` — saves trip requests to Supabase.
- `supabase-config.js` — public project URL and anon/publishable key placeholders.
- `admin.html`, `admin.js` — administrator dashboard.
- `supabase/schema.sql` — database tables, validation and row-level security.
- `photos/` — existing photographs and logo.


## Required booking form security setup

The public booking form now requires a customer phone/WhatsApp number and uses Cloudflare Turnstile. Public visitors no longer insert directly into the bookings table; submissions go through the `submit-booking` Supabase Edge Function, which verifies the Turnstile token before saving the request.

### 1. Apply the database update

1. Open your Supabase project and choose **SQL Editor**.
2. Open `supabase/schema.sql` in this repository, copy the full contents and run it.
3. Existing booking rows are kept. Their new `phone` field will remain empty until you collect a phone number from those customers. New submissions must include a valid phone number.
4. The public direct-insert policy is removed. Do not restore anonymous insert permission; the Edge Function uses the server-side key to save verified requests.

### 2. Set up Cloudflare Turnstile

1. Sign in at https://dash.cloudflare.com/ and open **Turnstile**.
2. Add a widget for your GitHub Pages hostname: `markmbabazi26-lgtm.github.io`.
3. Choose the managed widget type and save it.
4. Copy the **site key** into `index.html`, replacing `YOUR_CLOUDFLARE_TURNSTILE_SITE_KEY`.
5. In Supabase, open **Edge Functions → Secrets** and add `TURNSTILE_SECRET_KEY` with the Turnstile secret key. Do not put this secret in GitHub or the website.

### 3. Deploy the booking function

1. In Supabase, open **Edge Functions** and create a function named `submit-booking`.
2. Paste the source from `supabase/functions/submit-booking/index.ts`.
3. In the function's settings, turn **Verify JWT with legacy secret** OFF. This endpoint is intentionally public; it verifies every Turnstile token on the server before it can insert a booking. Do not expose the Turnstile secret or Supabase server key.
4. Deploy it. Supabase provides the project URL and server key to Edge Functions; the function reads those server-side.
5. Confirm the function is deployed before testing the public form.

The function verifies Turnstile, validates customer details and saves the request with status `pending`. If the function or Turnstile secrets are not configured, the form will show an error instead of accepting an unprotected request.

### 4. Test

- Submit a request with a phone number and a completed Turnstile check.
- Confirm the new row appears in `public.bookings` with its phone number.
- Confirm the phone number appears in the admin dashboard and its WhatsApp link opens.
- Try submitting without a phone number or without completing Turnstile; the request should not be saved.

The form's email field remains optional because the phone/WhatsApp number is now required.
