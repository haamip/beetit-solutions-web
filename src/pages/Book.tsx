import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { siteConfig } from '../config/site'
import {
  formatNzTime,
  getAvailableSlots,
  nzDateString,
  submitBooking,
} from '../lib/beetitApi'
import type { AvailableSlot } from '../lib/beetitApi'
import { useSeo } from '../lib/seo'

type DayStatus = 'free' | 'limited' | 'full' | 'closed' | 'loading'

function addDays(dateString: string, amount: number) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + amount, 12))
  return date.toISOString().slice(0, 10)
}

function weekday(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
}

function isOnlineBookingDay(dateString: string) {
  const day = weekday(dateString)
  return day >= 1 && day <= 4
}

function formatCalendarDay(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return {
    weekday: new Intl.DateTimeFormat('en-NZ', { weekday: 'short', timeZone: 'UTC' }).format(date),
    day: new Intl.DateTimeFormat('en-NZ', { day: 'numeric', timeZone: 'UTC' }).format(date),
    month: new Intl.DateTimeFormat('en-NZ', { month: 'short', timeZone: 'UTC' }).format(date),
  }
}

function getDayStatus(dateString: string, slots: AvailableSlot[] | undefined): DayStatus {
  if (!isOnlineBookingDay(dateString)) return 'closed'
  if (slots === undefined) return 'loading'
  if (slots.length === 0) return 'full'
  if (slots.length <= 3) return 'limited'
  return 'free'
}

const statusLabel: Record<DayStatus, string> = {
  free: 'Free',
  limited: 'Limited',
  full: 'Full',
  closed: 'Closed',
  loading: 'Checking',
}

export function Book() {
  const today = nzDateString()
  const [windowStart, setWindowStart] = useState(today)
  const [availability, setAvailability] = useState<Record<string, AvailableSlot[]>>({})
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  const [selectedStartAt, setSelectedStartAt] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useSeo({
    title: 'Book a Consultation',
    description: 'Book a 60 minute consultation with Donna Pokere Phillips for legal advocacy and advisory support.',
    path: '/book',
  })

  const calendarDates = useMemo(
    () => Array.from({ length: 14 }, (_, index) => addDays(windowStart, index)),
    [windowStart],
  )

  const rangeLabel = useMemo(() => {
    const first = formatCalendarDay(calendarDates[0])
    const last = formatCalendarDay(calendarDates[calendarDates.length - 1])
    return `${first.day} ${first.month} to ${last.day} ${last.month}`
  }, [calendarDates])

  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      const openDates = calendarDates.filter(isOnlineBookingDay)

      Promise.all(
        openDates.map(async (calendarDate) => {
          try {
            return [calendarDate, await getAvailableSlots(calendarDate)] as const
          } catch {
            return [calendarDate, []] as const
          }
        }),
      ).then((entries) => {
        if (!cancelled) setAvailability((current) => ({ ...current, ...Object.fromEntries(entries) }))
      })
    })

    return () => {
      cancelled = true
    }
  }, [calendarDates])

  async function handleDateChange(nextDate: string) {
    setDate(nextDate)
    setSlots([])
    setSelectedStartAt('')
    setError('')

    if (!nextDate) return

    const cached = availability[nextDate]
    if (cached !== undefined) {
      setSlots(cached)
      return
    }

    try {
      setLoadingSlots(true)
      const nextSlots = await getAvailableSlots(nextDate)
      setSlots(nextSlots)
      setAvailability((current) => ({ ...current, [nextDate]: nextSlots }))
    } catch {
      setError('We could not load the available times. Please try again.')
    } finally {
      setLoadingSlots(false)
    }
  }

  function goBackOneWeek() {
    const previous = addDays(windowStart, -7)
    setWindowStart(previous < today ? today : previous)
  }

  function goForwardOneWeek() {
    setWindowStart(addDays(windowStart, 7))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedStartAt) {
      setError('Please choose an available consultation time.')
      return
    }

    const form = event.currentTarget
    const data = new FormData(form)

    try {
      setSubmitting(true)
      await submitBooking({
        fullName: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        phone: String(data.get('phone') ?? ''),
        service: String(data.get('service') ?? ''),
        consultationType: String(data.get('consultationType') ?? 'Phone') as 'Phone' | 'Video' | 'In Person',
        startAt: selectedStartAt,
        importantDate: String(data.get('importantDate') ?? ''),
        message: String(data.get('message') ?? ''),
        privacyConsent: data.get('privacyConsent') === 'on',
      })

      setSuccess('Your consultation request has been received. Donna will be notified and the selected time is now held for you.')
      form.reset()
      setDate('')
      setSlots([])
      setSelectedStartAt('')
      setAvailability((current) => {
        const copy = { ...current }
        delete copy[date]
        return copy
      })
    } catch (bookingError) {
      const message = bookingError instanceof Error ? bookingError.message : 'We could not submit your booking.'
      setError(message.includes('taken') || message.includes('available') ? message : 'We could not submit your booking. Please check the details and try again.')

      if (date) {
        getAvailableSlots(date)
          .then((nextSlots) => {
            setSlots(nextSlots)
            setAvailability((current) => ({ ...current, [date]: nextSlots }))
          })
          .catch(() => undefined)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page-section">
      <div className="container booking-grid">
        <div className="booking-intro">
          <p className="eyebrow">Book a consultation</p>
          <h1>Choose a time that works for you.</h1>
          <p>
            Consultations are 60 minutes. The calendar shows Donna's live availability so people can see at a glance which days are free, limited, full or closed.
          </p>
          <div className="info-card">
            <CalendarDays size={22} />
            <div>
              <strong>{siteConfig.bookingHours}</strong>
              <span>Friday by arrangement</span>
            </div>
          </div>
          <div className="info-card">
            <Clock3 size={22} />
            <div>
              <strong>{siteConfig.bookingLength}</strong>
              <span>Phone, video or in person</span>
            </div>
          </div>
        </div>

        <form className="form-card booking-form-card" onSubmit={handleSubmit}>
          {success && (
            <div className="form-status success" role="status">
              <CheckCircle2 size={20} />
              <span>{success}</span>
            </div>
          )}
          {error && <div className="form-status error" role="alert">{error}</div>}

          <div className="field-grid two-column">
            <label>
              Full name
              <input name="name" autoComplete="name" required />
            </label>
            <label>
              Phone
              <input name="phone" type="tel" autoComplete="tel" required />
            </label>
          </div>

          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <label>
            Service
            <select name="service" defaultValue="" required>
              <option value="" disabled>Select a service</option>
              {siteConfig.services.map((service) => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </label>

          <label>
            Consultation type
            <select name="consultationType" defaultValue="Phone" required>
              <option>Phone</option>
              <option>Video</option>
              <option>In Person</option>
            </select>
          </label>

          <div className="availability-calendar">
            <div className="availability-calendar-header">
              <div>
                <span className="calendar-kicker">Live availability</span>
                <strong>{rangeLabel}</strong>
              </div>
              <div className="calendar-controls">
                <button
                  type="button"
                  aria-label="Previous week"
                  onClick={goBackOneWeek}
                  disabled={windowStart === today}
                >
                  <ChevronLeft size={18} />
                </button>
                <button type="button" aria-label="Next week" onClick={goForwardOneWeek}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="calendar-legend" aria-label="Availability legend">
              <span><i className="legend-dot free" /> Free</span>
              <span><i className="legend-dot limited" /> Limited</span>
              <span><i className="legend-dot full" /> Full</span>
              <span><i className="legend-dot closed" /> Closed</span>
            </div>

            <div className="availability-day-grid">
              {calendarDates.map((calendarDate) => {
                const display = formatCalendarDay(calendarDate)
                const daySlots = availability[calendarDate]
                const status = getDayStatus(calendarDate, daySlots)
                const disabled = status === 'closed' || status === 'full' || status === 'loading'
                const selected = date === calendarDate

                return (
                  <button
                    key={calendarDate}
                    className={`availability-day ${status}${selected ? ' selected' : ''}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => void handleDateChange(calendarDate)}
                  >
                    <span className="availability-weekday">{display.weekday}</span>
                    <strong>{display.day}</strong>
                    <span className="availability-month">{display.month}</span>
                    <span className={`availability-status ${status}`}>
                      {status === 'loading' ? <LoaderCircle className="spin" size={13} /> : null}
                      {statusLabel[status]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <input name="preferredDate" type="hidden" value={date} />

          <fieldset className="slot-fieldset">
            <legend>{date ? `Available times for ${formatCalendarDay(date).weekday} ${formatCalendarDay(date).day} ${formatCalendarDay(date).month}` : 'Available times'}</legend>
            {!date && <p className="slot-help">Choose a day marked Free or Limited above.</p>}
            {loadingSlots && (
              <div className="slot-loading">
                <LoaderCircle className="spin" size={18} /> Loading available times
              </div>
            )}
            {date && !loadingSlots && slots.length === 0 && (
              <p className="slot-help">That day is now fully booked. Choose another available day.</p>
            )}
            {slots.length > 0 && (
              <div className="slot-grid">
                {slots.map((slot) => (
                  <button
                    key={slot.start_at}
                    className={selectedStartAt === slot.start_at ? 'slot-button selected' : 'slot-button'}
                    type="button"
                    onClick={() => setSelectedStartAt(slot.start_at)}
                  >
                    <span>{formatNzTime(slot.start_at)}</span>
                    <small>Free</small>
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <label>
            Important date or deadline <span className="optional">Optional</span>
            <input name="importantDate" type="date" />
          </label>

          <label>
            Short message
            <textarea name="message" rows={5} />
          </label>

          <label className="checkbox-field">
            <input name="privacyConsent" type="checkbox" required />
            <span>I consent to Beet It Solutions using this information to respond to my booking request.</span>
          </label>

          <button className="button primary full-width" type="submit" disabled={submitting || !selectedStartAt}>
            {submitting ? 'Sending booking…' : 'Request consultation'}
          </button>
        </form>
      </div>
    </section>
  )
}
