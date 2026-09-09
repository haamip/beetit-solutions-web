import { supabase } from './supabase'

export type ClientMatch = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
}

export type ClientIssue = {
  id: string
  issue_number: number
  client_id: string
  title: string
  service_type: string | null
  status: 'open' | 'on_hold' | 'closed' | 'archived'
  summary: string | null
  opened_at: string
  closed_at: string | null
  created_at: string
}

export function normalisePhone(phone?: string | null) {
  return String(phone ?? '').replace(/\D+/g, '')
}

export function formatIssueNumber(issueNumber: number) {
  return `MAT-${String(issueNumber).padStart(6, '0')}`
}

export async function findMatchingClients(email?: string | null, phone?: string | null) {
  if (!supabase) return [] as ClientMatch[]

  const normalisedEmail = String(email ?? '').trim().toLowerCase()
  const normalisedPhone = normalisePhone(phone)
  const matches = new Map<string, ClientMatch>()

  if (normalisedEmail) {
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('email_normalized', normalisedEmail)
      .limit(5)
    if (error) throw error
    for (const item of data ?? []) matches.set(item.id, item as ClientMatch)
  }

  if (normalisedPhone) {
    const { data, error } = await supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .eq('phone_normalized', normalisedPhone)
      .limit(5)
    if (error) throw error
    for (const item of data ?? []) matches.set(item.id, item as ClientMatch)
  }

  return Array.from(matches.values())
}

export async function createClientIssue(args: {
  clientId: string
  serviceType?: string | null
  title?: string | null
  summary?: string | null
}) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data: sessionData } = await supabase.auth.getSession()
  const serviceType = args.serviceType?.trim() || null
  const title = args.title?.trim() || serviceType || 'General matter'

  const { data, error } = await supabase
    .from('client_issues')
    .insert({
      client_id: args.clientId,
      title,
      service_type: serviceType,
      summary: args.summary?.trim() || null,
      status: 'open',
      created_by: sessionData.session?.user.id ?? null,
    })
    .select('id, issue_number, client_id, title, service_type, status, summary, opened_at, closed_at, created_at')
    .single()

  if (error) throw error
  return data as ClientIssue
}

export async function getOpenIssueForService(clientId: string, serviceType?: string | null) {
  if (!supabase || !serviceType?.trim()) return null
  const { data, error } = await supabase
    .from('client_issues')
    .select('id, issue_number, client_id, title, service_type, status, summary, opened_at, closed_at, created_at')
    .eq('client_id', clientId)
    .eq('status', 'open')
    .eq('service_type', serviceType.trim())
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as ClientIssue | null
}
