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

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeOrigin(value: unknown) {
  try {
    const parsed = new URL(String(value ?? ""));
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration error" }, 500);

  const authorization = req.headers.get("Authorization") ?? "";
  const jwt = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return json({ error: "Not signed in" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  const user = userData.user;
  if (userError || !user) return json({ error: "Invalid session" }, 401);

  const { data: adminRow, error: adminError } = await admin
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (adminError || !adminRow) return json({ error: "Admin access required" }, 403);

  try {
    const payload = await req.json();
    const clientId = String(payload?.clientId ?? "").trim();
    const origin = safeOrigin(payload?.origin);
    if (!clientId || !origin) return json({ error: "Client and website origin are required" }, 400);

    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("id, full_name, email")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError || !client) return json({ error: "Client not found" }, 404);
    if (!client.email) return json({ error: "This client does not have an email address" }, 400);

    const token = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const uploadUrl = `${origin}/client-id/${token}`;

    const { data: link, error: linkError } = await admin
      .from("client_upload_links")
      .insert({ client_id: client.id, token_hash: tokenHash, expires_at: expiresAt, created_by: user.id })
      .select("id")
      .single();

    if (linkError || !link) return json({ error: "Secure upload link could not be created" }, 500);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("BEETIT_EMAIL_FROM") || "Beet It Solutions <beetit@haktindustries.co.nz>";
    const replyTo = Deno.env.get("BEETIT_EMAIL_REPLY_TO") || "beetit.solutions@gmail.com";

    if (!resendApiKey) return json({ sent: false, reason: "email_not_configured", uploadUrl, email: client.email, expiresAt });

    const firstName = String(client.full_name || "there").trim().split(/\s+/)[0] || "there";
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#252b24;max-width:620px;margin:auto">
        <h2>Beet It Solutions</h2>
        <p>Kia ora ${firstName},</p>
        <p>We need a copy of your ID to confirm your details. Please use the secure button below to upload a clear photo or PDF of your identity document.</p>
        <p style="margin:28px 0"><a href="${uploadUrl}" style="display:inline-block;background:#3f4938;color:white;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700">Upload ID securely</a></p>
        <p>This private link can only be used once and expires in 7 days.</p>
        <p>If you were not expecting this request, please contact Beet It Solutions before uploading anything.</p>
        <p>Ngā mihi,<br>Beet It Solutions</p>
      </div>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [client.email], reply_to: replyTo, subject: "Secure ID upload – Beet It Solutions", html }),
    });

    if (!emailResponse.ok) return json({ sent: false, reason: "email_failed", uploadUrl, email: client.email, expiresAt });

    await admin.from("admin_notifications").insert({
      notification_type: "identity_link_sent",
      title: "ID upload link emailed",
      body: `Secure ID upload link sent to ${client.full_name} at ${client.email}.`,
    });

    return json({ sent: true, email: client.email, expiresAt });
  } catch {
    return json({ error: "The ID upload email could not be prepared" }, 500);
  }
});
