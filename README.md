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

1. Create a Resend account at https://resend.com/ and verify a domain or sender address you control.
2. In Supabase, open **Edge Functions** and deploy the function at `supabase/functions/send-booking-status-email/index.ts` (or deploy it with the Supabase CLI).
3. Set these Edge Function secrets in Supabase **Project Settings → Edge Functions → Secrets**:
   - `RESEND_API_KEY` — your private Resend API key.
   - `EMAIL_FROM` — a sender address on the domain verified with Resend, for example `Crest Tours <bookings@your-verified-domain.com>`.
   - Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions; if deploying in a custom environment, set them as protected secrets.
4. Ensure the function requires a valid JWT. It checks the signed-in user against `public.admin_users` before it can send.
5. In the admin dashboard, change a booking to **Confirmed** or **Cancelled**. The dashboard reports whether the email was sent. Pending status changes do not send an email.

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
