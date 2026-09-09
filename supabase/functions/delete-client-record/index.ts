import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = req.headers.get('Authorization')

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json({ error: 'Authorisation is unavailable.' }, 401)
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await authClient.auth.getUser()
  const user = userData.user
  if (userError || !user) return json({ error: 'Your admin session has expired.' }, 401)

  const { data: adminUser, error: adminError } = await adminClient
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (adminError || !adminUser) return json({ error: 'You are not authorised to delete client records.' }, 403)

  let body: { clientId?: string; clientName?: string; confirmation?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }

  const clientId = body.clientId?.trim()
  const clientName = body.clientName?.trim()
  if (!clientId || body.confirmation !== 'DELETE' || !clientName) {
    return json({ error: 'Both deletion confirmations are required.' }, 400)
  }

  const { data: client, error: clientError } = await adminClient
    .from('clients')
    .select('id, full_name')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError) return json({ error: 'The client record could not be checked.' }, 500)
  if (!client) return json({ error: 'Client record not found.' }, 404)
  if (client.full_name.trim() !== clientName) {
    return json({ error: 'The client name confirmation does not match.' }, 400)
  }

  const { data: documentRows, error: documentsError } = await adminClient
    .from('client_documents')
    .select('storage_path')
    .eq('client_id', clientId)

  if (documentsError) return json({ error: 'Client files could not be checked before deletion.' }, 500)

  const storagePaths = (documentRows ?? [])
    .map((row) => row.storage_path as string | null)
    .filter((path): path is string => Boolean(path))

  for (let index = 0; index < storagePaths.length; index += 100) {
    const batch = storagePaths.slice(index, index + 100)
    const { error: storageError } = await adminClient.storage.from('client-documents').remove(batch)
    if (storageError) {
      return json({ error: 'Secure client files could not all be removed. The client record was not deleted.' }, 500)
    }
  }

  const { error: deleteError } = await adminClient.from('clients').delete().eq('id', clientId)
  if (deleteError) {
    return json({ error: 'The files were removed, but the client database record still needs cleanup.' }, 500)
  }

  return json({ deleted: true, filesDeleted: storagePaths.length })
})
