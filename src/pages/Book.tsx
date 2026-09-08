import { CalendarDays, CheckCircle2, Clock3, LoaderCircle } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { siteConfig } from '../config/site'
import {
  AvailableSlot,
  formatNzTime,
  getAvailableSlots,
  nzDateString,
  submitBooking,
} from '../lib/beetitApi'
import { useSeo } from '../lib/seo'

export function Book() {
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

  async function handleDateChange(nextDate: string) {
    setDate(nextDate)
    setSlots([])
    setSelectedStartAt('')
    setError('')

    if (!nextDate) return

    try {
      setLoadingSlots(true)
      setSlots(await getAvailableSlots(nextDate))
    } catch {
      setError('We could not load the available times. Please try again.')
    } finally {
      setLoadingSlots(false)
    }
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
    } catch (bookingError) {
      const message = bookingError instanceof Error ? bookingError.message : 'We could not submit your booking.'
      setError(message.includes('taken') || message.includes('available') ? message : 'We could not submit your booking. Please check the details and try again.')

      if (date) getAvailableSlots(date).then(setSlots).catch(() => undefined)
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
            Consultations are 60 minutes. Choose a date to see Donna's live availability. Friday appointments are by arrangement through the contact page.
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

        <form className="form-card" onSubmit={handleSubmit}>
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

          <label>
            Preferred date
            <input
              name="preferredDate"
              type="date"
              min={nzDateString()}
              value={date}
              onChange={(event) => void handleDateChange(event.target.value)}
              required
            />
          </label>

          <fieldset className="slot-fieldset">
            <legend>Available times</legend>
            {!date && <p className="slot-help">Choose a date first.</p>}
            {loadingSlots && (
              <div className="slot-loading">
                <LoaderCircle className="spin" size={18} /> Loading available times
              </div>
            )}
            {date && !loadingSlots && slots.length === 0 && (
              <p className="slot-help">No online times are available for this date. Online bookings are Monday to Thursday.</p>
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
                    {formatNzTime(slot.start_at)}
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
