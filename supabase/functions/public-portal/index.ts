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
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatNzDateTime = (iso: string) => new Intl.DateTimeFormat("en-NZ", {
  timeZone: "Pacific/Auckland",
  dateStyle: "full",
  timeStyle: "short",
}).format(new Date(iso));

async function sendEmail(apiKey: string | undefined, payload: Record<string, unknown>) {
  if (!apiKey) return { ok: false, reason: "email_not_configured" };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Resend failed", response.status, detail);
    return { ok: false, reason: "email_failed" };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration error" }, 500);

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("BEETIT_EMAIL_FROM") || "Beet It Solutions <beetit@haktindustries.co.nz>";
  const donnaEmail = Deno.env.get("BEETIT_EMAIL_REPLY_TO") || "beetit.solutions@gmail.com";

  try {
    const payload = await req.json();
    const action = String(payload?.action ?? "");

    if (action === "availability") {
      const date = String(payload?.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "A valid date is required" }, 400);
      const { data, error } = await db.rpc("get_available_slots", { p_date: date });
      if (error) return json({ error: "Availability could not be loaded" }, 500);
      return json({ slots: data ?? [] });
    }

    if (action === "booking") {
      const booking = payload?.booking ?? {};
      const { data: bookingId, error: bookingError } = await db.rpc("submit_booking_request", {
        p_full_name: String(booking.fullName ?? ""),
        p_email: String(booking.email ?? ""),
        p_phone: String(booking.phone ?? ""),
        p_service: String(booking.service ?? ""),
        p_consultation_type: String(booking.consultationType ?? ""),
        p_start_at: String(booking.startAt ?? ""),
        p_important_date: booking.importantDate ? String(booking.importantDate) : null,
        p_message: booking.message ? String(booking.message) : null,
        p_privacy_consent: booking.privacyConsent === true,
      });
      if (bookingError || !bookingId) return json({ error: bookingError?.message || "Booking could not be submitted" }, 400);

      const { data: row } = await db.from("bookings")
        .select("id, full_name, email, phone, service, consultation_type, start_at, important_date, message")
        .eq("id", bookingId).single();
      if (!row) return json({ id: bookingId, emailSent: false });

      const when = formatNzDateTime(row.start_at);
      const firstName = escapeHtml(String(row.full_name).trim().split(/\s+/)[0] || "there");
      const clientHtml = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#252b24"><h2>Beet It Solutions</h2><p>Kia ora ${firstName},</p><p>We have received your consultation request and your selected time is being held while Donna reviews it.</p><p><strong>${escapeHtml(row.service)}</strong><br>${escapeHtml(when)}<br>${escapeHtml(row.consultation_type)}</p><p>Donna will contact you if anything else is needed.</p><p>Ngā mihi,<br>Beet It Solutions</p></body></html>`;
      const donnaHtml = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#252b24"><h2>New booking request</h2><p><strong>${escapeHtml(row.full_name)}</strong> has requested a consultation.</p><p><strong>Service:</strong> ${escapeHtml(row.service)}<br><strong>When:</strong> ${escapeHtml(when)}<br><strong>Type:</strong> ${escapeHtml(row.consultation_type)}<br><strong>Email:</strong> ${escapeHtml(row.email)}<br><strong>Phone:</strong> ${escapeHtml(row.phone)}</p>${row.important_date ? `<p><strong>Important date:</strong> ${escapeHtml(row.important_date)}</p>` : ""}${row.message ? `<p><strong>Message:</strong><br>${escapeHtml(row.message)}</p>` : ""}</body></html>`;

      const [clientSend, donnaSend] = await Promise.all([
        sendEmail(resendApiKey, { from, to: [row.email], reply_to: donnaEmail, subject: "We received your consultation request – Beet It Solutions", html: clientHtml }),
        sendEmail(resendApiKey, { from, to: [donnaEmail], reply_to: row.email, subject: `New booking request – ${row.full_name}`, html: donnaHtml }),
      ]);
      return json({ id: bookingId, emailSent: clientSend.ok && donnaSend.ok });
    }

    if (action === "contact") {
      const inquiry = payload?.inquiry ?? {};
      const { data: inquiryId, error: inquiryError } = await db.rpc("submit_contact_inquiry", {
        p_name: String(inquiry.name ?? ""),
        p_email: String(inquiry.email ?? ""),
        p_phone: inquiry.phone ? String(inquiry.phone) : null,
        p_message: inquiry.message ? String(inquiry.message) : null,
      });
      if (inquiryError || !inquiryId) return json({ error: inquiryError?.message || "Enquiry could not be sent" }, 400);

      const { data: row } = await db.from("contact_inquiries")
        .select("id, name, email, phone, message").eq("id", inquiryId).single();
      if (!row) return json({ id: inquiryId, emailSent: false });

      const firstName = escapeHtml(String(row.name).trim().split(/\s+/)[0] || "there");
      const clientHtml = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#252b24"><h2>Beet It Solutions</h2><p>Kia ora ${firstName},</p><p>Thanks for getting in touch. Your enquiry has been received and Donna has been notified.</p><p>She will come back to you about the best next step.</p><p>Ngā mihi,<br>Beet It Solutions</p></body></html>`;
      const donnaHtml = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#252b24"><h2>New website enquiry</h2><p><strong>${escapeHtml(row.name)}</strong> has sent a message.</p><p><strong>Email:</strong> ${escapeHtml(row.email)}${row.phone ? `<br><strong>Phone:</strong> ${escapeHtml(row.phone)}` : ""}</p><p><strong>Message:</strong><br>${escapeHtml(row.message)}</p></body></html>`;
      const [clientSend, donnaSend] = await Promise.all([
        sendEmail(resendApiKey, { from, to: [row.email], reply_to: donnaEmail, subject: "We received your enquiry – Beet It Solutions", html: clientHtml }),
        sendEmail(resendApiKey, { from, to: [donnaEmail], reply_to: row.email, subject: `New website enquiry – ${row.name}`, html: donnaHtml }),
      ]);
      return json({ id: inquiryId, emailSent: clientSend.ok && donnaSend.ok });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: "The request could not be processed" }, 500);
  }
});
