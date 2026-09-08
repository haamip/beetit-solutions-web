import { supabase } from './supabase'

export type AvailableSlot = {
  start_at: string
  end_at: string
}

export async function getAvailableSlots(date: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.rpc('get_available_slots', { p_date: date })
  if (error) throw error
  return (data ?? []) as AvailableSlot[]
}

export async function submitBooking(payload: {
  fullName: string
  email: string
  phone: string
  service: string
  consultationType: 'Phone' | 'Video' | 'In Person'
  startAt: string
  importantDate?: string
  message?: string
  privacyConsent: boolean
}) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.rpc('submit_booking_request', {
    p_full_name: payload.fullName,
    p_email: payload.email,
    p_phone: payload.phone,
    p_service: payload.service,
    p_consultation_type: payload.consultationType,
    p_start_at: payload.startAt,
    p_important_date: payload.importantDate || null,
    p_message: payload.message || null,
    p_privacy_consent: payload.privacyConsent,
  })

  if (error) throw error
  return data as string
}

export async function submitContact(payload: {
  name: string
  email: string
  phone?: string
  message: string
}) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.rpc('submit_contact_inquiry', {
    p_name: payload.name,
    p_email: payload.email,
    p_phone: payload.phone || null,
    p_message: payload.message,
  })

  if (error) throw error
  return data as string
}

export function formatNzTime(iso: string) {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatNzDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function nzDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getTimeZoneOffset(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp))

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  )

  return asUtc - timestamp
}

export function nzLocalToIso(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, 0)
  const timeZone = 'Pacific/Auckland'
  const firstOffset = getTimeZoneOffset(wallClockUtc, timeZone)
  const firstCandidate = wallClockUtc - firstOffset
  const secondOffset = getTimeZoneOffset(firstCandidate, timeZone)
  return new Date(wallClockUtc - secondOffset).toISOString()
}
