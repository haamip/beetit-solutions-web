import { createClient } from '@supabase/supabase-js'

const projectRef = 'ikfxzhughwiqttujrxba'
const fallbackSupabaseUrl = `https://${projectRef}.supabase.co`
const fallbackPublishableKey = 'sb_publishable_8nsFX0N16d7Ar16HpbYfGg_d6axDde-'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL
const configuredKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

// Prevent a stale or incorrectly linked Vercel integration from sending this
// production site to another Supabase project.
const isExpectedProject = configuredUrl?.includes(`https://${projectRef}.supabase.co`) === true
const supabaseUrl = isExpectedProject ? configuredUrl : fallbackSupabaseUrl
const supabaseKey = isExpectedProject && configuredKey ? configuredKey : fallbackPublishableKey

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const isSupabaseConfigured = true
