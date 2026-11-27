import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ||
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || publishableKeys.default ||
      Object.values(publishableKeys)[0];
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SECRET_KEY") ||
      Deno.env.get("CREST_SUPABASE_SECRET_KEY") || secretKeys.default ||
      Object.values(secretKeys)[0];
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendKey || !emailFrom) {
      return json({ error: "Email service is not configured. Ask the site administrator to finish setup." }, 503);
    }

    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign-in required." }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Your admin session is invalid. Sign in again." }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: admin, error: adminError } = await adminClient
      .from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
    if (adminError) {
      console.error("Admin lookup failed:", adminError.message);
      return json({ error: "Administrator lookup failed. Check the function database credentials." }, 500);
    }
    if (!admin) return json({ error: "Administrator access required." }, 403);

    const body = await request.json();
    const bookingId = String(body.booking_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return json({ error: "A valid booking ID is required." }, 400);

    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select("id, customer_name, email, destination, start_date, travellers, status")
      .eq("id", bookingId).maybeSingle();
    if (bookingError || !booking) return json({ error: "Booking not found." }, 404);
    if (!["confirmed", "cancelled"].includes(booking.status)) {
      return json({ skipped: true, reason: "No email is sent for pending bookings." });
    }
    if (!booking.email || !booking.email.trim()) {
      return json({ skipped: true, reason: "This booking has no customer email address." });
    }

    const confirmed = booking.status === "confirmed";
    const statusText = confirmed ? "confirmed" : "cancelled";
    const subject = confirmed ? "Your Crest Tours trip request is confirmed" : "An update about your Crest Tours trip request";
    const intro = confirmed
      ? "Good news! Your trip request has been confirmed by our team. Please contact us if you need to discuss the itinerary or final arrangements."
      : "Our team has updated your trip request to cancelled. Please contact us if you believe this was a mistake or would like to discuss another date.";

    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#20352c;line-height:1.6">
      <div style="max-width:600px;margin:24px auto;padding:28px;border:1px solid #e1e8df;border-radius:10px">
      <h2 style="color:#183c32">Crest Tours and Safaris</h2>
      <p>Hello ${escapeHtml(booking.customer_name)},</p><p>${intro}</p>
      <h3>Trip details</h3><p><strong>Destination:</strong> ${escapeHtml(booking.destination)}<br>
      <strong>Travel date:</strong> ${escapeHtml(booking.start_date || "To be agreed")}<br>
      <strong>Travellers:</strong> ${escapeHtml(booking.travellers)}<br>
      <strong>Status:</strong> ${escapeHtml(statusText)}</p>
      <p>For assistance, contact us on WhatsApp at <a href="https://wa.me/256700900395">+256 700 900 395</a>
      or reply to this email.</p><p>Thank you,<br><strong>Crest Tours and Safaris</strong></p>
      </div></body></html>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: emailFrom,
        to: [booking.email],
        subject,
        html,
      }),
    });
    const emailResult = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok) {
      console.error("Resend rejected a booking status email:", emailResponse.status);
      return json({ error: "The booking was updated, but the email could not be sent. Check the email provider settings." }, 502);
    }

    return json({ success: true, email_id: emailResult.id || null });
  } catch (error) {
    console.error("Booking status email error:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Could not process the email notification." }, 500);
  }
});
