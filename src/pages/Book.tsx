import { CalendarDays, Clock3 } from 'lucide-react'
import { siteConfig } from '../config/site'
import { useSeo } from '../lib/seo'

export function Book() {
  useSeo({
    title: 'Book a Consultation',
    description: 'Book a 60 minute consultation with Donna Pokere Phillips for legal advocacy and advisory support.',
    path: '/book',
  })

  return (
    <section className="page-section">
      <div className="container booking-grid">
        <div className="booking-intro">
          <p className="eyebrow">Book a consultation</p>
          <h1>Choose a time that works for you.</h1>
          <p>
            Consultations are 60 minutes. Complete the form and the live availability calendar will be connected during the booking build.
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

        <form className="form-card" onSubmit={(event) => event.preventDefault()}>
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

          <div className="field-grid two-column">
            <label>
              Preferred date
              <input name="preferredDate" type="date" required />
            </label>
            <label>
              Preferred time
              <input name="preferredTime" type="time" required />
            </label>
          </div>

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

          <button className="button primary full-width" type="submit" disabled>
            Live booking connection coming next
          </button>
        </form>
      </div>
    </section>
  )
}
