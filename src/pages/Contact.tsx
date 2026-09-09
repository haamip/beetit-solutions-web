import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { submitContact } from '../lib/beetitApi'
import { useSeo } from '../lib/seo'
import { useSiteSettings } from '../lib/siteSettings'

export function Contact() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const settings = useSiteSettings()

  useSeo({
    title: 'Contact',
    description: `Contact Donna Pokere Phillips Legal Advocacy & Advisory Services in ${settings.publicLocation}.`,
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
      const result = await submitContact({
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        phone: String(data.get('phone') ?? ''),
        message: String(data.get('message') ?? ''),
      })
      setSuccess(result.emailSent
        ? 'Thanks, your message has been received. Donna has been notified and a confirmation email has been sent to you.'
        : 'Thanks, your message has been received and Donna has been notified. The confirmation email could not be confirmed, but your enquiry is safely recorded.')
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
            <a href={`tel:${settings.publicPhone.replace(/\s/g, '')}`}><Phone size={20} /><span>{settings.publicPhone}</span></a>
            <a href={`mailto:${settings.publicEmail}`}><Mail size={20} /><span>{settings.publicEmail}</span></a>
            <div><MapPin size={20} /><span>{settings.publicLocation}</span></div>
          </div>
        </div>

        <form className="form-card" onSubmit={handleSubmit}>
          {success && (
            <div className="form-status success" role="status"><CheckCircle2 size={20} /><span>{success}</span></div>
          )}
          {error && <div className="form-status error" role="alert">{error}</div>}

          <label>Name<input name="name" autoComplete="name" required /></label>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Phone<input name="phone" type="tel" autoComplete="tel" /></label>
          <label>Message<textarea name="message" rows={7} required /></label>
          <button className="button primary full-width" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send message'}</button>
        </form>
      </div>
    </section>
  )
}
