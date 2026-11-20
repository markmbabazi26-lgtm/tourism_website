(() => {
  "use strict";
  const cfg = window.CREST_SUPABASE_CONFIG || {};
  const ready = cfg.url && cfg.anonKey && !cfg.url.includes("YOUR_SUPABASE") && !cfg.anonKey.includes("YOUR_SUPABASE") && window.supabase;
  const $ = (selector) => document.querySelector(selector);
  const loginPanel = $("#login-panel"), dashboard = $("#dashboard");
  if (!ready) {
    $("#login-message").textContent = "Setup required: add your Supabase Project URL and anon/publishable key in supabase-config.js.";
    $("#login-message").classList.remove("hidden");
    $("#login-button").disabled = true;
    return;
  }
  const db = window.supabase.createClient(cfg.url, cfg.anonKey);
  const message = (selector, text, error = false) => {
    const el = $(selector); el.textContent = text; el.classList.remove("hidden"); el.classList.toggle("error", error);
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = (value) => new Intl.NumberFormat("en-UG",{style:"currency",currency:"UGX",maximumFractionDigits:0}).format(value || 0);

  async function showSession() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) { loginPanel.classList.remove("hidden"); dashboard.classList.add("hidden"); return; }
    const { data: admin, error } = await db.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (error || !admin) {
      await db.auth.signOut();
      loginPanel.classList.remove("hidden"); dashboard.classList.add("hidden");
      message("#login-message", "This account is not authorised as a Crest administrator. Ask the project owner to grant admin access.", true);
      return;
    }
    loginPanel.classList.add("hidden"); dashboard.classList.remove("hidden");
    await Promise.all([loadBookings(), loadPackages(), loadPayments()]);
  }

  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("#login-button"); button.disabled = true; button.textContent = "Signing in…";
    const { error } = await db.auth.signInWithPassword({email:$("#admin-email").value.trim(),password:$("#admin-password").value});
    button.disabled = false; button.textContent = "Sign in";
    if (error) { message("#login-message", error.message, true); return; }
    await showSession();
  });
  $("#sign-out").addEventListener("click", async () => { await db.auth.signOut(); await showSession(); });
  $("#refresh-bookings").addEventListener("click", loadBookings);

  async function loadBookings() {
    const body = $("#booking-rows"); body.innerHTML = "<tr><td colspan='6'>Loading…</td></tr>";
    const { data, error } = await db.from("bookings").select("*").order("created_at",{ascending:false}).limit(250);
    if (error) { body.innerHTML = "<tr><td colspan='6'>Could not load requests.</td></tr>"; message("#booking-message",error.message,true); return; }
    const rows = data || [];
    $("#stat-total").textContent = rows.length;
    $("#stat-pending").textContent = rows.filter(x=>x.status==="pending").length;
    $("#stat-confirmed").textContent = rows.filter(x=>x.status==="confirmed").length;
    $("#stat-cancelled").textContent = rows.filter(x=>x.status==="cancelled").length;
    body.innerHTML = rows.length ? rows.map(b => `<tr><td><strong>${esc(b.customer_name)}</strong><br>${esc(b.email || "No email")}</td><td>${esc(b.destination)}<br><small>${esc(b.experience || "")}</small></td><td>${esc(b.start_date || "Flexible")}</td><td>${esc(b.travellers)}</td><td>${esc(b.message || "—")}</td><td><select data-booking-status="${esc(b.id)}"><option value="pending" ${b.status==="pending"?"selected":""}>Pending</option><option value="confirmed" ${b.status==="confirmed"?"selected":""}>Confirmed</option><option value="cancelled" ${b.status==="cancelled"?"selected":""}>Cancelled</option></select></td></tr>`).join("") : "<tr><td colspan='6'>No booking requests yet.</td></tr>";
    body.querySelectorAll("[data-booking-status]").forEach(select => select.addEventListener("change", async () => {
      const previousStatus = select.dataset.previousStatus || "";
      const { error: updateError } = await db.from("bookings").update({status:select.value}).eq("id",select.dataset.bookingStatus);
      if (updateError) { message("#booking-message",updateError.message,true); return; }
      const newStatus = select.value;
      select.dataset.previousStatus = newStatus;
      if (newStatus === "confirmed" || newStatus === "cancelled") {
        const { data: emailResult, error: emailError } = await db.functions.invoke("send-booking-status-email", {
          body: { booking_id: select.dataset.bookingStatus }
        });
        if (emailError || emailResult?.error) {
          message("#booking-message","Booking status saved, but the customer email was not sent. " + (emailResult?.error || emailError.message),true);
        } else if (emailResult?.skipped) {
          message("#booking-message","Booking status saved. No email sent: " + emailResult.reason);
        } else {
          message("#booking-message","Booking status saved and customer notification email sent.");
        }
      } else {
        message("#booking-message","Booking status updated.");
      }
      await loadBookings();
    }));
  }

  async function loadPackages() {
    const body=$("#package-rows");
    const {data,error}=await db.from("tour_packages").select("*").order("created_at",{ascending:false});
    if(error){body.innerHTML="<tr><td colspan='5'>Could not load packages.</td></tr>";message("#package-message",error.message,true);return;}
    body.innerHTML=(data||[]).length?(data||[]).map(p=>`<tr><td><strong>${esc(p.name)}</strong></td><td>${esc(p.description||"—")}</td><td>${money(p.price_amount)}</td><td>${p.is_active?"Active":"Hidden"}</td><td><button class="secondary" data-package-toggle="${esc(p.id)}" data-active="${p.is_active}">${p.is_active?"Hide":"Show"}</button></td></tr>`).join(""):"<tr><td colspan='5'>No packages added yet.</td></tr>";
    body.querySelectorAll("[data-package-toggle]").forEach(button=>button.addEventListener("click",async()=>{
      const {error:updateError}=await db.from("tour_packages").update({is_active:button.dataset.active!=="true"}).eq("id",button.dataset.packageToggle);
      if(updateError){message("#package-message",updateError.message,true);return;} await loadPackages();
    }));
  }

  $("#package-form").addEventListener("submit",async(event)=>{
    event.preventDefault();
    const {error}=await db.from("tour_packages").insert({name:$("#package-name").value.trim(),description:$("#package-description").value.trim()||null,price_amount:Number($("#package-price").value),currency:"UGX"});
    if(error){message("#package-message",error.message,true);return;}
    event.target.reset();message("#package-message","Tour package added.");await loadPackages();
  });

  async function loadPayments() {
    const body=$("#payment-rows");
    const {data,error}=await db.from("payments").select("id,booking_id,amount,currency,method,reference,paid_at").order("paid_at",{ascending:false}).limit(100);
    if(error){body.innerHTML="<tr><td colspan='5'>No payment records available.</td></tr>";return;}
    body.innerHTML=(data||[]).length?(data||[]).map(p=>`<tr><td>${esc(p.booking_id)}</td><td>${money(p.amount)}</td><td>${esc(p.method||"—")}</td><td>${esc(p.reference||"—")}</td><td>${esc(p.paid_at||"—")}</td></tr>`).join(""):"<tr><td colspan='5'>No payment records have been entered.</td></tr>";
  }
  db.auth.onAuthStateChange(() => { setTimeout(showSession,0); });
  showSession();
})();