import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { siteConfig } from '../config/site'
import { submitContact } from '../lib/beetitApi'
import { useSeo } from '../lib/seo'

export function Contact() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useSeo({
    title: 'Contact',
    description: 'Contact Donna Pokere Phillips Legal Advocacy & Advisory Services in Tuakau, Waikato and South Auckland.',
    path: '/contact',
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const form = event.currentTarget
    const data = new FormData(form)

    try {
      setSubmitting(true)
      await submitContact({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        phone: String(data.get('phone') ?? ''),
        message: String(data.get('message') ?? ''),
      })
      setSuccess('Thanks, your message has been received. Donna will be notified.')
      form.reset()
    } catch {
      setError('We could not send your message. Please check the details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page-section">
      <div className="container contact-grid">
        <div>
          <p className="eyebrow">Contact</p>
          <h1>Get in touch.</h1>
          <p className="page-lead">Send a short message and Donna can come back to you about the best next step.</p>

          <div className="contact-details">
            <a href={`tel:${siteConfig.phone.replace(/\s/g, '')}`}>
              <Phone size={20} />
              <span>{siteConfig.phone}</span>
            </a>
            <a href={`mailto:${siteConfig.email}`}>
              <Mail size={20} />
              <span>{siteConfig.email}</span>
            </a>
            <div>
              <MapPin size={20} />
              <span>{siteConfig.location}</span>
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

          <label>
            Name
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" autoComplete="tel" />
          </label>
          <label>
            Message
            <textarea name="message" rows={7} required />
          </label>
          <button className="button primary full-width" type="submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send message'}
          </button>
        </form>
      </div>
    </section>
  )
}
