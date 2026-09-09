import { supabase } from './supabase'

export type AvailableSlot = {
  start_at: string
  end_at: string
}

type PublicPortalResponse = {
  slots?: AvailableSlot[]
  id?: string
  emailSent?: boolean
  error?: string
}

async function invokePublicPortal(body: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase.functions.invoke<PublicPortalResponse>('public-portal', { body })
  if (error) {
    let message = error.message || 'The request could not be completed.'
    const context = (error as { context?: Response }).context
    if (context) {
      try {
        const detail = await context.clone().json() as { error?: string }
        if (detail.error) message = detail.error
      } catch {
        // Keep the safe fallback message.
      }
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data ?? {}
}

export async function getAvailableSlots(date: string) {
  const data = await invokePublicPortal({ action: 'availability', date })
  return data.slots ?? []
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
  const data = await invokePublicPortal({ action: 'booking', booking: payload })
  if (!data.id) throw new Error('Booking could not be submitted')
  return { id: data.id, emailSent: data.emailSent === true }
}

export async function submitContact(payload: {
  name: string
  email: string
  phone?: string
  message: string
}) {
  const data = await invokePublicPortal({ action: 'contact', inquiry: payload })
  if (!data.id) throw new Error('Enquiry could not be submitted')
  return { id: data.id, emailSent: data.emailSent === true }
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
