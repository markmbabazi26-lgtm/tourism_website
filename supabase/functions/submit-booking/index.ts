import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SECRET_KEY") || secretKeys.default || Object.values(secretKeys)[0];
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!supabaseUrl || !serviceKey || !turnstileSecret) return json({ error: "Booking security is not configured yet." }, 503);

    const body = await request.json();
    if (String(body.website || "").trim()) return json({ success: true });
    const token = String(body.turnstile_token || "");
    if (!token) return json({ error: "Please complete the security check." }, 400);

    const verification = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: request.headers.get("CF-Connecting-IP") || "" }),
    });
    const verificationResult = await verification.json();
    if (!verificationResult.success) return json({ error: "Security check failed. Please try again." }, 400);

    const name = String(body.customer_name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim() || null;
    const destination = String(body.destination || "").trim();
    const message = String(body.message || "").trim() || null;
    const travellers = Number(body.travellers);
    if (name.length < 2 || name.length > 80) return json({ error: "Please enter a valid name." }, 400);
    if (phone.length < 7 || phone.length > 24 || !/^[+0-9() .-]+$/.test(phone)) return json({ error: "Please enter a valid phone or WhatsApp number." }, 400);
    if (email && (email.length > 120 || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email))) return json({ error: "Please enter a valid email address." }, 400);
    if (destination.length < 2 || destination.length > 120) return json({ error: "Please choose a destination." }, 400);
    if (!Number.isInteger(travellers) || travellers < 1 || travellers > 30) return json({ error: "Please enter between 1 and 30 travellers." }, 400);
    if (message && message.length > 1200) return json({ error: "Your message is too long." }, 400);

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await adminClient.from("bookings").insert({
      customer_name: name, phone, email, destination,
      start_date: body.start_date || null, travellers,
      experience: String(body.experience || "").slice(0, 100) || null,
      message, status: "pending",
    }).select("id").single();
    if (error) {
      console.error("Booking insert failed:", error.message);
      return json({ error: "We could not save your request. Please try again or contact us on WhatsApp." }, 500);
    }
    return json({ success: true, booking_id: data.id });
  } catch (error) {
    console.error("Booking submission error:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Could not process your request." }, 500);
  }
});