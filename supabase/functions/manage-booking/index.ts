import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const escapeHtml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const nzDate = (iso: string) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date(iso));
const nzDateTime = (iso: string) => new Intl.DateTimeFormat("en-NZ", {
  timeZone: "Pacific/Auckland", dateStyle: "full", timeStyle: "short",
}).format(new Date(iso));

async function sendEmail(apiKey: string | undefined, payload: Record<string, unknown>) {
  if (!apiKey) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) console.error("Resend failed", response.status, await response.text().catch(() => ""));
  return response.ok;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration error" }, 500);

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authorization = req.headers.get("Authorization") ?? "";
  const jwt = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return json({ error: "Not signed in" }, 401);
  const { data: userData, error: userError } = await db.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: "Invalid session" }, 401);
  const { data: adminRow } = await db.from("admin_users").select("id").eq("id", userData.user.id).maybeSingle();
  if (!adminRow) return json({ error: "Admin access required" }, 403);

  try {
    const payload = await req.json();
    const bookingId = String(payload?.bookingId ?? "").trim();
    const action = String(payload?.action ?? "").trim();
    if (!bookingId || !["confirm", "cancel", "complete", "reschedule"].includes(action)) {
      return json({ error: "A valid booking action is required" }, 400);
    }

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id, full_name, email, phone, service, consultation_type, start_at, end_at, status")
      .eq("id", bookingId).maybeSingle();
    if (bookingError || !booking) return json({ error: "Booking not found" }, 404);

    let update: Record<string, unknown>;
    if (action === "reschedule") {
      const nextStartAt = String(payload?.startAt ?? "");
      if (!nextStartAt || Number.isNaN(new Date(nextStartAt).getTime())) return json({ error: "Choose a new booking time" }, 400);
      if (nextStartAt === booking.start_at) return json({ error: "Choose a different booking time" }, 400);
      const { data: slots, error: slotError } = await db.rpc("get_available_slots", { p_date: nzDate(nextStartAt) });
      if (slotError || !(slots ?? []).some((slot: { start_at: string }) => slot.start_at === nextStartAt)) {
        return json({ error: "That time is no longer available" }, 409);
      }
      update = {
        start_at: nextStartAt,
        end_at: new Date(new Date(nextStartAt).getTime() + 60 * 60 * 1000).toISOString(),
        status: "rescheduled",
      };
    } else {
      update = { status: action === "confirm" ? "confirmed" : action === "cancel" ? "cancelled" : "completed" };
    }

    const { data: updated, error: updateError } = await db.from("bookings").update(update).eq("id", bookingId)
      .select("id, full_name, email, phone, service, consultation_type, start_at, end_at, status").single();
    if (updateError || !updated) {
      const message = updateError?.message?.includes("bookings_no_overlap") ? "That time has just been taken" : "Booking could not be updated";
      return json({ error: message }, 409);
    }

    const from = Deno.env.get("BEETIT_EMAIL_FROM") || "Beet It Solutions <beetit@haktindustries.co.nz>";
    const donnaEmail = Deno.env.get("BEETIT_EMAIL_REPLY_TO") || "beetit.solutions@gmail.com";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = true;
    let title = "Booking updated";
    let body = `${updated.full_name}'s booking was updated.`;
    const firstName = escapeHtml(String(updated.full_name).split(/\s+/)[0]);

    if (action === "confirm") {
      title = "Booking confirmed";
      body = `${updated.full_name}'s booking was confirmed for ${nzDateTime(updated.start_at)}.`;
      emailSent = await sendEmail(resendApiKey, {
        from, to: [updated.email], reply_to: donnaEmail,
        subject: "Your consultation is confirmed – Beet It Solutions",
        html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#252b24"><h2>Booking confirmed</h2><p>Kia ora ${firstName},</p><p>Your consultation with Beet It Solutions is confirmed.</p><p><strong>${escapeHtml(updated.service)}</strong><br>${escapeHtml(nzDateTime(updated.start_at))}<br>${escapeHtml(updated.consultation_type)}</p><p>Ngā mihi,<br>Beet It Solutions</p></body></html>`,
      });
    } else if (action === "reschedule") {
      title = "Booking rescheduled";
      body = `${updated.full_name}'s booking was moved from ${nzDateTime(booking.start_at)} to ${nzDateTime(updated.start_at)}.`;
      emailSent = await sendEmail(resendApiKey, {
        from, to: [updated.email], reply_to: donnaEmail,
        subject: "Your consultation time has changed – Beet It Solutions",
        html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#252b24"><h2>Consultation rescheduled</h2><p>Kia ora ${firstName},</p><p>Your consultation time has been changed.</p><p><strong>New time:</strong> ${escapeHtml(nzDateTime(updated.start_at))}<br><strong>Service:</strong> ${escapeHtml(updated.service)}<br><strong>Type:</strong> ${escapeHtml(updated.consultation_type)}</p><p>If this time does not work, reply to this email and Donna can help.</p><p>Ngā mihi,<br>Beet It Solutions</p></body></html>`,
      });
    } else if (action === "cancel") {
      title = "Booking cancelled";
      body = `${updated.full_name}'s booking for ${nzDateTime(booking.start_at)} was cancelled.`;
      emailSent = await sendEmail(resendApiKey, {
        from, to: [updated.email], reply_to: donnaEmail,
        subject: "Your consultation has been cancelled – Beet It Solutions",
        html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#252b24"><h2>Consultation cancelled</h2><p>Kia ora ${firstName},</p><p>Your consultation scheduled for ${escapeHtml(nzDateTime(booking.start_at))} has been cancelled.</p><p>If you need another time, reply to this email or make a new booking through the website.</p><p>Ngā mihi,<br>Beet It Solutions</p></body></html>`,
      });
    } else {
      title = "Booking completed";
      body = `${updated.full_name}'s booking was marked completed.`;
    }

    await db.from("admin_notifications").insert({ notification_type: "booking", title, body, booking_id: bookingId });
    return json({ booking: updated, emailSent });
  } catch (error) {
    console.error(error);
    return json({ error: "The booking could not be updated" }, 500);
  }
});
