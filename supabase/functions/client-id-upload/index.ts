import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Server configuration error" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = await req.json();
      const token = String(payload?.token ?? "").trim();
      if (!token || token.length < 20) return json({ valid: false }, 400);

      const tokenHash = await hashToken(token);
      const now = new Date().toISOString();
      const { data: link, error } = await admin
        .from("client_upload_links")
        .select("id, client_id, expires_at, used_at, clients(full_name)")
        .eq("token_hash", tokenHash)
        .is("used_at", null)
        .gt("expires_at", now)
        .maybeSingle();

      if (error || !link) return json({ valid: false }, 404);
      const clientRecord = Array.isArray(link.clients) ? link.clients[0] : link.clients;
      return json({ valid: true, clientName: clientRecord?.full_name ?? "Client" });
    }

    if (!contentType.includes("multipart/form-data")) return json({ error: "Expected an ID document upload" }, 400);

    const form = await req.formData();
    const token = String(form.get("token") ?? "").trim();
    const file = form.get("file");

    if (!token || token.length < 20 || !(file instanceof File)) {
      return json({ error: "A valid upload link and ID document are required" }, 400);
    }

    const allowedTypes = new Set([
      "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf",
    ]);
    if (!allowedTypes.has(file.type)) return json({ error: "Please upload a JPG, PNG, HEIC, WEBP or PDF document" }, 400);
    if (file.size > 10 * 1024 * 1024) return json({ error: "Please keep the ID document under 10 MB" }, 400);

    const tokenHash = await hashToken(token);
    const now = new Date().toISOString();
    const { data: link, error: linkError } = await admin
      .from("client_upload_links")
      .select("id, client_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .gt("expires_at", now)
      .maybeSingle();

    if (linkError || !link) return json({ error: "This upload link is invalid, expired or has already been used" }, 403);

    const claimedAt = new Date().toISOString();
    const { data: claimed, error: claimError } = await admin
      .from("client_upload_links")
      .update({ used_at: claimedAt })
      .eq("id", link.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) return json({ error: "This upload link has already been used" }, 409);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "identity-document";
    const storagePath = `${link.client_id}/identity/${crypto.randomUUID()}-${safeName}`;

    const { error: uploadError } = await admin.storage
      .from("client-documents")
      .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });

    if (uploadError) {
      await admin.from("client_upload_links").update({ used_at: null }).eq("id", link.id);
      return json({ error: "The ID document could not be uploaded. Please try again." }, 500);
    }

    const { error: recordError } = await admin.from("client_documents").insert({
      client_id: link.client_id,
      storage_path: storagePath,
      original_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: null,
      document_type: "identity",
      document_category: "identity",
    });

    if (recordError) {
      await admin.storage.from("client-documents").remove([storagePath]);
      await admin.from("client_upload_links").update({ used_at: null }).eq("id", link.id);
      return json({ error: "The ID document could not be recorded. Please try again." }, 500);
    }

    await admin.from("admin_notifications").insert({
      notification_type: "identity_document_received",
      title: "Identity document received",
      body: "A client uploaded an ID document for verification.",
    });

    return json({ success: true });
  } catch {
    return json({ error: "Something went wrong while processing the ID upload" }, 500);
  }
});
