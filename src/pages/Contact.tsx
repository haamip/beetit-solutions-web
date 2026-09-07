import { Mail, MapPin, Phone } from 'lucide-react'
import { siteConfig } from '../config/site'
import { useSeo } from '../lib/seo'

export function Contact() {
  useSeo({
    title: 'Contact',
    description: 'Contact Donna Pokere Phillips Legal Advocacy & Advisory Services in Tuakau, Waikato and South Auckland.',
    path: '/contact',
  })

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

        <form className="form-card" onSubmit={(event) => event.preventDefault()}>
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
          <button className="button primary full-width" type="submit" disabled>
            Contact connection coming next
          </button>
        </form>
      </div>
    </section>
  )
}
