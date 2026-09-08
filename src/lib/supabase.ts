import { createClient } from '@supabase/supabase-js'

const fallbackSupabaseUrl = 'https://ikfxzhughwiqttujrxba.supabase.co'
const fallbackPublishableKey = 'sb_publishable_8nsFX0N16d7Ar16HpbYfGg_d6axDde-'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  fallbackPublishableKey

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const isSupabaseConfigured = true
