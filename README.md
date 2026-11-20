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
